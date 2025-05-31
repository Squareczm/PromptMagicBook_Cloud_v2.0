// localStore.js - 本地数据存储模块
// v2.0 本地优先的数据存储管理

console.log('🗄️ 本地存储模块加载');

// 存储键名常量
const STORAGE_KEYS = {
    PROMPTS: 'prompts',
    LAST_SYNC: 'lastSyncTime',
    VERSION: 'dataVersion'
};

// 数据版本管理
const DATA_VERSION = '2.0';

// 本地存储管理器
class LocalStore {
    constructor() {
        this.prompts = [];
        this.isInitialized = false;
        console.log('📦 LocalStore 初始化');
    }

    // 初始化本地存储
    async initialize() {
        try {
            console.log('🔄 正在初始化本地存储...');
            
            // 检查数据版本并升级
            await this.checkAndUpgradeData();
            
            // 加载本地数据
            await this.loadLocalData();
            
            this.isInitialized = true;
            console.log('✅ 本地存储初始化完成');
            
            return true;
        } catch (error) {
            console.error('❌ 本地存储初始化失败:', error);
            return false;
        }
    }

    // 检查并升级数据结构
    async checkAndUpgradeData() {
        try {
            const currentVersion = await this.getStorageItem(STORAGE_KEYS.VERSION);
            console.log('📋 检查数据版本:', currentVersion || '1.x', '-> ', DATA_VERSION);

            if (!currentVersion || currentVersion !== DATA_VERSION) {
                console.log('🔄 开始数据结构升级...');
                await this.upgradeDataStructure();
                await this.setStorageItem(STORAGE_KEYS.VERSION, DATA_VERSION);
                console.log('✅ 数据结构升级完成');
            }
        } catch (error) {
            console.error('❌ 数据升级失败:', error);
            throw error;
        }
    }

    // 升级数据结构 (v1.x -> v2.0)
    async upgradeDataStructure() {
        try {
            const existingPrompts = await this.getStorageItem(STORAGE_KEYS.PROMPTS) || [];
            const now = Date.now();
            
            console.log('📊 发现', existingPrompts.length, '个现有Prompt');

            // 为现有数据添加时间戳和新字段
            const upgradedPrompts = existingPrompts.map((prompt, index) => {
                const upgradedPrompt = {
                    ...prompt,
                    // 确保有基础字段
                    id: prompt.id || (index + 1),
                    text: prompt.text || '',
                    tags: Array.isArray(prompt.tags) ? prompt.tags : [],
                    copyCount: prompt.copyCount || 0,
                    // 新增字段
                    createdAt: prompt.createdAt || now - (index * 1000), // 为现有数据添加递减的时间戳
                    updatedAt: prompt.updatedAt || now - (index * 1000),
                    userId: null, // 未登录状态
                    syncStatus: 'local' // 标记为本地数据
                };
                
                return upgradedPrompt;
            });

            // 保存升级后的数据
            await this.setStorageItem(STORAGE_KEYS.PROMPTS, upgradedPrompts);
            console.log('✅ 已升级', upgradedPrompts.length, '个Prompt的数据结构');
            
        } catch (error) {
            console.error('❌ 数据结构升级失败:', error);
            throw error;
        }
    }

    // 加载本地数据
    async loadLocalData() {
        try {
            this.prompts = await this.getStorageItem(STORAGE_KEYS.PROMPTS) || [];
            console.log('📂 加载本地数据:', this.prompts.length, '个Prompt');
            return this.prompts;
        } catch (error) {
            console.error('❌ 加载本地数据失败:', error);
            this.prompts = [];
            return [];
        }
    }

