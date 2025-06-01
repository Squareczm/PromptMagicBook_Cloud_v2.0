// ==================================================
// 初始化和协议检测
// ==================================================

// 检测协议并显示警告
if (window.location.protocol === 'file:') {
    document.addEventListener('DOMContentLoaded', () => {
        const warningElement = document.getElementById('protocol-warning');
        if (warningElement) {
            warningElement.classList.remove('hidden');
        }
    });
    console.warn('正在使用file://协议，某些功能可能不可用。建议作为Chrome扩展使用。');
}

// Firebase配置检查和初始化
window.firebaseApp = null;
window.isFirebaseConfigured = false;

// ==================================================
// 全局DOM元素和变量
// ==================================================

// DOM元素（在DOMContentLoaded后初始化）
let promptInput, tagsInput, saveButton, cancelButton, promptList;
let tagListContainer, existingTagsContainer, noTagsPlaceholder, formTitle;
let exportJsonButton, exportTxtButton, importJsonButton;
let searchInput, clearSearchButton;

// 全局状态变量
let prompts = [];
let editingPromptId = null;
let activeFilterTags = new Set();
let searchQuery = '';

// Firebase相关变量
let firebaseApp = null;
let auth = null;
let db = null;
let currentUser = null;
let isFirebaseConfigured = false;

