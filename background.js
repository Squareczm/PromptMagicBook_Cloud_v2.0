// background.js - Service Worker for Prompt魔法书 v2.2
// Service Worker优化 - 持久化Firebase连接和认证管理

console.log('🔧 Service Worker starting...');

// 导入Firebase SDK
importScripts('firebase-app-compat.js');
importScripts('firebase-auth-compat.js');
importScripts('firebase-firestore-compat.js');

// 全局状态管理
let firebaseApp = null;
let auth = null;
let db = null;
let currentUser = null;
let isFirebaseConfigured = false;
let firestoreListener = null;

// 同步队列管理
const syncQueue = {
  pending: [],
  processing: false,
  lastSync: null
};

// Phase 3 优化: 同步状态追踪和管理
const syncTracker = {
  // 追踪操作类型
  operations: {
    ADD: 'add',
    UPDATE: 'update', 
    DELETE: 'delete'
  },
  
  // 添加操作到同步队列
  addToQueue(operation, data) {
    const syncItem = {
      id: generateId(),
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      status: 'pending'
    };
    
    syncQueue.pending.push(syncItem);
    console.log(`📝 Phase 3: Added ${operation} operation to sync queue:`, syncItem.id);
    
    return syncItem.id;
  },
  
  // 移除已完成的操作
  removeFromQueue(itemId) {
    const index = syncQueue.pending.findIndex(item => item.id === itemId);
    if (index !== -1) {
      const removed = syncQueue.pending.splice(index, 1)[0];
      console.log(`✅ Phase 3: Removed completed sync operation:`, removed.id);
      return removed;
    }
    return null;
  },
  
  // 获取待同步数量
  getPendingCount() {
    return syncQueue.pending.length;
  },
  
  // 获取待同步操作详情
  getPendingSummary() {
    const summary = {
      total: syncQueue.pending.length,
      add: 0,
      update: 0,
      delete: 0
    };
    
    syncQueue.pending.forEach(item => {
      summary[item.operation] = (summary[item.operation] || 0) + 1;
    });
    
    return summary;
  },
  
  // 清空同步队列
  clearQueue() {
    console.log(`🧹 Phase 3: Clearing sync queue (${syncQueue.pending.length} items)`);
    syncQueue.pending = [];
    syncQueue.processing = false;
  }
};

console.log('📦 Service Worker Firebase SDK loaded');

// Service Worker安装和激活
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  event.waitUntil(clients.claim());
  // 初始化Firebase
  initializeFirebase();
});

// 初始化Firebase配置
async function initializeFirebase() {
  try {
    console.log('🔥 Initializing Firebase in Service Worker...');
    
    // 获取Firebase配置
    const config = await loadFirebaseConfig();
    if (!config) {
      console.warn('⚠️ Firebase config not found, running in local mode');
      isFirebaseConfigured = false;
      await updateStoredAuthState(null);
      return;
    }

    // 初始化Firebase
    firebaseApp = firebase.initializeApp(config);
    auth = firebase.auth();
    db = firebase.firestore();
    isFirebaseConfigured = true;

    console.log('✅ Firebase initialized in Service Worker');

    // 设置认证状态监听
    setupAuthStateListener();
    
    // 恢复认证状态
    await restoreAuthState();

  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    isFirebaseConfigured = false;
    await updateStoredAuthState(null);
  }
}

// 加载Firebase配置
async function loadFirebaseConfig() {
  try {
    // 从chrome.storage.local获取配置（如果之前存储过）
    const storedConfig = await getStorageItem('firebaseConfig');
    if (storedConfig) {
      return storedConfig;
    }

    // 如果没有存储的配置，尝试解析firebase-config.js
    // 注意：Service Worker无法直接fetch文件，需要通过消息传递获取
    console.log('🔍 Requesting Firebase config from popup...');
    return null; // 将在popup打开时通过消息传递获取配置
    
  } catch (error) {
    console.error('❌ Failed to load Firebase config:', error);
    return null;
  }
}

