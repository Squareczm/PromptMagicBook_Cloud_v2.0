#!/bin/bash

# Prompt魔法书 v2.0 - Firebase SDK下载脚本
# 用于自动下载项目所需的Firebase SDK文件 (Linux/macOS版本)

echo "=== Firebase SDK 下载脚本 ==="
echo "正在为Prompt魔法书 v2.0下载Firebase SDK文件..."

# Firebase SDK版本
FIREBASE_VERSION="10.7.1"
BASE_URL="https://www.gstatic.com/firebasejs/$FIREBASE_VERSION"

# 需要下载的文件列表
declare -a FILES=(
    "firebase-app-compat.js:Firebase App Core (约29KB)"
    "firebase-auth-compat.js:Firebase Authentication (约136KB)"
    "firebase-firestore-compat.js:Firebase Firestore (约340KB)"
)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# 检查网络连接
echo -e "\n${BLUE}检查网络连接...${NC}"
if ! ping -c 1 -W 5 www.gstatic.com > /dev/null 2>&1; then
    echo -e "${RED}❌ 网络连接失败，无法连接到Firebase CDN${NC}"
    echo -e "${YELLOW}请检查网络连接后重试${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 网络连接正常${NC}"

# 检查必需工具
if ! command -v curl > /dev/null 2>&1; then
    echo -e "${RED}❌ 未找到curl命令，请安装后重试${NC}"
    exit 1
fi

# 下载文件
echo -e "\n${BLUE}开始下载Firebase SDK文件...${NC}"

SUCCESS_COUNT=0
TOTAL_FILES=${#FILES[@]}

for file_info in "${FILES[@]}"; do
    IFS=':' read -r filename description <<< "$file_info"
    
    echo -e "\n${CYAN}正在下载: $description${NC}"
    
    # 如果文件已存在，询问是否覆盖
    if [ -f "$filename" ]; then
        echo -n "文件 $filename 已存在，是否覆盖？(y/N): "
        read -r overwrite
        if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}⏭️  跳过 $filename${NC}"
            ((SUCCESS_COUNT++))
            continue
        fi
    fi
    
    # 显示下载地址
    download_url="$BASE_URL/$filename"
    echo -e "  ${GRAY}下载地址: $download_url${NC}"
    
    # 下载文件
    if curl -L -s -o "$filename" "$download_url"; then
        # 验证文件
        if [ -f "$filename" ] && [ -s "$filename" ]; then
            file_size=$(stat -c%s "$filename" 2>/dev/null || stat -f%z "$filename" 2>/dev/null)
            file_size_kb=$((file_size / 1024))
            echo -e "${GREEN}✅ $filename 下载成功 ($file_size_kb KB)${NC}"
            ((SUCCESS_COUNT++))
        else
            echo -e "${RED}❌ $filename 下载失败: 文件为空或不存在${NC}"
            rm -f "$filename"  # 删除空文件
        fi
    else
        echo -e "${RED}❌ $filename 下载失败: curl错误${NC}"
    fi
done

# 下载结果统计
echo -e "\n=== 下载完成 ==="
if [ $SUCCESS_COUNT -eq $TOTAL_FILES ]; then
    echo -e "${GREEN}成功: $SUCCESS_COUNT / $TOTAL_FILES 个文件${NC}"
    echo -e "${GREEN}🎉 所有Firebase SDK文件下载完成！${NC}"
    echo -e "\n${BLUE}下一步:${NC}"
    echo -e "${NC}1. 复制 firebase-config.js.template 为 firebase-config.js${NC}"
    echo -e "${NC}2. 编辑 firebase-config.js 填入您的Firebase项目配置${NC}"
    echo -e "${NC}3. 在Chrome中加载扩展进行测试${NC}"
else
    echo -e "${YELLOW}成功: $SUCCESS_COUNT / $TOTAL_FILES 个文件${NC}"
    echo -e "${YELLOW}⚠️  部分文件下载失败，请检查网络连接后重试${NC}"
    exit 1
fi

echo -e "\n${GREEN}脚本执行完成！${NC}" 