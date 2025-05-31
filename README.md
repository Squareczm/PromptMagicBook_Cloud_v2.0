# Prompt魔法书 v2.0 📖

> 支持云端同步的AI提示词管理工具

## ✨ 主要特性

### 🔄 **双向云端同步**
- **本地优先**: 离线状态下完整功能可用
- **智能合并**: 多设备数据自动合并，避免误删
- **实时同步**: 登录后自动同步，数据变更实时上传
- **冲突解决**: 基于时间戳的智能合并策略

### 🔐 **安全认证**
- **邮箱密码登录**: 简单安全的认证方式
- **用户隔离**: 每个用户数据完全独立
- **本地降级**: 未登录状态本地功能不受影响

### 📊 **智能管理**
- **标签系统**: 灵活的分类和筛选
- **使用统计**: 基于复制次数的智能排序
- **搜索功能**: 内容和标签的全文搜索
- **数据导入导出**: JSON/TXT格式支持

## 🚀 快速开始

### 📦 第1步: 下载和安装

1. **下载项目文件**
   - 克隆或下载本项目到本地文件夹

2. **下载Firebase SDK文件**（必需步骤！）
   
   **方法1: 自动下载脚本（推荐）**
   ```powershell
   # Windows PowerShell
   .\download-firebase-sdk.ps1
   ```
   ```bash
   # Linux/macOS
   chmod +x download-firebase-sdk.sh
   ./download-firebase-sdk.sh
   ```
   
   **方法2: 手动下载**
   下载以下文件到项目根目录：
   - [firebase-app-compat.js](https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js)
   - [firebase-auth-compat.js](https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js)
   - [firebase-firestore-compat.js](https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js)

3. **安装Chrome扩展**
   1. 在Chrome中打开 `chrome://extensions/`
   2. 开启"开发者模式"（右上角开关）
   3. 点击"加载已解压的扩展程序"
   4. 选择项目文件夹

### ☁️ 第2步: 配置Firebase（可选 - 启用云同步）

> **注意**: 如果跳过此步骤，应用将以本地模式运行，所有功能正常可用

#### 2.1 创建Firebase项目
1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 点击"创建项目"或选择现有项目
3. 按提示完成项目创建

#### 2.2 启用Authentication
1. 在Firebase Console中，进入"Authentication"
2. 点击"开始使用"
3. 进入"Sign-in method"标签页
4. 启用"电子邮件地址/密码"提供程序
5. 点击"保存"

#### 2.3 创建Firestore数据库
1. 进入"Firestore Database"
2. 点击"创建数据库"
3. 选择"以测试模式启动"（或生产模式）
4. 选择数据库位置（推荐选择距离您较近的区域）

#### 2.4 配置安全规则
在Firestore Database的"规则"标签页中，设置以下规则：
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 用户只能访问自己的数据
    match /users/{userId}/prompts/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

#### 2.5 获取配置信息
1. 进入"项目设置"（齿轮图标）
2. 滚动到"您的应用"部分
3. 如果还没有Web应用，点击"添加应用" > Web图标
4. 给应用起个名字，点击"注册应用"
5. 复制`firebaseConfig`对象的内容

#### 2.6 配置本地文件
1. 复制配置模板：
   ```bash
   cp firebase-config.js.template firebase-config.js
   ```
2. 编辑`firebase-config.js`文件，填入步骤2.5获取的配置：
   ```javascript
   const firebaseConfig = {
     apiKey: "你的-api-key",
     authDomain: "你的项目.firebaseapp.com",
     projectId: "你的项目-id",
     storageBucket: "你的项目.appspot.com",
     messagingSenderId: "你的发送者ID",
     appId: "你的app-id"
   };
   ```

### ✅ 第3步: 验证配置

1. **重新加载扩展**
   - 在`chrome://extensions/`页面找到"Prompt魔法书"
   - 点击刷新按钮🔄

2. **验证本地模式**
   - 点击扩展图标，应用应该正常打开
   - 尝试添加一个测试Prompt

3. **验证云同步模式**（如果配置了Firebase）
   - 应用顶部显示邮箱登录选项
   - 尝试注册新账户或登录现有账户
   - 登录成功后显示用户邮箱和"云同步已启用"

### 🎯 第4步: 开始使用

- **本地模式**: 直接使用，数据保存在本地Chrome存储
- **云同步模式**: 注册/登录账户，享受多设备数据同步

