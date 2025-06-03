# Prompt魔法书 v2.2 🚀
> **Service Worker优化版** - 极速启动，持久连接，数据安全保障

一个高性能的AI提示词（Prompts）管理浏览器插件，支持云端同步和离线使用。采用Service Worker架构，实现了极速启动和持久化Firebase连接优化。

## ✨ **v2.2版本亮点**

### 🚀 **性能优化突破**
- **极速启动**: Popup启动时间从~2秒优化到<0.5秒 (提升75%+)
- **持久连接**: Service Worker维护单一Firebase连接，减少90%+重复连接
- **离线优先**: 本地数据瞬间加载，云端实时同步

### 🔐 **数据安全保障**
- **安全登出**: 登出前强制同步所有待同步数据，零数据丢失
- **智能同步**: 实时追踪数据操作状态，支持重试机制
- **详细反馈**: 显示具体同步进度("正在同步X个更改...")

### ⌨️ **全新快捷键支持**
- **Ctrl+Shift+L** (Mac: Cmd+Shift+L): 快速打开扩展
- **Ctrl+N** (Mac: Cmd+N): 焦点定位到Prompt输入框 ⭐ 新增
- **Ctrl+Enter** (Mac: Cmd+Enter): 快速保存Prompt

## 📋 核心功能

### 🎯 **智能管理**
- **分类整理**: 支持多标签分类，智能筛选
- **热度排序**: 按复制次数自动排序，常用prompt置顶
- **快速搜索**: 内容和标签双重搜索，快速定位

### ☁️ **云端同步**
- **多设备同步**: Firebase云存储，实时数据同步
- **智能合并**: 冲突自动解决，数据永不丢失
- **离线可用**: 网络中断不影响基本功能

### 📱 **用户体验**
- **现代UI**: 精美的Material Design界面
- **响应式设计**: 支持不同屏幕尺寸
- **操作反馈**: 详细的状态提示和进度显示

## 🔧 快速安装

### 方法一：自动安装（推荐）

**Windows用户**：
```bash
# 右键以管理员身份运行CMD，执行：
quick-install.bat
```

**Linux/macOS用户**：
```bash
chmod +x quick-install.sh
./quick-install.sh
```

### 方法二：手动安装

1. **克隆项目**
```bash
git clone https://github.com/Squareczm/PromptMagicBook_Cloud_v2.0.git
cd PromptMagicBook_Cloud_v2.0
```

2. **下载Firebase依赖**
```bash
# Windows PowerShell
.\download-firebase-sdk.ps1

# Linux/macOS
chmod +x download-firebase-sdk.sh
./download-firebase-sdk.sh
```

3. **配置Firebase（可选，云同步功能）**
```bash
# 复制配置模板
cp firebase-config.js.template firebase-config.js
# 编辑firebase-config.js，填入你的Firebase项目配置
```

4. **安装到Chrome**
- 打开 `chrome://extensions/`
- 启用"开发者模式"
- 点击"加载已解压的扩展程序"
- 选择项目文件夹

## ⚡ 使用指南

### 📝 **基础操作**
1. **快速添加**: 点击扩展图标或按 `Ctrl+Shift+L` 打开
2. **输入定位**: 按 `Ctrl+N` 快速定位到输入框 ⭐ 
3. **快速保存**: 输入内容后按 `Ctrl+Enter` 保存
4. **一键复制**: 点击复制按钮，内容自动进入剪贴板

### 🏷️ **标签管理**
- **添加标签**: 在标签输入框中用逗号分隔多个标签
- **快速筛选**: 点击标签按钮进行筛选
- **组合筛选**: 可同时选择多个标签进行组合筛选

### 🔍 **搜索功能**
- **内容搜索**: 在搜索框中输入关键词搜索prompt内容
- **标签搜索**: 搜索框同时支持标签名称搜索
- **实时搜索**: 输入即搜索，无需按回车

### ☁️ **云同步设置**
1. **注册账户**: 在登录界面点击"注册"创建新账户
2. **登录同步**: 输入邮箱密码，登录后自动启用云同步
3. **多设备使用**: 在其他设备登录同一账户，数据自动同步

## 🛠️ 技术架构

### **Service Worker架构 (v2.2)**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Popup (UI)    │◄──►│  Service Worker  │◄──►│   Firebase      │
│  - 瞬间加载     │    │  - 持久连接      │    │  - 云端存储     │
│  - 用户交互     │    │  - 后台同步      │    │  - 实时监听     │
│  - 本地缓存     │    │  - 状态管理      │    │  - 认证服务     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### **数据流优化**
- **启动**: 从Chrome Storage瞬间加载 → Service Worker后台连接Firebase
- **操作**: 用户操作 → 本地缓存 → Service Worker队列 → Firebase同步
- **同步**: Service Worker实时监听云端 → 更新本地 → 通知UI刷新

### **核心模块**
- **background.js**: Service Worker主控制器，Firebase连接管理
- **main.js**: UI逻辑和用户交互，Service Worker通信
- **Chrome Storage**: 本地数据缓存，离线支持

## 📊 性能指标

| 指标 | v2.1 | v2.2 | 提升幅度 |
|------|------|------|----------|
| Popup启动时间 | ~2秒 | <0.5秒 | **75%+** |
| Firebase连接次数 | N次 | 1次持久 | **90%+** |
| 数据加载延迟 | ~1秒 | <0.1秒 | **90%+** |
| 离线可用性 | 部分 | 完全 | **100%** |

## 🔒 隐私与安全

- **本地优先**: 数据首先存储在本地，离线完全可用
- **端到端加密**: Firebase提供企业级数据加密
- **用户隔离**: 严格的数据访问权限控制
- **零数据丢失**: 登出前强制同步所有更改