// Firebase配置检查和初始化
function initializeFirebaseConfig() {
    if (window.location.protocol === 'file:') {
        // 在file://协议下，始终显示未配置状态
        console.warn('file://协议下，Firebase功能不可用');
        window.isFirebaseConfigured = false;
        window.dispatchEvent(new CustomEvent('firebaseInitialized', {
            detail: { app: null, configured: false }
        }));
        return;
    }
    
    // 检查Firebase配置文件
    fetch('./firebase-config.js')
        .then(response => {
            if (response.ok) {
                return response.text();
            }
            throw new Error('配置文件不存在');
        })
        .then(configText => {
            // 解析配置文件 - 提取JSON对象
            const configMatch = configText.match(/firebaseConfig\s*=\s*({[\s\S]*?});/);
            if (configMatch) {
                try {
                    // 清理配置字符串，移除注释和多余空白
                    let configStr = configMatch[1];
                    // 移除单行注释
                    configStr = configStr.replace(/\/\/.*$/gm, '');
                    // 移除多行注释
                    configStr = configStr.replace(/\/\*[\s\S]*?\*\//g, '');
                    // 解析JSON
                    const config = JSON.parse(configStr);
                    
                    // 验证配置完整性
                    if (config.apiKey && config.authDomain && config.projectId) {
                        if (typeof firebase !== 'undefined' && firebase.initializeApp) {
                            window.firebaseApp = firebase.initializeApp(config);
                            window.isFirebaseConfigured = true;
                            console.log('Firebase初始化成功');
                        } else {
                            throw new Error('Firebase SDK未加载');
                        }
                    } else {
                        throw new Error('配置不完整');
                    }
                } catch (parseError) {
                    console.error('配置解析失败:', parseError);
                    throw new Error('配置格式错误');
                }
            } else {
                throw new Error('未找到配置对象');
            }
            
            // 触发初始化完成事件
            window.dispatchEvent(new CustomEvent('firebaseInitialized', {
                detail: { app: window.firebaseApp, configured: window.isFirebaseConfigured }
            }));
        })
        .catch(error => {
            console.warn('Firebase配置失败:', error.message);
            window.isFirebaseConfigured = false;
            
            // 触发初始化失败事件
            window.dispatchEvent(new CustomEvent('firebaseInitialized', {
                detail: { app: null, configured: false }
            }));
        });
}

// 延迟初始化，确保Firebase SDK加载完成
setTimeout(initializeFirebaseConfig, 100);

// ==================================================
// Firebase认证和云同步模块
// ==================================================

// Firebase相关功能
function initializeFirebaseServices() {
    try {
        if (window.firebaseApp && window.isFirebaseConfigured) {
            auth = firebase.auth();
            db = firebase.firestore();
            
            // 初始化云端同步模块
            if (window.cloudSync) {
                window.cloudSync.initialize(auth, db);
            }
            
            // 监听认证状态变化
            auth.onAuthStateChanged(handleAuthStateChange);
            
            console.log('Firebase服务初始化成功');
            updateAuthUI();
        } else {
            console.warn('Firebase未配置，云同步功能不可用');
            showFirebaseNotConfigured();
        }
    } catch (error) {
        console.error('Firebase服务初始化失败:', error);
        showFirebaseNotConfigured();
    }
}

// 处理认证状态变化
async function handleAuthStateChange(user) {
    currentUser = user;
    console.log('认证状态变化:', user ? '已登录' : '未登录');
    
    if (user) {
        console.log('用户已登录:', user.email);
        
        // 设置云端同步用户
        if (window.cloudSync) {
            window.cloudSync.setCurrentUser(user);
        }
        
        showToast(`欢迎回来，${user.email}！云同步已启用。`);
    } else {
        console.log('用户已登出');
        
        // 清理云端同步
        if (window.cloudSync) {
            await window.cloudSync.clearUserCloudData();
            window.cloudSync.setCurrentUser(null);
        }
        
        showToast('已登出，切换到本地模式。');
    }
    
    updateAuthUI();
}

// 更新认证UI
function updateAuthUI() {
    const firebaseNotConfigured = document.getElementById('firebase-not-configured');
    const emailAuthContainer = document.getElementById('email-auth-container');
    const userInfo = document.getElementById('user-info');
    const authLoading = document.getElementById('auth-loading');
    
    console.log('更新UI状态:', {
        isFirebaseConfigured,
        currentUser: currentUser ? currentUser.email : null,
        elements: {
            firebaseNotConfigured: !!firebaseNotConfigured,
            emailAuthContainer: !!emailAuthContainer,
            userInfo: !!userInfo,
            authLoading: !!authLoading
        }
    });
    
    // 隐藏所有状态
    if (firebaseNotConfigured) {
        firebaseNotConfigured.classList.add('hidden');
        console.log('隐藏Firebase未配置提示');
    }
    if (emailAuthContainer) {
        emailAuthContainer.classList.add('hidden');
        console.log('隐藏邮箱登录表单');
    }
    if (userInfo) {
        userInfo.classList.add('hidden');
        console.log('隐藏用户信息');
    }
    if (authLoading) {
        authLoading.classList.add('hidden');
        console.log('隐藏加载状态');
    }
    
    if (!isFirebaseConfigured) {
        // Firebase未配置
        if (firebaseNotConfigured) {
            firebaseNotConfigured.classList.remove('hidden');
            console.log('显示Firebase未配置状态');
        }
    } else if (currentUser) {
        // 已登录状态
        if (userInfo) {
            userInfo.classList.remove('hidden');
            console.log('显示用户信息:', currentUser.email);
            
            const nameElement = document.getElementById('user-name');
            if (nameElement) {
                nameElement.textContent = currentUser.email || '用户';
            }
            
            // 邮箱登录没有头像，隐藏头像元素
            const avatar = document.getElementById('user-avatar');
            if (avatar) {
                avatar.style.display = 'none';
            }
        }
    } else {
        // 未登录状态（Firebase已配置）
        if (emailAuthContainer) {
            emailAuthContainer.classList.remove('hidden');
            console.log('显示邮箱登录表单');
        }
    }
}

// 显示Firebase未配置状态
function showFirebaseNotConfigured() {
    isFirebaseConfigured = false;
    console.log('Firebase未配置，显示警告状态');
    updateAuthUI();
}

// 邮箱密码登录
function signInWithEmail() {
    const email = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value;
    
    if (!email || !password) {
        showToast('请输入邮箱和密码', 3000);
        return;
    }
    
    console.log('尝试邮箱登录:', email);
    console.log('Firebase Auth配置状态:', !!auth);
    showAuthLoading();
    
    auth.signInWithEmailAndPassword(email, password)
        .then((result) => {
            console.log('登录成功:', result.user.email);
            showToast(`登录成功！欢迎回来，${result.user.email}`);
            clearAuthInputs();
        })
        .catch((error) => {
            console.error('登录失败:', error);
            console.error('错误详情:', {
                code: error.code,
                message: error.message,
                email: email
            });
            hideAuthLoading();
            
            let errorMessage = '登录失败';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = '该邮箱还未注册，请先点击"注册"按钮创建账户';
                    break;
                case 'auth/wrong-password':
                    errorMessage = '密码错误，请检查密码或使用"忘记密码"功能';
                    break;
                case 'auth/invalid-email':
                    errorMessage = '邮箱格式不正确';
                    break;
                case 'auth/invalid-credential':
                    errorMessage = '登录凭据无效。请先注册账户，或检查邮箱密码是否正确';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = '尝试次数过多，请稍后再试';
                    break;
                default:
                    errorMessage = `登录失败：${error.message}`;
            }
            showToast(errorMessage, 6000);
        });
}

