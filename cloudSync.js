// cloudSync.js - 云端同步模块
// v2.0 Phase 2 - 单向同步到Firestore

console.log('☁️ 云端同步模块加载');

// 云端同步管理器
class CloudSync {
    constructor() {
        this.db = null;
        this.auth = null;
        this.isCloudSyncEnabled = false;
        this.syncQueue = [];
        this.syncing = false;
        this.currentUser = null;
        
        console.log('☁️ CloudSync 初始化');
    }

    // 初始化云端同步
    initialize(auth, db) {
        try {
            this.auth = auth;
            this.db = db;
            
            if (auth && db) {
                this.isCloudSyncEnabled = true;
                this.setupEventListeners();
                console.log('✅ 云端同步模块初始化完成');
            } else {
                console.log('⚠️ Firebase未配置，云端同步不可用');
            }
            
        } catch (error) {
            console.error('❌ 云端同步初始化失败:', error);
        }
    }

    // 检查是否启用
    isEnabled() {
        return this.isCloudSyncEnabled && this.currentUser;
    }

    // 设置当前用户
    setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            console.log('👤 设置云端同步用户:', user.email);
            // 用户登录后同步本地数据
            this.syncLocalDataToCloud();
        } else {
            console.log('👤 清理云端同步用户');
            this.currentUser = null;
        }
    }

    // 设置事件监听器
    setupEventListeners() {
        // 监听本地数据变更事件
        window.addEventListener('localDataChanged', (event) => {
            if (this.isEnabled()) {
                this.handleLocalDataChange(event.detail);
            }
        });

        // 监听用户登录同步事件
        window.addEventListener('userLoginSync', (event) => {
            if (this.isEnabled()) {
                this.handleUserLoginSync(event.detail);
            }
        });

        console.log('📡 云端同步事件监听器已设置');
    }

    // 处理本地数据变更
    async handleLocalDataChange(detail) {
        const { operation, data } = detail;
        
        try {
            console.log('📤 处理本地数据变更:', operation, data.id);
            
            switch (operation) {
                case 'add':
                    await this.syncPromptToCloud(data);
                    break;
                case 'update':
                    await this.syncPromptToCloud(data);
                    break;
                case 'delete':
                    await this.deletePromptFromCloud(data.id, data.userId);
                    break;
            }
        } catch (error) {
            console.error('❌ 处理本地数据变更失败:', error);
        }
    }

    // 处理用户登录同步
    async handleUserLoginSync(detail) {
        const { userId, promptCount } = detail;
        console.log('🔄 开始用户登录同步:', promptCount, '个Prompt');
        
        try {
            // Phase 3: 双向同步 - 先从云端拉取，再合并本地数据
            await this.syncCloudToLocal();
            await this.syncLocalDataToCloud();
        } catch (error) {
            console.error('❌ 用户登录同步失败:', error);
        }
    }

    // Phase 3: 从云端同步数据到本地
    async syncCloudToLocal() {
        if (!this.isEnabled()) {
            console.log('⚠️ 云端同步未启用，跳过云端数据拉取');
            return;
        }

        try {
            console.log('📥 开始从云端拉取数据...');
            const userId = this.currentUser.uid;
            
            // 从云端获取用户的所有Prompt
            const cloudPrompts = await this.getCloudPrompts(userId);
            console.log('📊 从云端获取到', cloudPrompts.length, '个Prompt');
            
            if (cloudPrompts.length > 0) {
                // 获取本地数据
                const localPrompts = await window.localStore.getAllPrompts();
                console.log('📊 本地现有', localPrompts.length, '个Prompt');
                
                // 智能合并数据
                const mergedPrompts = this.mergePrompts(localPrompts, cloudPrompts);
                console.log('🔀 合并后共', mergedPrompts.length, '个Prompt');
                
                // 更新本地存储
                await this.updateLocalStorage(mergedPrompts);
                
                console.log('✅ 云端数据同步到本地完成');
                
                // 触发UI更新
                window.dispatchEvent(new CustomEvent('cloudToLocalSyncCompleted', {
                    detail: { 
                        cloudCount: cloudPrompts.length, 
                        localCount: localPrompts.length,
                        mergedCount: mergedPrompts.length 
                    }
                }));
            }
            
        } catch (error) {
            console.error('❌ 从云端同步数据失败:', error);
            
            window.dispatchEvent(new CustomEvent('cloudToLocalSyncFailed', {
                detail: { error: error.message }
            }));
        }
    }

    // 从云端获取用户的所有Prompt
    async getCloudPrompts(userId) {
        try {
            const snapshot = await this.db.collection('users')
                .doc(userId)
                .collection('prompts')
                .get();
            
            const cloudPrompts = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                cloudPrompts.push({
                    id: data.id,
                    text: data.text,
                    tags: data.tags || [],
                    copyCount: data.copyCount || 0,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    userId: data.userId,
                    syncStatus: 'synced' // 从云端来的数据标记为已同步
                });
            });
            
            return cloudPrompts;
            
        } catch (error) {
            console.error('❌ 获取云端数据失败:', error);
            return [];
        }
    }

    // 智能合并本地和云端数据
    mergePrompts(localPrompts, cloudPrompts) {
        const mergedMap = new Map();
        
        // 先添加本地数据
        localPrompts.forEach(prompt => {
            mergedMap.set(prompt.id, {
                ...prompt,
                source: 'local'
            });
        });
        
        // 合并云端数据，以时间戳较新的为准
        cloudPrompts.forEach(cloudPrompt => {
            const existingPrompt = mergedMap.get(cloudPrompt.id);
            
            if (!existingPrompt) {
                // 本地没有这个Prompt，直接添加
                mergedMap.set(cloudPrompt.id, {
                    ...cloudPrompt,
                    source: 'cloud',
                    syncStatus: 'synced'
                });
                console.log('📥 从云端新增Prompt:', cloudPrompt.id);
            } else {
                // 本地已存在，比较时间戳
                const localTime = existingPrompt.updatedAt || existingPrompt.createdAt || 0;
                const cloudTime = cloudPrompt.updatedAt || cloudPrompt.createdAt || 0;
                
                if (cloudTime > localTime) {
                    // 云端更新，使用云端版本
                    mergedMap.set(cloudPrompt.id, {
                        ...cloudPrompt,
                        source: 'cloud-newer',
                        syncStatus: 'synced'
                    });
                    console.log('📥 使用云端较新版本:', cloudPrompt.id);
                } else {
                    // 本地更新或相同，保持本地版本但标记需要同步
                    mergedMap.set(cloudPrompt.id, {
                        ...existingPrompt,
                        source: 'local-newer',
                        syncStatus: 'pending',
                        userId: this.currentUser.uid // 确保有用户ID
                    });
                    console.log('📤 保持本地较新版本:', cloudPrompt.id);
                }
            }
        });
        
        return Array.from(mergedMap.values());
    }

    // 更新本地存储
    async updateLocalStorage(mergedPrompts) {
        try {
            // 直接更新本地存储的prompts数组
            window.localStore.prompts = mergedPrompts;
            await window.localStore.saveLocalData();
            
            // 更新全局prompts变量
            window.prompts = mergedPrompts;
            
            console.log('💾 本地存储已更新，共', mergedPrompts.length, '个Prompt');
            
        } catch (error) {
            console.error('❌ 更新本地存储失败:', error);
            throw error;
        }
    }

    // 同步单个Prompt到云端
    async syncPromptToCloud(prompt) {
        if (!this.isEnabled()) {
            console.log('⚠️ 云端同步未启用');
            return;
        }

        try {
            const userId = this.currentUser.uid;
            const promptRef = this.db.collection('users').doc(userId).collection('prompts').doc(prompt.id.toString());
            
            const cloudPrompt = {
                id: prompt.id,
                text: prompt.text,
                tags: prompt.tags,
                copyCount: prompt.copyCount,
                createdAt: prompt.createdAt,
                updatedAt: prompt.updatedAt,
                userId: userId
            };

            await promptRef.set(cloudPrompt, { merge: true });
            
            // 标记为已同步
            await window.localStore.markPromptSynced(prompt.id);
            
            console.log('✅ Prompt已同步到云端:', prompt.id);
            
        } catch (error) {
            console.error('❌ 同步Prompt到云端失败:', error);
            throw error;
        }
    }

    // 从云端删除Prompt
    async deletePromptFromCloud(promptId, userId) {
        if (!this.isEnabled()) {
            return;
        }

        try {
            const currentUserId = this.currentUser.uid;
            // 只删除属于当前用户的Prompt
            if (userId === currentUserId) {
                const promptRef = this.db.collection('users').doc(currentUserId).collection('prompts').doc(promptId.toString());
                await promptRef.delete();
                console.log('✅ 已从云端删除Prompt:', promptId);
            }
        } catch (error) {
            console.error('❌ 从云端删除Prompt失败:', error);
        }
    }

    // 同步所有本地数据到云端
    async syncLocalDataToCloud() {
        if (!this.isEnabled()) {
            console.log('⚠️ 云端同步未启用，跳过同步');
            return;
        }

        if (this.syncing) {
            console.log('⚠️ 同步进行中，跳过重复同步');
            return;
        }

        try {
            this.syncing = true;
            console.log('🔄 开始同步本地数据到云端...');

            const localPrompts = await window.localStore.getAllPrompts();
            const userId = this.currentUser.uid;
            
            // 更新本地数据的用户ID
            await window.localStore.updateUserIdForAllPrompts(userId);
            
            // 获取更新后的数据
            const updatedPrompts = await window.localStore.getAllPrompts();
            
            console.log('📊 准备同步', updatedPrompts.length, '个Prompt到云端');

            // 批量同步
            const batchPromises = [];
            const batchSize = 3; // 每批3个，便于测试
            
            for (let i = 0; i < updatedPrompts.length; i += batchSize) {
                const batch = updatedPrompts.slice(i, i + batchSize);
                const batchPromise = this.syncBatchToCloud(batch);
                batchPromises.push(batchPromise);
            }

            await Promise.all(batchPromises);
            
            // 更新最后同步时间
            await window.localStore.setLastSyncTime(Date.now());
            
            console.log('✅ 本地数据同步到云端完成');
            
            // 触发同步完成事件
            window.dispatchEvent(new CustomEvent('cloudSyncCompleted', {
                detail: { totalSynced: updatedPrompts.length }
            }));
            
        } catch (error) {
            console.error('❌ 同步本地数据到云端失败:', error);
            
            // 触发同步失败事件
            window.dispatchEvent(new CustomEvent('cloudSyncFailed', {
                detail: { error: error.message }
            }));
            
        } finally {
            this.syncing = false;
        }
    }

    // 批量同步到云端
    async syncBatchToCloud(prompts) {
        const userId = this.currentUser.uid;
        const batch = this.db.batch();
        
        for (const prompt of prompts) {
            const promptRef = this.db.collection('users').doc(userId).collection('prompts').doc(prompt.id.toString());
            
            const cloudPrompt = {
                id: prompt.id,
                text: prompt.text,
                tags: prompt.tags,
                copyCount: prompt.copyCount,
                createdAt: prompt.createdAt,
                updatedAt: prompt.updatedAt,
                userId: userId
            };
            
            batch.set(promptRef, cloudPrompt, { merge: true });
        }
        
        await batch.commit();
        
        // 标记批量为已同步
        for (const prompt of prompts) {
            await window.localStore.markPromptSynced(prompt.id);
        }
        
        console.log('✅ 批量同步完成:', prompts.length, '个Prompt');
    }

    // 获取同步状态
    async getSyncStatus() {
        try {
            const stats = await window.localStore.getStorageStats();
            
            return {
                isEnabled: this.isEnabled(),
                currentUser: this.currentUser ? this.currentUser.email : null,
                syncing: this.syncing,
                ...stats
            };
        } catch (error) {
            console.error('❌ 获取同步状态失败:', error);
            return null;
        }
    }

    // 强制完整同步
    async forceFullSync() {
        if (!this.isEnabled()) {
            throw new Error('云端同步未启用');
        }

        console.log('🔄 开始强制完整同步...');
        
        try {
            // 重置所有Prompt的同步状态
            const prompts = await window.localStore.getAllPrompts();
            for (const prompt of prompts) {
                prompt.syncStatus = 'pending';
            }
            await window.localStore.saveLocalData();
            
            // 执行完整同步
            await this.syncLocalDataToCloud();
            
            console.log('✅ 强制完整同步完成');
            
        } catch (error) {
            console.error('❌ 强制完整同步失败:', error);
            throw error;
        }
    }

    // 清理云端数据 (登出时)
    async clearUserCloudData() {
        try {
            if (this.currentUser) {
                console.log('🧹 清理用户云端数据');
                await window.localStore.clearUserIdForAllPrompts();
            }
        } catch (error) {
            console.error('❌ 清理云端数据失败:', error);
        }
    }

    // 检查网络状态
    checkNetworkStatus() {
        return navigator.onLine;
    }

    // 获取待同步数量
    async getPendingSyncCount() {
        try {
            const prompts = await window.localStore.getAllPrompts();
            return prompts.filter(p => p.syncStatus === 'pending').length;
        } catch (error) {
            console.error('❌ 获取待同步数量失败:', error);
            return 0;
        }
    }
}

// 创建全局实例
window.cloudSync = new CloudSync();

console.log('✅ 云端同步模块已加载'); 