// 设置认证状态监听器
function setupAuthStateListener() {
  if (!auth) return;

  console.log('👂 Setting up auth state listener in Service Worker');
  
  auth.onAuthStateChanged(async (user) => {
    console.log('🔐 Auth state changed in Service Worker:', user ? user.email : 'logged out');
    
    const previousUser = currentUser;
    currentUser = user;
    
    // 更新存储的认证状态
    await updateStoredAuthState(user);
    
    if (user && (!previousUser || previousUser.uid !== user.uid)) {
      // 用户登录或切换用户
      console.log('👤 User logged in:', user.email);
      await handleUserLogin(user);
    } else if (!user && previousUser) {
      // 用户登出
      console.log('👋 User logged out');
      await handleUserLogout();
    }
    
    // 通知所有popup页面认证状态变化
    notifyAuthStateChange(user);
  });
}

// 处理用户登录
async function handleUserLogin(user) {
  try {
    console.log('🔄 Handling user login in Service Worker...');
    
    // 设置Firestore监听器
    await setupFirestoreListener(user.uid);
    
    // 执行登录时的双向同步
    await performLoginSync(user);
    
    console.log('✅ User login handling completed');
    
  } catch (error) {
    console.error('❌ Error handling user login:', error);
  }
}

// 处理用户登出
async function handleUserLogout() {
  try {
    console.log('🔄 Handling user logout in Service Worker...');
    
    // 清理Firestore监听器
    if (firestoreListener) {
      firestoreListener();
      firestoreListener = null;
    }
    
    // 清理同步队列
    syncQueue.pending = [];
    syncQueue.processing = false;
    
    console.log('✅ User logout handling completed');
    
  } catch (error) {
    console.error('❌ Error handling user logout:', error);
  }
}

// Phase 2 优化: 设置Firestore监听器
async function setupFirestoreListener(userId) {
  try {
    console.log('📡 Phase 2: Setting up optimized Firestore listener for user:', userId);
    
    // 清理现有监听器
    if (firestoreListener) {
      console.log('🧹 Phase 2: Cleaning up existing Firestore listener');
      firestoreListener();
      firestoreListener = null;
    }
    
    // Phase 2 优化: 建立持久化监听器，包含错误重试机制
    const setupListener = () => {
      firestoreListener = db.collection('users')
        .doc(userId)
        .collection('prompts')
        .onSnapshot(
          (snapshot) => handleFirestoreDataChange(snapshot, userId),
          (error) => {
            console.error('❌ Phase 2: Firestore listener error:', error);
            
            // Phase 2 优化: 自动重连机制
            if (error.code === 'permission-denied') {
              console.error('❌ Phase 2: Permission denied, user may need to re-authenticate');
            } else if (error.code === 'unavailable') {
              console.log('🔄 Phase 2: Firestore unavailable, retrying in 5 seconds...');
              setTimeout(() => {
                if (currentUser && currentUser.uid === userId) {
                  console.log('🔄 Phase 2: Attempting to reconnect Firestore listener...');
                  setupListener();
                }
              }, 5000);
            }
          }
        );
    };
    
    setupListener();
    
    console.log('✅ Phase 2: Optimized Firestore listener established with auto-retry');
    
  } catch (error) {
    console.error('❌ Phase 2: Failed to setup Firestore listener:', error);
  }
}