// 邮箱注册
function signUpWithEmail() {
    const email = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value;
    
    if (!email || !password) {
        showToast('请输入邮箱和密码', 3000);
        return;
    }
    
    if (password.length < 6) {
        showToast('密码至少需要6位字符', 3000);
        return;
    }
    
    console.log('尝试邮箱注册:', email);
    console.log('密码长度:', password.length);
    showAuthLoading();
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((result) => {
            console.log('注册成功:', result.user.email);
            showToast(`注册成功！欢迎，${result.user.email}。您现在可以使用云同步功能了！`, 5000);
            clearAuthInputs();
        })
        .catch((error) => {
            console.error('注册失败:', error);
            console.error('注册错误详情:', {
                code: error.code,
                message: error.message,
                email: email,
                passwordLength: password.length
            });
            hideAuthLoading();
            
            let errorMessage = '注册失败';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = '该邮箱已被注册，请直接点击"登录"按钮';
                    break;
                case 'auth/invalid-email':
                    errorMessage = '邮箱格式不正确';
                    break;
                case 'auth/weak-password':
                    errorMessage = '密码强度不够，请使用至少6位字符的更强密码';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = '邮箱注册功能未启用，请联系管理员';
                    break;
                default:
                    errorMessage = `注册失败：${error.message}`;
            }
            showToast(errorMessage, 6000);
        });
}

// 重置密码
function resetPassword() {
    const email = document.getElementById('reset-email-input').value.trim();
    
    if (!email) {
        showToast('请输入邮箱地址', 3000);
        return;
    }
    
    console.log('发送密码重置邮件:', email);
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            showToast('密码重置邮件已发送，请查收邮箱', 5000);
            // 回到登录表单
            showLoginForm();
            document.getElementById('reset-email-input').value = '';
        })
        .catch((error) => {
            console.error('密码重置失败:', error);
            
            let errorMessage = '发送失败';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = '该邮箱未注册';
                    break;
                case 'auth/invalid-email':
                    errorMessage = '邮箱格式不正确';
                    break;
                default:
                    errorMessage = `发送失败：${error.message}`;
            }
            showToast(errorMessage, 4000);
        });
}

// 显示登录表单
function showLoginForm() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('reset-form').classList.add('hidden');
}

// 显示重置密码表单
function showResetForm() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('reset-form').classList.remove('hidden');
}

// 显示认证加载状态
function showAuthLoading() {
    const authLoading = document.getElementById('auth-loading');
    const emailAuthContainer = document.getElementById('email-auth-container');
    
    if (authLoading) authLoading.classList.remove('hidden');
    if (emailAuthContainer) emailAuthContainer.classList.add('hidden');
}

// 隐藏认证加载状态
function hideAuthLoading() {
    const authLoading = document.getElementById('auth-loading');
    const emailAuthContainer = document.getElementById('email-auth-container');
    
    if (authLoading) authLoading.classList.add('hidden');
    if (emailAuthContainer) emailAuthContainer.classList.remove('hidden');
}

// 清除认证输入框
function clearAuthInputs() {
    document.getElementById('email-input').value = '';
    document.getElementById('password-input').value = '';
    document.getElementById('reset-email-input').value = '';
}

