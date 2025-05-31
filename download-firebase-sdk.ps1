# Prompt魔法书 v2.0 - Firebase SDK下载脚本
# 用于自动下载项目所需的Firebase SDK文件

Write-Host "=== Firebase SDK 下载脚本 ===" -ForegroundColor Green
Write-Host "正在为Prompt魔法书 v2.0下载Firebase SDK文件..." -ForegroundColor Yellow

# Firebase SDK版本
$FirebaseVersion = "10.7.1"
$BaseUrl = "https://www.gstatic.com/firebasejs/$FirebaseVersion"

# 需要下载的文件列表
$Files = @(
    @{
        Name = "firebase-app-compat.js"
        Url = "$BaseUrl/firebase-app-compat.js"
        Description = "Firebase App Core (约29KB)"
    },
    @{
        Name = "firebase-auth-compat.js"
        Url = "$BaseUrl/firebase-auth-compat.js"
        Description = "Firebase Authentication (约136KB)"
    },
    @{
        Name = "firebase-firestore-compat.js"
        Url = "$BaseUrl/firebase-firestore-compat.js"
        Description = "Firebase Firestore (约340KB)"
    }
)

# 检查网络连接
Write-Host "`n检查网络连接..." -ForegroundColor Blue
try {
    $testConnection = Test-NetConnection -ComputerName "www.gstatic.com" -Port 443 -InformationLevel Quiet
    if (-not $testConnection) {
        throw "无法连接到Firebase CDN"
    }
    Write-Host "✅ 网络连接正常" -ForegroundColor Green
} catch {
    Write-Host "❌ 网络连接失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "请检查网络连接后重试" -ForegroundColor Yellow
    exit 1
}

# 下载文件
Write-Host "`n开始下载Firebase SDK文件..." -ForegroundColor Blue

$SuccessCount = 0
$TotalFiles = $Files.Count

foreach ($File in $Files) {
    Write-Host "`n正在下载: $($File.Description)" -ForegroundColor Cyan
    
    try {
        # 如果文件已存在，询问是否覆盖
        if (Test-Path $File.Name) {
            $overwrite = Read-Host "文件 $($File.Name) 已存在，是否覆盖？(y/N)"
            if ($overwrite -ne 'y' -and $overwrite -ne 'Y') {
                Write-Host "⏭️  跳过 $($File.Name)" -ForegroundColor Yellow
                $SuccessCount++
                continue
            }
        }
        
        # 显示下载进度
        $ProgressPreference = 'SilentlyContinue'  # 隐藏默认进度条
        Write-Host "  下载地址: $($File.Url)" -ForegroundColor Gray
        
        # 下载文件
        Invoke-WebRequest -Uri $File.Url -OutFile $File.Name -UseBasicParsing
        
        # 验证文件
        if (Test-Path $File.Name) {
            $FileSize = (Get-Item $File.Name).Length
            $FileSizeKB = [math]::Round($FileSize / 1024, 1)
            Write-Host "✅ $($File.Name) 下载成功 ($FileSizeKB KB)" -ForegroundColor Green
            $SuccessCount++
        } else {
            throw "文件下载后未找到"
        }
        
    } catch {
        Write-Host "❌ $($File.Name) 下载失败: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 下载结果统计
Write-Host "`n=== 下载完成 ===" -ForegroundColor Green
Write-Host "成功: $SuccessCount / $TotalFiles 个文件" -ForegroundColor $(if ($SuccessCount -eq $TotalFiles) { 'Green' } else { 'Yellow' })

if ($SuccessCount -eq $TotalFiles) {
    Write-Host "🎉 所有Firebase SDK文件下载完成！" -ForegroundColor Green
    Write-Host "`n下一步:" -ForegroundColor Blue
    Write-Host "1. 复制 firebase-config.js.template 为 firebase-config.js" -ForegroundColor White
    Write-Host "2. 编辑 firebase-config.js 填入您的Firebase项目配置" -ForegroundColor White
    Write-Host "3. 在Chrome中加载扩展进行测试" -ForegroundColor White
} else {
    Write-Host "⚠️  部分文件下载失败，请检查网络连接后重试" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n脚本执行完成！" -ForegroundColor Green 