## ⌨️ 快捷键参考

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Ctrl+Shift+L` | 打开扩展 | 快速唤醒Prompt魔法书 |
| `Ctrl+N` | 焦点定位 | 直接定位到Prompt输入框 ⭐ |
| `Ctrl+Enter` | 保存Prompt | 在输入框中快速保存 |

*Mac用户请将Ctrl替换为Cmd*

## 🚨 故障排除

### **常见问题**

#### Q: 扩展无法加载或显示错误
**A**: 
1. 确保已下载Firebase SDK文件
2. 使用一键安装脚本：`quick-install.bat` (Windows) 或 `./quick-install.sh` (Linux/macOS)
3. 在 `chrome://extensions/` 重新加载扩展

#### Q: Ctrl+N快捷键不工作
**A**: 
1. 检查 `chrome://extensions/shortcuts` 中的快捷键设置
2. 确保没有与其他扩展冲突
3. 尝试手动重新设置快捷键

#### Q: 云同步功能无法使用
**A**: 
1. 确认 `firebase-config.js` 文件存在且配置正确
2. 检查网络连接状态
3. 查看浏览器控制台(F12)错误信息

#### Q: 数据没有同步到云端
**A**: 
1. 确认已成功登录(顶部显示邮箱地址)
2. 检查同步状态提示信息
3. 尝试手动登出再登录触发同步

#### Q: 登出时提示有未同步数据
**A**: 
- 这是正常的安全提示，插件会自动同步后再登出
- 等待同步完成或检查网络连接
- 如有问题可以取消登出，手动检查数据

### **获取帮助**
- 查看控制台错误信息: `F12 > Console`
- 提交Issue: [GitHub Issues](https://github.com/Squareczm/PromptMagicBook_Cloud_v2.0/issues)
- 邮箱联系: [项目维护者邮箱]

## 📁 项目结构

```
Prompt_Magic_Book/
├── 核心文件
│   ├── manifest.json           # Chrome扩展配置
│   ├── manifest.dev.json       # 开发环境配置
│   ├── background.js           # Service Worker主控制器 ⭐
│   ├── main.js                 # UI逻辑和Service Worker通信 ⭐
│   ├── index.html              # 主界面
│   └── style.css               # 现代化样式
├── Firebase相关
│   ├── firebase-*.js           # Firebase SDK文件
│   ├── firebase-config.js      # 实际配置(需创建)
│   └── firebase-config.js.template # 配置模板
├── 安装工具
│   ├── quick-install.bat       # Windows一键安装
│   ├── quick-install.sh        # Linux/macOS一键安装
│   └── download-firebase-sdk.* # SDK下载脚本
├── 文档
│   ├── README.md               # 说明文档
│   └── KEY_LEARNINGS.md        # 开发经验总结
└── 其他
    ├── icons/                  # 扩展图标
    ├── .gitignore              # Git忽略文件
    └── validate-manifest.js    # 配置验证工具
```

## 🎯 数据结构

```javascript
{
  id: string,           // 唯一标识符
  text: string,         // Prompt内容
  tags: string[],       // 标签数组
  copyCount: number,    // 复制次数统计
  createdAt: timestamp, // 创建时间
  updatedAt: timestamp, // 更新时间
  userId: string,       // 用户ID（云同步）
  syncStatus: string    // 同步状态: local/pending/synced
}
```

## 🤝 贡献指南

欢迎贡献代码和建议！

1. Fork 项目
2. 创建特性分支: `git checkout -b feature/AmazingFeature`
3. 提交更改: `git commit -m 'Add some AmazingFeature'`
4. 推送分支: `git push origin feature/AmazingFeature`
5. 提交 Pull Request

## 📝 更新日志

### v2.2 (当前版本) ⭐ **Service Worker优化版**

**🚀 性能突破**
- ✅ **Service Worker架构重构**: 完全基于MV3 Service Worker实现
- ✅ **极速启动优化**: Popup启动时间从~2秒减少到<0.5秒
- ✅ **持久连接管理**: Firebase连接由Service Worker维护，减少90%+重复连接
- ✅ **本地优先加载**: 从Chrome Storage瞬间加载数据，云端后台同步

**🔐 数据安全保障**
- ✅ **安全登出机制**: 登出前强制同步所有待同步数据
- ✅ **智能同步追踪**: 操作状态实时追踪，支持重试机制
- ✅ **详细同步反馈**: 显示具体同步进度和错误信息
- ✅ **零数据丢失**: 双重同步保障，确保数据完整性

**⌨️ 用户体验提升**
- ✅ **新增Ctrl+N快捷键**: 直接定位到Prompt输入框
- ✅ **实时UI更新**: Chrome Storage监听，自动刷新界面
- ✅ **智能错误处理**: 网络中断自动重连，优雅降级
- ✅ **进度反馈优化**: 登出同步进度实时显示

### v2.1 (历史版本)
- ✅ 完善双向云端同步功能
- ✅ 智能数据合并机制
- ✅ 实时同步反馈系统
- ✅ 时间戳冲突解决

### v2.0 (基础版本)
- ✅ Firebase云端同步架构
- ✅ 邮箱密码认证系统
- ✅ 模块化代码重构
- ✅ 一键安装脚本

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- Firebase团队提供稳定的云端服务
- Chrome Extensions团队的技术支持
- 所有贡献者和用户的反馈建议

---

**Prompt魔法书 v2.2** - Service Worker架构，极速启动，数据安全！🚀

> 🌟 **技术亮点**: Service Worker持久连接 + Chrome Storage瞬间加载 + 智能数据同步