// 用户登出
function signOutUser() {
    console.log('尝试登出...');
    
    if (!auth) {
        showToast('认证服务未初始化', 3000);
        return;
    }
    
    auth.signOut()
        .then(() => {
            console.log('登出成功');
            showToast('已登出，切换到本地模式');
        })
        .catch((error) => {
            console.error('登出失败:', error);
            showToast('登出失败：' + error.message, 3000);
        });
}

// ==================================================
// 原有功能代码（保持不变）
// ==================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 初始化DOM元素
    promptInput = document.getElementById('prompt-input');
    tagsInput = document.getElementById('tags-input');
    saveButton = document.getElementById('save-button');
    cancelButton = document.getElementById('cancel-edit-button');
    promptList = document.getElementById('prompt-list');
    tagListContainer = document.getElementById('tag-list-container');
    existingTagsContainer = document.getElementById('existing-tags-container');
    noTagsPlaceholder = document.getElementById('no-tags-placeholder');
    formTitle = document.getElementById('form-title');
    exportJsonButton = document.getElementById('export-json-button');
    exportTxtButton = document.getElementById('export-txt-button');
    importJsonButton = document.getElementById('import-json-button');
    searchInput = document.getElementById('search-input');
    clearSearchButton = document.getElementById('clear-search');

    // Firebase认证按钮事件
    const signInBtn = document.getElementById('sign-in-btn');
    const signUpBtn = document.getElementById('sign-up-btn');
    const signOutBtn = document.getElementById('google-sign-out-btn');
    const showResetFormBtn = document.getElementById('show-reset-form');
    const sendResetBtn = document.getElementById('send-reset-btn');
    const backToLoginBtn = document.getElementById('back-to-login');
    
    if (signInBtn) {
        signInBtn.addEventListener('click', signInWithEmail);
        console.log('登录按钮事件已绑定');
    }
    if (signUpBtn) {
        signUpBtn.addEventListener('click', signUpWithEmail);
        console.log('注册按钮事件已绑定');
    }
    if (signOutBtn) {
        signOutBtn.addEventListener('click', signOutUser);
        console.log('登出按钮事件已绑定');
    }
    if (showResetFormBtn) {
        showResetFormBtn.addEventListener('click', showResetForm);
        console.log('显示重置表单按钮事件已绑定');
    }
    if (sendResetBtn) {
        sendResetBtn.addEventListener('click', resetPassword);
        console.log('发送重置邮件按钮事件已绑定');
    }
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', showLoginForm);
        console.log('返回登录按钮事件已绑定');
    }
    
    // 支持回车键登录
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const resetEmailInput = document.getElementById('reset-email-input');
    
    if (emailInput) {
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                signInWithEmail();
            }
        });
    }
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                signInWithEmail();
            }
        });
    }
    if (resetEmailInput) {
        resetEmailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                resetPassword();
            }
        });
    }

    // 监听Firebase初始化事件
    window.addEventListener('firebaseInitialized', (event) => {
        console.log('收到Firebase初始化事件:', event.detail);
        isFirebaseConfigured = event.detail.configured;
        window.firebaseApp = event.detail.app;
        
        // 初始化Firebase服务
        initializeFirebaseServices();
    });

    // v2.0: 使用新的模块化数据管理
    // 初始化本地存储
    console.log('🔄 初始化本地数据存储...');
    try {
        if (window.localStore) {
            await window.localStore.initialize();
            prompts = await window.localStore.getAllPrompts();
            console.log('✅ 本地数据加载完成:', prompts.length, '个Prompt');
        } else {
            console.error('❌ 本地存储模块未加载');
        }
    } catch (error) {
        console.error('❌ 初始化本地存储失败:', error);
        prompts = []; // 使用空数组作为备选
    }

    // 监听云端同步事件
    window.addEventListener('cloudSyncCompleted', (event) => {
        const { totalSynced } = event.detail;
        showToast(`✅ 已同步 ${totalSynced} 个Prompt到云端`);
        console.log('云端同步完成:', totalSynced);
    });

    window.addEventListener('cloudSyncFailed', (event) => {
        const { error } = event.detail;
        showToast(`❌ 云端同步失败: ${error}`, 5000);
        console.error('云端同步失败:', error);
    });

    // Phase 3: 监听双向同步事件
    window.addEventListener('cloudToLocalSyncCompleted', async (event) => {
        const { cloudCount, localCount, mergedCount } = event.detail;
        showToast(`🔄 数据合并完成: 云端${cloudCount}个 + 本地${localCount}个 = 共${mergedCount}个`, 5000);
        console.log('双向同步完成:', event.detail);
        
        // 刷新UI显示
        prompts = await window.localStore.getAllPrompts();
        renderPrompts();
        updateFilterTagButtons();
        updateExistingTagsForInput();
    });

    window.addEventListener('cloudToLocalSyncFailed', (event) => {
        const { error } = event.detail;
        showToast(`❌ 从云端同步失败: ${error}`, 5000);
        console.error('从云端同步失败:', error);
    });

    // 初始化UI
    updateFilterTagButtons();
    updateExistingTagsForInput();
    renderPrompts();
    
    // 绑定所有事件监听器
    bindEventListeners();
});