// Phase 2 优化: 处理Firestore数据变更
async function handleFirestoreDataChange(snapshot, userId) {
  try {
    const startTime = performance.now();
    console.log('📥 Phase 2: Firestore data changed, processing...');
    
    // Phase 2 优化: 检查是否为初始加载或增量更新
    const isInitialLoad = !snapshot.metadata.hasPendingWrites && snapshot.metadata.fromCache;
    console.log('📊 Phase 2: Snapshot type:', isInitialLoad ? 'Initial load' : 'Real-time update');
    
    // 获取云端数据
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
        syncStatus: 'synced'
      });
    });
    
    console.log('📊 Phase 2: Received', cloudPrompts.length, 'prompts from Firestore');
    
    // Phase 2 优化: 只在有实际变更时才进行合并和更新
    const localPrompts = await getStorageItem('prompts') || [];
    
    // 快速检查是否有实际变更
    if (cloudPrompts.length === localPrompts.length && !isInitialLoad) {
      const hasChanges = cloudPrompts.some(cloudPrompt => {
        const localPrompt = localPrompts.find(p => p.id === cloudPrompt.id);
        return !localPrompt || localPrompt.updatedAt !== cloudPrompt.updatedAt;
      });
      
      if (!hasChanges) {
        console.log('⚡ Phase 2: No changes detected, skipping merge');
        return;
      }
    }
    
    console.log('📊 Phase 2: Current local prompts:', localPrompts.length);
    
    // 智能合并数据
    const mergedPrompts = mergePrompts(localPrompts, cloudPrompts);
    console.log('🔀 Phase 2: Merged result:', mergedPrompts.length, 'prompts');
    
    // Phase 2 优化: 批量更新Chrome Storage
    await setStorageItem('prompts', mergedPrompts);
    
    // Phase 2 优化: 不需要显式通知popup，Chrome Storage监听器会自动处理UI更新
    // notifyDataUpdated(mergedPrompts); // 移除，避免重复更新
    
    const processingTime = performance.now() - startTime;
    console.log(`✅ Phase 2: Firestore data change processed in ${processingTime.toFixed(2)}ms`);
    
  } catch (error) {
    console.error('❌ Phase 2: Error processing Firestore data change:', error);
  }
}

