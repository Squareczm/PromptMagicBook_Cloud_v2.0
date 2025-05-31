# GitHub发布准备指南

## 📋 发布前检查清单

### 🔒 敏感文件处理

#### 必须排除的文件
以下文件包含敏感信息，绝对不能提交到GitHub：

- ✅ `firebase-config.js` - 包含真实Firebase项目配置和API密钥
- ✅ `manifest.dev.json` - 包含开发环境的OAuth配置

#### 大文件处理
以下文件较大但不含敏感信息，已排除以减少仓库大小：

- ✅ `firebase-app-compat.js` (~29KB)
- ✅ `firebase-auth-compat.js` (~136KB)  
- ✅ `firebase-firestore-compat.js` (~340KB)

**替代方案**: 提供自动化下载脚本让用户获取这些文件

### 🎯 .gitignore配置验证

当前`.gitignore`文件已正确配置：

```bash
# Firebase配置文件 - 包含敏感信息，不推送到仓库
firebase-config.js

# Firebase SDK文件 - 第三方依赖，文件较大（总计~500KB）
# 用户需要手动下载或使用自动化脚本下载
firebase-app-compat.js
firebase-auth-compat.js
firebase-firestore-compat.js

# 开发版manifest文件 - 包含真实OAuth配置
manifest.dev.json
```

---

## 🚀 发布准备步骤

### 1. 文件完整性检查

确保以下文件已包含在版本控制中：

#### 核心文件
- ✅ `index.html` - 主界面
- ✅ `main.js` - 核心逻辑
- ✅ `style.css` - 样式文件
- ✅ `manifest.json` - 扩展配置

#### 配置模板
- ✅ `firebase-config.js.template` - Firebase配置模板

#### 文档文件
- ✅ `README.md` - 项目说明
- ✅ `REQUIREMENTS.md` - 安装依赖指南
- ✅ `development_v2.0.md` - 开发文档
- ✅ `KEY_LEARNINGS.md` - 经验教训总结
- ✅ `TESTING_GUIDE.md` - 测试指南

#### 自动化脚本
- ✅ `download-firebase-sdk.ps1` - Windows下载脚本
- ✅ `download-firebase-sdk.sh` - Linux/macOS下载脚本

#### 辅助文件
- ✅ `.gitignore` - Git忽略配置
- ✅ `setup-dev.bat` / `setup-dev.sh` - 开发环境设置脚本

### 2. 敏感信息清理

#### 检查文件内容
运行以下命令检查是否存在敏感信息：

```bash
# 检查是否有API密钥泄露
grep -r "AIza" --exclude-dir=.git .
grep -r "1:" --exclude-dir=.git .
grep -r "firebase" --exclude-dir=.git . | grep -i "api"

# 检查是否有firebase-config.js被意外包含
find . -name "firebase-config.js" -not -path "./.git/*"
```

#### 确认排除状态
```bash
# 确认敏感文件不在Git追踪中
git status --ignored
git ls-files --cached | grep -E "(firebase-config\.js|firebase-.*-compat\.js)"
```

### 3. 用户体验验证

#### 新用户流程测试
1. 克隆空仓库到新目录
2. 运行自动化下载脚本
3. 按照README进行配置
4. 验证插件可以正常加载和使用

#### 脚本功能验证
```bash
# 测试PowerShell脚本
.\download-firebase-sdk.ps1

# 测试Bash脚本  
chmod +x download-firebase-sdk.sh
./download-firebase-sdk.sh
```

---

## 📝 发布说明模板

### v2.0 发布说明

**🎉 重大更新：云端同步功能**

#### 新增功能
- ✨ **邮箱密码认证**: 简单可靠的用户认证系统
- ☁️ **云端同步**: 多设备间Prompt数据同步
- 🔧 **配置外部化**: Firebase配置独立管理
- 📱 **本地优先**: 未登录状态完整功能可用

#### 技术改进
- 🔥 **自动化脚本**: 一键下载Firebase SDK依赖
- 🛡️ **安全增强**: 敏感配置文件管理优化
- 📚 **文档完善**: 详细的安装和配置指南
- 🧪 **测试覆盖**: 完整的功能测试和验证流程

#### 安装说明
1. 克隆项目：`git clone <repository-url>`
2. 下载依赖：运行 `download-firebase-sdk.ps1` 或 `download-firebase-sdk.sh`
3. 配置Firebase（可选）：复制并编辑 `firebase-config.js.template`
4. 加载扩展：在Chrome中加载项目文件夹

#### 升级指南
- v1.x用户数据自动升级，无需手动迁移
- 新增云同步功能，可选择性使用
- 本地功能保持完全兼容

---

## 🔍 发布前最终检查

### Git状态检查
```bash
# 确认没有敏感文件被追踪
git status
git ls-files | grep -E "(firebase-config\.js|.*\.key|.*\.secret)"

# 确认.gitignore正常工作
git check-ignore firebase-config.js
git check-ignore firebase-app-compat.js
```

### 文件大小检查
```bash
# 检查仓库大小
du -sh .git
git count-objects -vH

# 如果仓库过大，可能有大文件被误提交
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | sed -n 's/^blob //p' | sort --numeric-sort --key=2 | tail -10
```

### 功能验证
- [ ] README中的安装步骤准确无误
- [ ] 自动化脚本在Windows/Linux/macOS上正常工作
- [ ] 不含Firebase配置时插件可以正常加载（本地模式）
- [ ] 包含Firebase配置时认证功能正常工作
- [ ] 所有文档链接有效，格式正确

---

## ✅ 发布完成后

### 仓库设置
1. 设置仓库为公开（如果需要）
2. 添加适当的标签和发布说明
3. 创建Release标签，上传必要的附件

### 用户支持
1. 监控Issues中的用户反馈
2. 及时回应安装和配置问题
3. 收集功能改进建议

### 持续维护
1. 定期检查Firebase SDK版本更新
2. 维护自动化脚本的有效性
3. 更新文档以反映最新变化

---

*发布前请仔细检查每一项，确保用户获得最佳体验！* 🌟 