// 绑定事件监听器函数
function bindEventListeners() {
    if (saveButton) {
        saveButton.addEventListener('click', savePrompt);
        console.log('保存按钮事件已绑定');
    }
    if (cancelButton) {
        cancelButton.addEventListener('click', cancelEdit);
        console.log('取消按钮事件已绑定');
    }
    if (exportJsonButton) {
        exportJsonButton.addEventListener('click', () => exportData('json'));
        console.log('导出JSON按钮事件已绑定');
    }
    if (exportTxtButton) {
        exportTxtButton.addEventListener('click', () => exportData('txt'));
        console.log('导出TXT按钮事件已绑定');
    }
    if (importJsonButton) {
        importJsonButton.addEventListener('click', importDataFromJson);
        console.log('导入JSON按钮事件已绑定');
    }
    if (searchInput) {
        searchInput.addEventListener('input', performSearch);
        console.log('搜索输入框事件已绑定');
    }
    if (clearSearchButton) {
        clearSearchButton.addEventListener('click', clearSearch);
        console.log('清除搜索按钮事件已绑定');
    }
    
    // 添加快捷键支持
    function handleKeyboardShortcuts(event) {
        // Ctrl+Enter 或 Cmd+Enter 快速保存
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            savePrompt();
        }
    }
    
    // 为输入框添加快捷键监听
    if (promptInput) {
        promptInput.addEventListener('keydown', handleKeyboardShortcuts);
        console.log('Prompt输入框快捷键事件已绑定');
    }
    if (tagsInput) {
        tagsInput.addEventListener('keydown', handleKeyboardShortcuts);
        console.log('标签输入框快捷键事件已绑定');
    }
}

// 将showToast函数提升到全局作用域，供Firebase模块使用
window.showToast = function(message, duration = 3000) {
    const toast = document.getElementById('toast-message');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }
};

// --- 标签处理 ---
function getAllUniqueTags() {
    const allTags = new Set();
    prompts.forEach(prompt => {
        prompt.tags.forEach(tag => allTags.add(tag.trim()));
    });
    return Array.from(allTags).sort();
}

function renderTagButtons(tags, container, clickHandler, activeTagsSet) {
    container.innerHTML = '';
    if (tags.length === 0 && container === tagListContainer) {
        noTagsPlaceholder.style.display = 'block';
        return;
    }
    if (container === tagListContainer) noTagsPlaceholder.style.display = 'none';

    tags.forEach(tag => {
        const button = document.createElement('button');
        button.textContent = tag;
        button.classList.add('tag-button');
        if (activeTagsSet && activeTagsSet.has(tag)) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => clickHandler(tag, button));
        container.appendChild(button);
    });
}

function updateFilterTagButtons() {
    const uniqueTags = getAllUniqueTags();
    renderTagButtons(uniqueTags, tagListContainer, toggleFilterTag, activeFilterTags);
}

function updateExistingTagsForInput() {
    const uniqueTags = getAllUniqueTags();
    renderTagButtons(uniqueTags, existingTagsContainer, addTagToInput, null);
}

function addTagToInput(tag) {
    const currentTags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
    if (!currentTags.includes(tag)) {
        currentTags.push(tag);
        tagsInput.value = currentTags.join(', ');
    }
}

