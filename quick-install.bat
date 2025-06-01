@echo off
chcp 65001
echo ========================================
echo   Prompt魔法书 v2.0 快速安装脚本
echo ========================================
echo.

echo [1/3] 正在检查必需文件...
if not exist "manifest.json" (
    echo ❌ 错误: 未找到 manifest.json 文件
    echo 请确保在正确的项目目录下运行此脚本
    pause
    exit /b 1
)

echo [2/3] 正在下载 Firebase SDK 文件...
echo 这可能需要几分钟，请耐心等待...

powershell -ExecutionPolicy Bypass -File "download-firebase-sdk.ps1"

if %ERRORLEVEL% neq 0 (
    echo ❌ Firebase SDK 下载失败
    echo 请检查网络连接或手动下载
    pause
    exit /b 1
)

echo [3/3] 正在创建配置模板...
if not exist "firebase-config.js" (
    copy "firebase-config.js.template" "firebase-config.js"
    echo ✅ 已创建 firebase-config.js 配置文件
    echo ⚠️  请编辑此文件填入您的 Firebase 配置信息
) else (
    echo ✅ 配置文件已存在
)

echo.
echo ========================================
echo           安装完成！
echo ========================================
echo.
echo 下一步操作:
echo 1. 在 Chrome 中打开 chrome://extensions/
echo 2. 开启"开发者模式"
echo 3. 点击"加载已解压的扩展程序"
echo 4. 选择当前文件夹
echo.
echo 如需云同步功能:
echo 请编辑 firebase-config.js 文件填入 Firebase 配置
echo.
echo 更多信息请参阅 README.md
echo.
pause 