// 智能合并Prompts数据
function mergePrompts(localPrompts, cloudPrompts) {
  const merged = new Map();
  
  // 添加本地数据
  localPrompts.forEach(prompt => {
    merged.set(prompt.id, { ...prompt });
  });
  
  // 合并云端数据，以更新时间为准
  cloudPrompts.forEach(cloudPrompt => {
    const localPrompt = merged.get(cloudPrompt.id);
    
    if (!localPrompt) {
      // 本地没有，直接添加云端数据
      merged.set(cloudPrompt.id, cloudPrompt);
    } else {
      // 本地有，比较更新时间
      const cloudTime = cloudPrompt.updatedAt || 0;
      const localTime = localPrompt.updatedAt || 0;
      
      if (cloudTime > localTime) {
        // 云端更新，使用云端数据
        merged.set(cloudPrompt.id, cloudPrompt);
      }
      // else: 本地更新，保持本地数据
    }
  });
  
  // 转换为数组并按更新时间排序
  return Array.from(merged.values())
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

// 执行登录同步
async function performLoginSync(user) {
  try {
    console.log('🔄 Performing login sync...');
    
    // 获取本地数据
    const localPrompts = await getStorageItem('prompts') || [];
    
    // 同步本地数据到云端
    await syncLocalDataToCloud(user.uid, localPrompts);
    
    console.log('✅ Login sync completed');
    
  } catch (error) {
    console.error('❌ Login sync failed:', error);
  }
}

// 同步本地数据到云端
async function syncLocalDataToCloud(userId, prompts) {
  try {
    console.log('📤 Syncing local data to cloud...');
    
    const batch = db.batch();
    let batchCount = 0;
    
    for (const prompt of prompts) {
      if (prompt.syncStatus === 'pending' || prompt.syncStatus === 'local') {
        const docRef = db.collection('users')
          .doc(userId)
          .collection('prompts')
          .doc(prompt.id.toString());
        
        batch.set(docRef, {
          id: prompt.id,
          text: prompt.text,
          tags: prompt.tags || [],
          copyCount: prompt.copyCount || 0,
          createdAt: prompt.createdAt || Date.now(),
          updatedAt: prompt.updatedAt || Date.now(),
          userId: userId
        });
        
        batchCount++;
        
        // Firestore批量写入限制是500
        if (batchCount >= 500) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    // 更新本地数据的同步状态
    const updatedPrompts = prompts.map(p => ({
      ...p,
      userId: userId,
      syncStatus: 'synced'
    }));
    
    await setStorageItem('prompts', updatedPrompts);
    
    console.log('✅ Local data synced to cloud:', batchCount, 'prompts');
    
  } catch (error) {
    console.error('❌ Failed to sync local data to cloud:', error);
  }
}

// Phase 3 优化: 安全登出处理 - 增强版
async function safeSignOut() {
  try {
    console.log('🔄 Phase 3: Starting enhanced safe sign out...');
    
    // Phase 3: 获取详细的同步状态
    const pendingSummary = syncTracker.getPendingSummary();
    console.log('📊 Phase 3: Pre-logout sync summary:', pendingSummary);
    
    if (pendingSummary.total > 0) {
      // 有待同步数据，显示详细进度
      notifyPopup({
        type: 'signOutProgress',
        message: `正在安全登出并同步数据... (${pendingSummary.total}个更改待同步)`,
        details: {
          total: pendingSummary.total,
          add: pendingSummary.add,
          update: pendingSummary.update,
          delete: pendingSummary.delete
        }
      });
      
      // Phase 3: 执行增强的强制同步
      await enhancedForceSyncAllPendingData();
    } else {
      // 没有待同步数据
      notifyPopup({
        type: 'signOutProgress',
        message: '正在安全登出...'
      });
    }
    
    // 执行登出
    if (auth && currentUser) {
      await auth.signOut();
    }
    
    // Phase 3: 清理同步队列
    syncTracker.clearQueue();
    
    // 通知popup登出完成
    const finalMessage = pendingSummary.total > 0 
      ? `已安全登出，${pendingSummary.total}个数据更改已同步`
      : '已安全登出';
      
    notifyPopup({
      type: 'signOutComplete',
      message: finalMessage
    });
    
    console.log('✅ Phase 3: Enhanced safe sign out completed');
    
  } catch (error) {
    console.error('❌ Phase 3: Safe sign out failed:', error);
    
    // Phase 3: 增强的错误处理
    const pendingCount = syncTracker.getPendingCount();
    const errorMessage = pendingCount > 0 
      ? `登出时遇到问题: ${error.message}。有${pendingCount}个更改可能未同步。`
      : `登出时遇到问题: ${error.message}`;
    
    notifyPopup({
      type: 'signOutError',
      message: errorMessage,
      pendingCount: pendingCount
    });
  }
}

// 强制同步所有待同步数据
async function forceSyncAllPendingData() {
  if (!currentUser || !db) return;
  
  try {
    console.log('🔄 Force syncing all pending data...');
    
    const prompts = await getStorageItem('prompts') || [];
    const pendingPrompts = prompts.filter(p => 
      p.syncStatus === 'pending' || p.syncStatus === 'local'
    );
    
    if (pendingPrompts.length === 0) {
      console.log('✅ No pending data to sync');
      return;
    }
    
    console.log('📤 Syncing', pendingPrompts.length, 'pending prompts...');
    
    await syncLocalDataToCloud(currentUser.uid, prompts);
    
    console.log('✅ All pending data synced');
    
  } catch (error) {
    console.error('❌ Failed to force sync pending data:', error);
    throw error;
  }
}

// Phase 3 优化: 增强的强制同步功能
async function enhancedForceSyncAllPendingData() {
  if (!currentUser || !db) {
    console.log('⚠️ Phase 3: No user or database, skipping sync');
    return;
  }
  
  try {
    console.log('🔄 Phase 3: Starting enhanced force sync...');
    
    // 首先处理syncQueue中的待同步操作
    if (syncQueue.pending.length > 0) {
      console.log(`📝 Phase 3: Processing ${syncQueue.pending.length} queued operations...`);
      
      syncQueue.processing = true;
      let successCount = 0;
      let failureCount = 0;
      
      // 批量处理同步队列中的操作
      for (const item of [...syncQueue.pending]) {
        try {
          await processSyncQueueItem(item);
          syncTracker.removeFromQueue(item.id);
          successCount++;
          
          // 通知进度更新
          notifyPopup({
            type: 'syncProgress',
            message: `正在同步... (${successCount + failureCount}/${syncQueue.pending.length + successCount})`
          });
          
        } catch (error) {
          console.error(`❌ Phase 3: Failed to sync item ${item.id}:`, error);
          item.retryCount++;
          
          if (item.retryCount >= item.maxRetries) {
            syncTracker.removeFromQueue(item.id);
            failureCount++;
          }
        }
      }
      
      syncQueue.processing = false;
      console.log(`✅ Phase 3: Queue sync completed. Success: ${successCount}, Failed: ${failureCount}`);
    }
    
    // 然后处理存储中标记为pending的数据
    const prompts = await getStorageItem('prompts') || [];
    const pendingPrompts = prompts.filter(p => 
      p.syncStatus === 'pending' || p.syncStatus === 'local'
    );
    
    if (pendingPrompts.length > 0) {
      console.log(`📤 Phase 3: Syncing ${pendingPrompts.length} pending prompts...`);
      await syncLocalDataToCloud(currentUser.uid, prompts);
    }
    
    console.log('✅ Phase 3: Enhanced force sync completed');
    
  } catch (error) {
    console.error('❌ Phase 3: Enhanced force sync failed:', error);
    throw error;
  }
}

// Phase 3 优化: 处理同步队列中的单个项目
async function processSyncQueueItem(item) {
  if (!currentUser || !db) throw new Error('No user or database');
  
  const { operation, data } = item;
  
  switch (operation) {
    case syncTracker.operations.ADD:
      await syncSinglePromptToCloud(data);
      break;
      
    case syncTracker.operations.UPDATE:
      await syncSinglePromptToCloud(data);
      break;
      
    case syncTracker.operations.DELETE:
      await deletePromptFromCloud(data.id, currentUser.uid);
      break;
      
    default:
      throw new Error(`Unknown sync operation: ${operation}`);
  }
  
  console.log(`✅ Phase 3: Processed sync item ${item.id} (${operation})`);
}

// 消息处理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Service Worker received message:', message.action);
  
  handleMessage(message, sender)
    .then(response => {
      if (response !== undefined) {
        sendResponse(response);
      }
    })
    .catch(error => {
      console.error('❌ Message handling error:', error);
      sendResponse({ error: error.message });
    });
    
  return true; // 保持消息通道开放
});

// 处理消息
async function handleMessage(message, sender) {
  const { action, data } = message;
  
  switch (action) {
    case 'ping':
      return { success: true, message: 'Service Worker is ready' };
    
    case 'getAuthState':
      return {
        isConfigured: isFirebaseConfigured,
        user: currentUser ? {
          uid: currentUser.uid,
          email: currentUser.email
        } : null
      };
    
    case 'setFirebaseConfig':
      return await handleSetFirebaseConfig(data);
    
    case 'signIn':
      return await handleSignIn(data);
    
    case 'signUp':
      return await handleSignUp(data);
    
    case 'signOut':
      await safeSignOut();
      return { success: true };
    
    case 'resetPassword':
      return await handleResetPassword(data);
    
    case 'addPrompt':
      return await handleAddPrompt(data);
    
    case 'updatePrompt':
      return await handleUpdatePrompt(data);
    
    case 'deletePrompt':
      return await handleDeletePrompt(data);
    
    case 'syncData':
      return await handleSyncData();
    
    default:
      console.warn('❓ Unknown action:', action);
      return { error: 'Unknown action' };
  }
}

// 处理设置Firebase配置
async function handleSetFirebaseConfig(config) {
  try {
    console.log('🔧 Setting Firebase config in Service Worker');
    
    if (!config || !config.apiKey || !config.projectId) {
      throw new Error('Invalid Firebase config');
    }
    
    // 存储配置
    await setStorageItem('firebaseConfig', config);
    
    // 重新初始化Firebase
    await initializeFirebase();
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Failed to set Firebase config:', error);
    return { error: error.message };
  }
}

// 处理登录
async function handleSignIn(data) {
  try {
    if (!auth) {
      throw new Error('Firebase not configured');
    }
    
    const { email, password } = data;
    const result = await auth.signInWithEmailAndPassword(email, password);
    
    return {
      success: true,
      user: {
        uid: result.user.uid,
        email: result.user.email
      }
    };
    
  } catch (error) {
    console.error('❌ Sign in failed:', error);
    return { error: error.message };
  }
}

// 处理注册
async function handleSignUp(data) {
  try {
    if (!auth) {
      throw new Error('Firebase not configured');
    }
    
    const { email, password } = data;
    const result = await auth.createUserWithEmailAndPassword(email, password);
    
    return {
      success: true,
      user: {
        uid: result.user.uid,
        email: result.user.email
      }
    };
    
  } catch (error) {
    console.error('❌ Sign up failed:', error);
    return { error: error.message };
  }
}

// 处理重置密码
async function handleResetPassword(data) {
  try {
    if (!auth) {
      throw new Error('Firebase not configured');
    }
    
    const { email } = data;
    await auth.sendPasswordResetEmail(email);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Reset password failed:', error);
    return { error: error.message };
  }
}

// Phase 3 优化: 处理添加Prompt - 增强版
async function handleAddPrompt(promptData) {
  try {
    console.log('📝 Phase 3: Handling add prompt with sync tracking...');
    
    // 生成新的Prompt
    const now = Date.now();
    const newPrompt = {
      id: generateId(),
      text: promptData.text,
      tags: Array.isArray(promptData.tags) ? promptData.tags : [],
      copyCount: 0,
      createdAt: now,
      updatedAt: now,
      userId: currentUser ? currentUser.uid : null,
      syncStatus: currentUser ? 'pending' : 'local'
    };
    
    // 获取现有数据
    const prompts = await getStorageItem('prompts') || [];
    prompts.unshift(newPrompt);
    
    // 保存到本地
    await setStorageItem('prompts', prompts);
    
    // Phase 3: 如果用户已登录，添加到同步队列并尝试立即同步
    if (currentUser && db) {
      // 添加到同步队列以追踪状态
      const syncItemId = syncTracker.addToQueue(syncTracker.operations.ADD, newPrompt);
      
      try {
        await syncSinglePromptToCloud(newPrompt);
        // 同步成功，从队列中移除
        syncTracker.removeFromQueue(syncItemId);
      } catch (syncError) {
        console.warn('⚠️ Phase 3: Immediate sync failed, will retry during logout:', syncError);
        // 保持在队列中，登出时重试
      }
    }
    
    // 通知popup数据更新
    notifyDataUpdated(prompts);
    
    console.log('✅ Phase 3: Add prompt completed with sync tracking');
    return { success: true, prompt: newPrompt };
    
  } catch (error) {
    console.error('❌ Phase 3: Failed to add prompt:', error);
    return { error: error.message };
  }
}

// Phase 3 优化: 处理更新Prompt - 增强版
async function handleUpdatePrompt(data) {
  try {
    console.log('📝 Phase 3: Handling update prompt with sync tracking...');
    
    const { id, updateData } = data;
    
    // 获取现有数据
    const prompts = await getStorageItem('prompts') || [];
    const index = prompts.findIndex(p => p.id === id);
    
    if (index === -1) {
      throw new Error('Prompt not found');
    }
    
    // 更新数据
    const updatedPrompt = {
      ...prompts[index],
      ...updateData,
      updatedAt: Date.now(),
      syncStatus: currentUser ? 'pending' : 'local'
    };
    
    prompts[index] = updatedPrompt;
    
    // 保存到本地
    await setStorageItem('prompts', prompts);
    
    // Phase 3: 如果用户已登录，添加到同步队列并尝试立即同步
    if (currentUser && db) {
      // 添加到同步队列以追踪状态
      const syncItemId = syncTracker.addToQueue(syncTracker.operations.UPDATE, updatedPrompt);
      
      try {
        await syncSinglePromptToCloud(updatedPrompt);
        // 同步成功，从队列中移除
        syncTracker.removeFromQueue(syncItemId);
      } catch (syncError) {
        console.warn('⚠️ Phase 3: Immediate sync failed, will retry during logout:', syncError);
        // 保持在队列中，登出时重试
      }
    }
    
    // 通知popup数据更新
    notifyDataUpdated(prompts);
    
    console.log('✅ Phase 3: Update prompt completed with sync tracking');
    return { success: true, prompt: updatedPrompt };
    
  } catch (error) {
    console.error('❌ Phase 3: Failed to update prompt:', error);
    return { error: error.message };
  }
}

// Phase 3 优化: 处理删除Prompt - 增强版
async function handleDeletePrompt(data) {
  try {
    console.log('📝 Phase 3: Handling delete prompt with sync tracking...');
    
    const { id } = data;
    
    // 获取现有数据
    const prompts = await getStorageItem('prompts') || [];
    const index = prompts.findIndex(p => p.id === id);
    
    if (index === -1) {
      throw new Error('Prompt not found');
    }
    
    const deletedPrompt = prompts[index];
    prompts.splice(index, 1);
    
    // 保存到本地
    await setStorageItem('prompts', prompts);
    
    // Phase 3: 如果用户已登录，添加到同步队列并尝试立即删除
    if (currentUser && db && deletedPrompt.userId) {
      // 添加到同步队列以追踪状态
      const syncItemId = syncTracker.addToQueue(syncTracker.operations.DELETE, { id: id, userId: deletedPrompt.userId });
      
      try {
        await deletePromptFromCloud(id, currentUser.uid);
        // 删除成功，从队列中移除
        syncTracker.removeFromQueue(syncItemId);
      } catch (syncError) {
        console.warn('⚠️ Phase 3: Immediate delete failed, will retry during logout:', syncError);
        // 保持在队列中，登出时重试
      }
    }
    
    // 通知popup数据更新
    notifyDataUpdated(prompts);
    
    console.log('✅ Phase 3: Delete prompt completed with sync tracking');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Phase 3: Failed to delete prompt:', error);
    return { error: error.message };
  }
}

// 同步单个Prompt到云端
async function syncSinglePromptToCloud(prompt) {
  try {
    if (!currentUser || !db) return;
    
    const docRef = db.collection('users')
      .doc(currentUser.uid)
      .collection('prompts')
      .doc(prompt.id.toString());
    
    await docRef.set({
      id: prompt.id,
      text: prompt.text,
      tags: prompt.tags || [],
      copyCount: prompt.copyCount || 0,
      createdAt: prompt.createdAt || Date.now(),
      updatedAt: prompt.updatedAt || Date.now(),
      userId: currentUser.uid
    });
    
    // 更新本地同步状态
    const prompts = await getStorageItem('prompts') || [];
    const index = prompts.findIndex(p => p.id === prompt.id);
    if (index !== -1) {
      prompts[index].syncStatus = 'synced';
      await setStorageItem('prompts', prompts);
    }
    
    console.log('✅ Prompt synced to cloud:', prompt.id);
    
  } catch (error) {
    console.error('❌ Failed to sync prompt to cloud:', error);
  }
}

// 从云端删除Prompt
async function deletePromptFromCloud(promptId, userId) {
  try {
    if (!db) return;
    
    const docRef = db.collection('users')
      .doc(userId)
      .collection('prompts')
      .doc(promptId.toString());
    
    await docRef.delete();
    
    console.log('✅ Prompt deleted from cloud:', promptId);
    
  } catch (error) {
    console.error('❌ Failed to delete prompt from cloud:', error);
  }
}

// 工具函数
function generateId() {
  return Date.now() + Math.random().toString(36).substr(2, 9);
}

async function getStorageItem(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key]);
    });
  });
}