function toggleFilterTag(tag, button) {
    if (activeFilterTags.has(tag)) {
        activeFilterTags.delete(tag);
        button.classList.remove('active');
    } else {
        activeFilterTags.add(tag);
        button.classList.add('active');
    }
    renderPrompts();
}

// --- 搜索功能 ---
function performSearch() {
    searchQuery = searchInput.value.trim().toLowerCase();
    
    // 显示或隐藏清除按钮
    if (searchQuery) {
        clearSearchButton.classList.remove('hidden');
    } else {
        clearSearchButton.classList.add('hidden');
    }
    
    renderPrompts();
}

function clearSearch() {
    searchInput.value = '';
    searchQuery = '';
    clearSearchButton.classList.add('hidden');
    renderPrompts();
}

function matchesSearch(prompt) {
    if (!searchQuery) return true;
    
    // 搜索prompt内容
    const textMatch = prompt.text.toLowerCase().includes(searchQuery);
    
    // 搜索标签
    const tagMatch = prompt.tags.some(tag => 
        tag.toLowerCase().includes(searchQuery)
    );
    
    return textMatch || tagMatch;
}

// --- Prompt渲染 --- 
function renderPrompts() {
    promptList.innerHTML = '';
    
    // 先过滤标签，再搜索，最后按复制次数排序
    let filteredPrompts = prompts.filter(prompt => {
        // 标签过滤
        const tagFilter = activeFilterTags.size === 0 || 
            prompt.tags.some(tag => activeFilterTags.has(tag.trim()));
        
        // 搜索过滤
        const searchFilter = matchesSearch(prompt);
        
        return tagFilter && searchFilter;
    });

    // 按复制次数降序排列（复制次数多的在前面）
    filteredPrompts.sort((a, b) => (b.copyCount || 0) - (a.copyCount || 0));

    if (filteredPrompts.length === 0) {
        const li = document.createElement('li');
        let message = '还没有保存任何Prompt。';
        
        if (searchQuery && activeFilterTags.size > 0) {
            message = '没有匹配当前搜索和筛选条件的Prompt。';
        } else if (searchQuery) {
            message = '没有匹配当前搜索条件的Prompt。';
        } else if (activeFilterTags.size > 0) {
            message = '没有匹配当前筛选的Prompt。';
        }
        
        li.textContent = message;
        li.classList.add('empty-state-placeholder');
        promptList.appendChild(li);
        return;
    }

    filteredPrompts.forEach((prompt, index) => {
        const li = document.createElement('li');
        li.classList.add('prompt-item');
        li.dataset.id = prompt.id;

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('prompt-content');
        
        // 检查内容是否需要折叠
        const lines = prompt.text.split('\n');
        const needsCollapse = lines.length > 3 || prompt.text.length > 200;
        
        if (needsCollapse) {
            // 创建完整内容和预览内容
            const previewText = lines.slice(0, 3).join('\n');
            const fullText = prompt.text;
            
            // 创建内容容器
            const textContainer = document.createElement('div');
            textContainer.classList.add('text-container');
            
            const previewSpan = document.createElement('span');
            previewSpan.classList.add('preview-text');
            previewSpan.textContent = previewText;
            
            const fullSpan = document.createElement('span');
            fullSpan.classList.add('full-text', 'hidden');
            fullSpan.textContent = fullText;
            
            const ellipsis = document.createElement('span');
            ellipsis.classList.add('ellipsis');
            ellipsis.textContent = '...';
            
            textContainer.appendChild(previewSpan);
            textContainer.appendChild(ellipsis);
            textContainer.appendChild(fullSpan);
            contentDiv.appendChild(textContainer);
            
            // 创建展开/收起按钮
            const toggleButton = document.createElement('button');
            toggleButton.classList.add('toggle-button');
            toggleButton.innerHTML = `
                <span class="expand-text">展开</span>
                <span class="collapse-text hidden">收起</span>
                <svg class="expand-icon w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
                <svg class="collapse-icon w-4 h-4 ml-1 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                </svg>
            `;
            
            // 添加点击事件
            toggleButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const isExpanded = contentDiv.classList.contains('expanded');
                
                if (isExpanded) {
                    // 收起
                    contentDiv.classList.remove('expanded');
                    previewSpan.classList.remove('hidden');
                    ellipsis.classList.remove('hidden');
                    fullSpan.classList.add('hidden');
                    toggleButton.querySelector('.expand-text').classList.remove('hidden');
                    toggleButton.querySelector('.collapse-text').classList.add('hidden');
                    toggleButton.querySelector('.expand-icon').classList.remove('hidden');
                    toggleButton.querySelector('.collapse-icon').classList.add('hidden');
                } else {
                    // 展开
                    contentDiv.classList.add('expanded');
                    previewSpan.classList.add('hidden');
                    ellipsis.classList.add('hidden');
                    fullSpan.classList.remove('hidden');
                    toggleButton.querySelector('.expand-text').classList.add('hidden');
                    toggleButton.querySelector('.collapse-text').classList.remove('hidden');
                    toggleButton.querySelector('.expand-icon').classList.add('hidden');
                    toggleButton.querySelector('.collapse-icon').classList.remove('hidden');
                }
            });
            
            contentDiv.appendChild(toggleButton);
        } else {
            // 内容较短，直接显示
            contentDiv.textContent = prompt.text;
        }

        const tagsDiv = document.createElement('div');
        tagsDiv.classList.add('prompt-tags');
        prompt.tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.classList.add('prompt-tag');
            tagSpan.textContent = tag.trim();
            tagsDiv.appendChild(tagSpan);
        });

        // 添加复制次数显示
        const copyCountSpan = document.createElement('span');
        copyCountSpan.classList.add('copy-count');
        copyCountSpan.textContent = `复制${prompt.copyCount || 0}次`;
        copyCountSpan.style.color = '#6b7280';
        copyCountSpan.style.fontSize = '0.75rem';
        copyCountSpan.style.marginLeft = '8px';

        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('prompt-item-actions'); // 修改类名以匹配CSS

        const copyButton = createActionButton('复制', 
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>',
            () => copyPrompt(prompt.text, prompt.id));

        const editButton = createActionButton('编辑', 
            '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>',
            () => editPrompt(prompt.id));

        const deleteButton = createActionButton('删除', 
            '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>',
            () => deletePrompt(prompt.id));

        // 创建 footer 容器
        const footerDiv = document.createElement('div');
        footerDiv.classList.add('prompt-item-footer');

        // 将复制次数添加到标签区域
        tagsDiv.appendChild(copyCountSpan);

        // 将 tagsDiv 和 actionsDiv 放入 footerDiv
        footerDiv.appendChild(tagsDiv); // 标签在左
        footerDiv.appendChild(actionsDiv); // 按钮在右

        actionsDiv.append(copyButton, editButton, deleteButton);
        li.append(contentDiv, footerDiv); // 将 contentDiv 和 footerDiv 添加到 li
        promptList.appendChild(li);
    });
}

