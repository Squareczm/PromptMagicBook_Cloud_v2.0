# Prompt魔法书 v2.0 📖

> 支持完整双向云端同步的AI提示词管理工具

## ✨ 主要特性

### 🔄 **完整双向云端同步** ⭐ NEW!
- **智能合并策略**: 云端数据 + 本地数据 = 完整保留，零数据丢失
- **时间戳冲突解决**: 自动选择最新修改版本，确保数据一致性
- **本地优先体验**: 离线状态下完整功能可用，登录后自动同步
- **实时状态反馈**: 详细的同步进度提示和结果展示
- **登录即同步**: 用户登录时自动执行双向数据合并

### 🔐 **简便安全认证**
- **邮箱密码登录**: 无需Google账号，简单快捷的认证方式
- **用户数据隔离**: 每个用户数据完全独立，Firebase安全规则保护
- **本地模式降级**: 未登录状态下本地功能完全正常使用

### 📊 **智能管理系统**
- **标签分类系统**: 灵活的多标签分类和智能筛选
- **使用频率统计**: 基于复制次数的智能排序，常用内容优先显示
- **全文搜索功能**: 支持内容和标签的实时搜索过滤
- **数据导入导出**: 完整的JSON/TXT格式数据备份和迁移

### ⌨️ **高效快捷操作**
- **全局快捷唤醒**: `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`) 快速打开
- **快速保存**: `Ctrl+Enter` (Mac: `Cmd+Enter`) 在输入框中快速保存
- **键盘友好**: 支持完整的键盘快捷键操作

## 🚀 快速开始

### 🎯 方法1: 一键安装（推荐）

**Windows系统:**
```cmd
# 下载项目后，在项目目录下运行
quick-install.bat
```

**Linux/macOS系统:**
```bash
# 下载项目后，在项目目录下运行
chmod +x quick-install.sh
./quick-install.sh
```

一键安装脚本将自动完成：
- ✅ 检查必需文件
- ✅ 下载Firebase SDK依赖
- ✅ 创建配置文件模板
- ✅ 显示Chrome扩展安装指导

### 📦 方法2: 手动安装

#### 第1步: 下载和安装

1. **下载项目文件**
   - 克隆或下载本项目到本地文件夹

2. **下载Firebase SDK文件**（必需步骤！）
   
   **自动下载脚本:**
   ```powershell
   # Windows PowerShell
   .\download-firebase-sdk.ps1
   ```
   ```bash
   # Linux/macOS
   chmod +x download-firebase-sdk.sh
   ./download-firebase-sdk.sh
   ```
   
   **手动下载:**
   下载以下文件到项目根目录：
   - [firebase-app-compat.js](https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js)
   - [firebase-auth-compat.js](https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js)
   - [firebase-firestore-compat.js](https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js)

3. **安装Chrome扩展**
   1. 在Chrome中打开 `chrome://extensions/`
   2. 开启"开发者模式"（右上角开关）
   3. 点击"加载已解压的扩展程序"
   4. 选择项目文件夹

#### 第2步: 配置Firebase（可选 - 启用云同步）

> **注意**: 如果跳过此步骤，应用将以本地模式运行，所有功能正常可用

##### 2.1 创建Firebase项目
1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 点击"创建项目"或选择现有项目
3. 按提示完成项目创建

##### 2.2 启用Authentication
1. 在Firebase Console中，进入"Authentication"
2. 点击"开始使用"
3. 进入"Sign-in method"标签页
4. 启用"电子邮件地址/密码"提供程序
5. 点击"保存"

##### 2.3 创建Firestore数据库
1. 进入"Firestore Database"
2. 点击"创建数据库"
3. 选择"以测试模式启动"（或生产模式）
4. 选择数据库位置（推荐选择距离您较近的区域）

##### 2.4 配置安全规则
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

##### 2.5 获取配置信息
1. 进入"项目设置"（齿轮图标）
2. 滚动到"您的应用"部分
3. 如果还没有Web应用，点击"添加应用" > Web图标
4. 给应用起个名字，点击"注册应用"
5. 复制`firebaseConfig`对象的内容

##### 2.6 配置本地文件
1. 编辑项目根目录下的`firebase-config.js`文件，填入步骤2.5获取的配置：
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

### ✅ 验证安装

1. **重新加载扩展**
   - 在`chrome://extensions/`页面找到"Prompt魔法书"
   - 点击刷新按钮🔄

2. **验证本地模式**
   - 点击扩展图标，应用应该正常打开
   - 尝试添加一个测试Prompt

3. **验证快捷键**
   - 按 `Ctrl+Shift+L` (Mac: `Cmd+Shift+L`) 快速打开扩展
   - 在输入框中按 `Ctrl+Enter` (Mac: `Cmd+Enter`) 快速保存

4. **验证双向云同步模式**（如果配置了Firebase）
   - 应用顶部显示邮箱登录选项
   - 尝试注册新账户或登录现有账户
   - 登录成功后会显示用户邮箱和"云同步已启用，数据已同步"
   - 查看同步结果："数据合并完成！云端 X 个 + 本地 Y 个 = 共 Z 个提示词"