## 🔧 故障排除

### 常见问题

#### Q: 扩展加载后出现错误"找不到firebase"
**A**: 您需要下载Firebase SDK文件，请回到第1步第2小节

#### Q: 登录按钮不显示
**A**: 检查以下几点：
1. 确认`firebase-config.js`文件存在且配置正确
2. 在`chrome://extensions/`页面重新加载扩展
3. 按F12查看控制台错误信息

#### Q: 登录失败"配置不完整"
**A**: 检查`firebase-config.js`中的配置是否正确：
1. `projectId`是否匹配Firebase项目
2. `apiKey`是否正确
3. Authentication是否已启用邮箱登录

#### Q: 数据没有同步到云端
**A**: 检查以下几点：
1. 确认已成功登录（顶部显示邮箱）
2. 检查网络连接
3. 查看浏览器控制台是否有错误信息
4. 确认Firestore安全规则配置正确

#### Q: 多设备数据冲突
**A**: 应用会自动处理冲突：
- 以最新修改时间为准
- 不会删除任何数据，只会合并
- 如有问题，可以导出数据备份

### 获取帮助

如果遇到其他问题：
1. 查看浏览器控制台错误信息（F12 > Console）
2. 在GitHub Issues中搜索类似问题
3. 提交新的Issue，并附上错误信息

## 📋 功能说明

### 数据同步逻辑
1. **首次登录**: 从云端拉取数据，与本地数据智能合并
2. **离线使用**: 本地新增数据，登录后自动同步到云端
3. **多设备**: 以最新修改时间为准，保留所有数据
4. **冲突处理**: 本地和云端数据合并，不会丢失任何内容

### 同步策略示例
```
场景: 离线时本地1个Prompt，云端10个Prompt
结果: 登录后本地显示11个Prompt（1+10，全部保留）

场景: 同一Prompt在两端都有修改  
结果: 保留修改时间较新的版本
```

## 🛠️ 技术架构

### 模块化设计
- **localStore.js**: 本地数据管理，Chrome Storage API
- **cloudSync.js**: 云端同步，双向数据传输
- **main.js**: UI逻辑和事件处理

### 数据结构
```javascript
{
  id: string,           // 唯一标识
  text: string,         // Prompt内容  
  tags: string[],       // 标签数组
  copyCount: number,    // 复制次数
  createdAt: timestamp, // 创建时间
  updatedAt: timestamp, // 更新时间
  userId: string,       // 用户ID
  syncStatus: string    // 同步状态: local/pending/synced
}
```

## 📁 项目结构

```
Prompt_Magic_Book/
├── 核心文件
│   ├── manifest.json           # Chrome扩展配置
│   ├── index.html              # 主界面
│   ├── style.css               # 样式文件
│   ├── main.js                 # 主逻辑
│   ├── localStore.js           # 本地存储模块
│   └── cloudSync.js            # 云端同步模块
├── Firebase相关
│   ├── firebase-*.js           # Firebase SDK文件（需下载）
│   ├── firebase-config.js      # 实际配置（需创建）
│   └── firebase-config.js.template  # 配置模板
├── 工具脚本
│   ├── download-firebase-sdk.ps1   # Windows下载脚本
│   └── download-firebase-sdk.sh    # Linux/macOS下载脚本
├── 文档
│   ├── README.md               # 说明文档
│   ├── KEY_LEARNINGS.md        # 关键经验
│   └── GITHUB_RELEASE_GUIDE.md # 发布指南
└── 配置文件
    ├── .gitignore              # Git忽略文件
    └── manifest.dev.json       # 开发配置
```

## 🔒 隐私与安全

- **本地优先**: 数据首先存储在本地Chrome存储
- **用户隔离**: Firebase规则确保用户数据完全隔离
- **配置安全**: 敏感配置文件不会上传到Git
- **离线可用**: 网络问题不影响基础功能
- **数据加密**: 云端数据传输和存储都经过加密

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 更新日志

### v2.0 (当前版本)
- ✅ 双向云端同步
- ✅ 邮箱密码认证
- ✅ 智能数据合并
- ✅ 模块化架构重构
- ✅ 本地优先策略

### v1.2 (历史版本)
- 基础Prompt管理
- 标签系统
- 本地存储
- 数据导入导出

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

感谢所有为这个项目贡献代码和想法的开发者们！

---

**Prompt魔法书 v2.0** - 让AI提示词管理更加高效！ 🚀