function createActionButton(title, svgIcon, onClick) {
    const button = document.createElement('button');
    button.classList.add('icon-btn');
    button.title = title;
    button.innerHTML = svgIcon;
    button.addEventListener('click', onClick);
    return button;
}

// --- Prompt操作 --- 
async function savePrompt() {
    const text = promptInput.value.trim();
    const tagsArray = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);

    if (!text) {
        showToast('Prompt内容不能为空！', 2000);
        return;
    }

    try {
        if (editingPromptId) {
            // 更新现有Prompt
            await window.localStore.updatePrompt(editingPromptId, {
                text: text,
                tags: tagsArray
            });
            showToast('Prompt已更新！');
            
            editingPromptId = null;
            formTitle.textContent = '添加新的Prompt';
            saveButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>保存Prompt</span>';
            cancelButton.classList.add('hidden');
        } else {
            // 添加新Prompt
            const userId = currentUser ? currentUser.uid : null;
            await window.localStore.addPrompt({
                text: text,
                tags: tagsArray,
                userId: userId
            });
            showToast('Prompt已保存！');
        }

        clearInputFields();
        
        // 刷新数据和UI
        prompts = await window.localStore.getAllPrompts();
        renderPrompts();
        updateFilterTagButtons();
        updateExistingTagsForInput();
        
    } catch (error) {
        console.error('保存Prompt失败:', error);
        showToast('保存失败：' + error.message, 3000);
    }
}