    // 获取所有Prompts
    async getAllPrompts() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return [...this.prompts]; // 返回副本
    }

    // 添加新Prompt
    async addPrompt(promptData) {
        try {
            const now = Date.now();
            const newPrompt = {
                id: this.generateId(),
                text: promptData.text,
                tags: Array.isArray(promptData.tags) ? promptData.tags : [],
                copyCount: 0,
                createdAt: now,
                updatedAt: now,
                userId: promptData.userId || null,
                syncStatus: 'pending' // 等待同步到云端
            };

            this.prompts.unshift(newPrompt); // 添加到开头
            await this.saveLocalData();
            
            console.log('✅ 已添加新Prompt:', newPrompt.id);
            
            // 触发云端同步事件
            this.triggerSyncEvent('add', newPrompt);
            
            return newPrompt;
        } catch (error) {
            console.error('❌ 添加Prompt失败:', error);
            throw error;
        }
    }

    // 更新Prompt
    async updatePrompt(id, updateData) {
        try {
            const index = this.prompts.findIndex(p => p.id === id);
            if (index === -1) {
                throw new Error(`Prompt ${id} 不存在`);
            }

            const updatedPrompt = {
                ...this.prompts[index],
                ...updateData,
                updatedAt: Date.now(),
                syncStatus: 'pending' // 标记为需要同步
            };

            this.prompts[index] = updatedPrompt;
            await this.saveLocalData();
            
            console.log('✅ 已更新Prompt:', id);
            
            // 触发云端同步事件
            this.triggerSyncEvent('update', updatedPrompt);
            
            return updatedPrompt;
        } catch (error) {
            console.error('❌ 更新Prompt失败:', error);
            throw error;
        }
    }

    // 删除Prompt
    async deletePrompt(id) {
        try {
            const index = this.prompts.findIndex(p => p.id === id);
            if (index === -1) {
                throw new Error(`Prompt ${id} 不存在`);
            }

            const deletedPrompt = this.prompts[index];
            this.prompts.splice(index, 1);
            await this.saveLocalData();
            
            console.log('✅ 已删除Prompt:', id);
            
            // 触发云端同步事件
            this.triggerSyncEvent('delete', { id, userId: deletedPrompt.userId });
            
            return deletedPrompt;
        } catch (error) {
            console.error('❌ 删除Prompt失败:', error);
            throw error;
        }
    }

    // 增加复制次数
    async incrementCopyCount(id) {
        try {
            const index = this.prompts.findIndex(p => p.id === id);
            if (index === -1) {
                throw new Error(`Prompt ${id} 不存在`);
            }

            this.prompts[index].copyCount += 1;
            this.prompts[index].updatedAt = Date.now();
            this.prompts[index].syncStatus = 'pending';

            await this.saveLocalData();
            
            console.log('✅ 已增加Prompt复制次数:', id, '次数:', this.prompts[index].copyCount);
            
            // 触发云端同步事件
            this.triggerSyncEvent('update', this.prompts[index]);
            
            return this.prompts[index];
        } catch (error) {
            console.error('❌ 增加复制次数失败:', error);
            throw error;
        }
    }

    // 保存本地数据
    async saveLocalData() {
        try {
            await this.setStorageItem(STORAGE_KEYS.PROMPTS, this.prompts);
            console.log('💾 本地数据已保存');
        } catch (error) {
            console.error('❌ 保存本地数据失败:', error);
            throw error;
        }
    }

    // 生成唯一ID
    generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    // 触发同步事件
    triggerSyncEvent(operation, data) {
        if (window.cloudSync && window.cloudSync.isEnabled()) {
            const event = new CustomEvent('localDataChanged', {
                detail: { operation, data, timestamp: Date.now() }
            });
            window.dispatchEvent(event);
            console.log('📡 触发同步事件:', operation, data.id);
        }
    }

    // Chrome Storage API 封装
    async getStorageItem(key) {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.get([key], (result) => {
                    resolve(result[key]);
                });
            } else {
                // 浏览器环境回退到localStorage
                try {
                    const value = localStorage.getItem(key);
                    resolve(value ? JSON.parse(value) : undefined);
                } catch (error) {
                    console.warn('localStorage 解析失败:', error);
                    resolve(undefined);
                }
            }
        });
    }

    async setStorageItem(key, value) {
        return new Promise((resolve, reject) => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.set({ [key]: value }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            } else {
                // 浏览器环境回退到localStorage
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }
        });
    }

    // 获取存储统计信息
    async getStorageStats() {
        try {
            const prompts = await this.getAllPrompts();
            const lastSync = await this.getStorageItem(STORAGE_KEYS.LAST_SYNC);
            
            return {
                totalPrompts: prompts.length,
                pendingSync: prompts.filter(p => p.syncStatus === 'pending').length,
                lastSyncTime: lastSync,
                dataVersion: DATA_VERSION
            };
        } catch (error) {
            console.error('❌ 获取存储统计失败:', error);
            return null;
        }
    }

    // 设置最后同步时间
    async setLastSyncTime(timestamp) {
        await this.setStorageItem(STORAGE_KEYS.LAST_SYNC, timestamp);
    }

    // 标记Prompt为已同步
    async markPromptSynced(id) {
        try {
            const index = this.prompts.findIndex(p => p.id === id);
            if (index !== -1) {
                this.prompts[index].syncStatus = 'synced';
                await this.saveLocalData();
                console.log('✅ Prompt已标记为同步:', id);
            }
        } catch (error) {
            console.error('❌ 标记同步状态失败:', error);
        }
    }

    // 批量更新用户ID (登录时使用)
    async updateUserIdForAllPrompts(userId) {
        try {
            let updateCount = 0;
            for (let prompt of this.prompts) {
                if (!prompt.userId) {
                    prompt.userId = userId;
                    prompt.syncStatus = 'pending';
                    updateCount++;
                }
            }
            
            if (updateCount > 0) {
                await this.saveLocalData();
                console.log('✅ 已为', updateCount, '个Prompt设置用户ID');
                
                // 触发批量同步
                const event = new CustomEvent('userLoginSync', {
                    detail: { userId, promptCount: updateCount }
                });
                window.dispatchEvent(event);
            }
        } catch (error) {
            console.error('❌ 更新用户ID失败:', error);
        }
    }

    // 清理用户ID (登出时使用)
    async clearUserIdForAllPrompts() {
        try {
            for (let prompt of this.prompts) {
                prompt.userId = null;
                prompt.syncStatus = 'local';
            }
            
            await this.saveLocalData();
            console.log('✅ 已清理所有Prompt的用户ID');
        } catch (error) {
            console.error('❌ 清理用户ID失败:', error);
        }
    }
}

// 创建全局实例
window.localStore = new LocalStore();

console.log('✅ 本地存储模块已加载'); 