async function setStorageItem(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

// 更新存储的认证状态
async function updateStoredAuthState(user) {
  const authState = {
    isConfigured: isFirebaseConfigured,
    isLoggedIn: !!user,
    user: user ? {
      uid: user.uid,
      email: user.email
    } : null,
    timestamp: Date.now()
  };
  
  await setStorageItem('authState', authState);
  console.log('💾 Auth state updated in storage');
}

// 恢复认证状态
async function restoreAuthState() {
  try {
    const authState = await getStorageItem('authState');
    if (authState && authState.user && isFirebaseConfigured) {
      console.log('🔄 Restoring auth state for:', authState.user.email);
      // 认证状态会通过onAuthStateChanged自动恢复
    }
  } catch (error) {
    console.error('❌ Failed to restore auth state:', error);
  }
}

// 通知函数
function notifyAuthStateChange(user) {
  const message = {
    type: 'authStateChanged',
    user: user ? {
      uid: user.uid,
      email: user.email
    } : null,
    isConfigured: isFirebaseConfigured
  };
  
  broadcastToPopups(message);
}

function notifyDataUpdated(prompts) {
  const message = {
    type: 'dataUpdated',
    data: prompts
  };
  
  broadcastToPopups(message);
}

function notifyPopup(message) {
  broadcastToPopups(message);
}

// 广播消息到所有popup
function broadcastToPopups(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // 没有popup在监听，忽略错误
  });
}

console.log('✅ Service Worker initialized and ready'); 