async function editPrompt(id) {
    const promptToEdit = prompts.find(p => p.id === id);
    if (promptToEdit) {
        promptInput.value = promptToEdit.text;
        tagsInput.value = promptToEdit.tags.join(', ');
        editingPromptId = id;
        formTitle.textContent = '编辑Prompt';
        saveButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>更新Prompt</span>';
        cancelButton.classList.remove('hidden');
        promptInput.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function cancelEdit() {
    editingPromptId = null;
    clearInputFields();
    formTitle.textContent = '添加新的Prompt';
    saveButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>保存Prompt</span>';
    cancelButton.classList.add('hidden');
}

async function deletePrompt(id) {
    if (confirm('确定要删除这个Prompt吗？')) {
        try {
            await window.localStore.deletePrompt(id);
            showToast('Prompt已删除！');
            
            // 刷新数据和UI
            prompts = await window.localStore.getAllPrompts();
            renderPrompts();
            updateFilterTagButtons();
            updateExistingTagsForInput();
            
            if (editingPromptId === id) {
                cancelEdit(); // 如果正在编辑的被删除了，取消编辑状态
            }
            
        } catch (error) {
            console.error('删除Prompt失败:', error);
            showToast('删除失败：' + error.message, 3000);
        }
    }
}

async function copyPrompt(text, id) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Prompt已复制到剪贴板！');
        
        // 增加复制次数
        await window.localStore.incrementCopyCount(id);
        
        // 刷新数据以显示更新的复制次数
        prompts = await window.localStore.getAllPrompts();
        renderPrompts();
        
    } catch (err) {
        console.error('复制失败: ', err);
        showToast('复制失败，请手动复制。', 3000);
    }
}

function clearInputFields() {
    promptInput.value = '';
    tagsInput.value = '';
}

// --- 数据导出 ---
function exportData(format) {
    if (prompts.length === 0) {
        showToast('没有数据可以导出。', 2000);
        return;
    }

    let dataStr, mimeType, fileName;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (format === 'json') {
        dataStr = JSON.stringify(prompts, null, 2);
        mimeType = 'application/json';
        fileName = `prompts_${timestamp}.json`;
    } else if (format === 'txt') {
        dataStr = prompts.map(p => {
            return `标签: ${p.tags.join(', ')}\nPrompt:\n${p.text}\n--------------------`;
        }).join('\n\n');
        mimeType = 'text/plain';
        fileName = `prompts_${timestamp}.txt`;
    }

    const blob = new Blob([dataStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`数据已导出为 ${fileName}`);
}

// --- 数据导入 ---
async function importDataFromJson() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = async function(event) {
            try {
                const importedPrompts = JSON.parse(event.target.result);
                if (Array.isArray(importedPrompts) && importedPrompts.every(p => typeof p.text === 'string' && Array.isArray(p.tags))) {
                    let newPromptsAdded = 0;
                    const userId = currentUser ? currentUser.uid : null;
                    
                    // 使用新的本地存储模块添加导入的Prompt
                    for (const importedPrompt of importedPrompts) {
                        try {
                            await window.localStore.addPrompt({
                                text: importedPrompt.text,
                                tags: importedPrompt.tags,
                                userId: userId
                            });
                            newPromptsAdded++;
                        } catch (error) {
                            console.error('导入单个Prompt失败:', error);
                        }
                    }
                    
                    // 刷新数据和UI
                    prompts = await window.localStore.getAllPrompts();
                    renderPrompts();
                    updateFilterTagButtons();
                    updateExistingTagsForInput();
                    showToast(`${newPromptsAdded}个Prompt已成功导入！`);
                    
                } else {
                    showToast('导入失败：JSON文件格式不正确。', 3000);
                }
            } catch (error) {
                console.error('导入JSON错误:', error);
                showToast('导入失败：无法解析JSON文件。', 3000);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}