## ⌨️ 快捷键说明

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Ctrl+Shift+P` | 打开扩展 | 快速唤醒Prompt魔法书 (Mac: `Cmd+Shift+P`) |
| `Ctrl+Enter` | 保存Prompt | 在输入框中快速保存当前内容 (Mac: `Cmd+Enter`) |

## 🔧 故障排除

### 常见问题

#### Q: 扩展加载后出现错误"找不到firebase"
**A**: 您需要下载Firebase SDK文件，请使用一键安装脚本或手动下载依赖文件

#### Q: 云端数据没有同步到本地
**A**: 检查以下几点：
1. 确认已成功登录（顶部显示邮箱地址）
2. 查看控制台是否显示同步进度日志
3. 登录成功后应显示"数据合并完成"的提示信息
4. 如果云端有数据，会自动与本地数据智能合并

#### Q: 快捷键不工作
**A**: 检查以下几点：
1. 确认扩展已正确安装并启用
2. 在Chrome扩展管理页面检查快捷键设置：`chrome://extensions/shortcuts`
3. 确保快捷键没有与其他扩展或系统快捷键冲突

#### Q: 一键安装脚本执行失败
**A**: 尝试以下解决方案：
1. **Windows**: 确保以管理员权限运行CMD/PowerShell
2. **Linux/macOS**: 确保脚本有执行权限 `chmod +x quick-install.sh`
3. 检查网络连接，脚本需要下载Firebase SDK文件
4. 如果脚本失败，可以使用手动安装方法

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

### 双向数据同步逻辑 ⭐ 核心特性
1. **首次登录**: 从云端拉取数据，与本地数据智能合并，显示详细合并结果
2. **离线使用**: 本地新增数据，登录后自动双向同步到云端
3. **多设备协作**: 以最新修改时间为准，保留所有数据不丢失
4. **冲突智能解决**: 时间戳优先策略，本地和云端数据完美合并
5. **实时反馈**: 详细的同步过程日志和用户友好的提示信息

### 同步策略示例
```
✅ 成功案例1: 离线时本地新增1个Prompt，云端已有10个Prompt
   结果: 登录后显示"数据合并完成！云端 10 个 + 本地 1 个 = 共 11 个提示词"

✅ 成功案例2: 同一Prompt在两端都有修改  
   结果: 自动保留修改时间较新的版本，无数据丢失

✅ 成功案例3: 首次登录的用户
   结果: 云端数据完整同步到本地，立即可用
```

## 🛠️ 技术架构

### 模块化设计
- **localStore.js**: 本地数据管理，Chrome Storage API，向下兼容v1.x数据
- **cloudSync.js**: 双向云端同步，智能数据合并，批量传输优化
- **main.js**: UI逻辑和事件处理，响应式界面更新

### 数据结构
```javascript
{
  id: string,           // 唯一标识
  text: string,         // Prompt内容  
  tags: string[],       // 标签数组
  copyCount: number,    // 复制次数统计
  createdAt: timestamp, // 创建时间
  updatedAt: timestamp, // 更新时间（用于冲突解决）
  userId: string,       // 用户ID（云同步）
  syncStatus: string    // 同步状态: local/pending/synced
}
```

## 📁 项目结构

```
Prompt_Magic_Book/
├── 核心文件
│   ├── manifest.json           # Chrome扩展配置
│   ├── index.html              # 主界面
│   ├── style.css               # 现代化样式
│   ├── main.js                 # 主逻辑和UI处理
│   ├── localStore.js           # 本地存储模块
│   └── cloudSync.js            # 双向云端同步模块 ⭐
├── Firebase相关
│   ├── firebase-*.js           # Firebase SDK文件（需下载）
│   ├── firebase-config.js      # 实际配置（需创建）
│   └── firebase-config.js.template  # 配置模板
├── 安装工具
│   ├── quick-install.bat       # Windows一键安装
│   ├── quick-install.sh        # Linux/macOS一键安装
│   ├── download-firebase-sdk.ps1   # Windows下载脚本
│   └── download-firebase-sdk.sh    # Linux/macOS下载脚本
├── 文档
│   ├── README.md               # 说明文档
│   └── KEY_LEARNINGS.md        # 开发经验总结
└── 配置文件
    ├── .gitignore              # Git忽略文件
    └── manifest.dev.json       # 开发配置
```

## 🔒 隐私与安全

- **本地优先架构**: 数据首先存储在本地Chrome存储，离线完全可用
- **用户数据隔离**: Firebase安全规则确保用户数据完全隔离
- **配置文件安全**: 敏感配置文件不会上传到Git仓库
- **网络容错设计**: 网络问题不影响基础功能使用
- **传输加密**: 云端数据传输和存储都经过HTTPS加密

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 更新日志

### v2.0.1 (当前版本) ⭐ NEW!
- ✅ **完善双向云端同步**: 修复云端数据无法同步到本地的问题
- ✅ **智能数据合并**: 实现云端+本地数据的完美合并
- ✅ **实时同步反馈**: 详细的同步进度和结果提示
- ✅ **UI实时更新**: 同步完成后界面自动刷新显示合并结果
- ✅ **时间戳冲突解决**: 自动选择最新修改版本
- ✅ **登录即同步**: 用户登录时自动触发双向同步流程

### v2.0 (基础版本)
- ✅ 双向云端同步基础架构
- ✅ 邮箱密码认证系统
- ✅ 模块化架构重构
- ✅ 本地优先设计策略
- ✅ 快捷键支持
- ✅ 一键安装脚本

### v1.2 (历史版本)
- 基础Prompt管理功能
- 标签分类系统
- 本地存储
- 数据导入导出

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

感谢所有为这个项目贡献代码和想法的开发者们！

---

**Prompt魔法书 v2.0.1** - 让AI提示词管理更加高效！🚀

> 🌟 **最新亮点**: 完整的双向云端同步，智能数据合并，零数据丢失！

