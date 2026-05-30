#!/bin/bash

echo "========================================"
echo "  NikkiGallery - 智能相册管理系统"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}[错误] 未检测到Node.js，请先安装Node.js 18或更高版本${NC}"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

# 检查Node.js版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}[错误] Node.js版本过低，需要18或更高版本${NC}"
    node -v
    exit 1
fi

echo -e "${GREEN}[信息] Node.js版本检查通过${NC}"
node -v
echo ""

# 安装前端依赖
echo -e "${YELLOW}[1/4] 安装前端依赖...${NC}"
cd "$PROJECT_DIR/client"
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}[错误] 前端依赖安装失败${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}[完成] 前端依赖安装完成${NC}"
echo ""

# 安装后端依赖
echo -e "${YELLOW}[2/4] 安装后端依赖...${NC}"
cd "$PROJECT_DIR/server"
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}[错误] 后端依赖安装失败${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}[完成] 后端依赖安装完成${NC}"
echo ""

# 构建前端
echo -e "${YELLOW}[3/4] 构建前端应用...${NC}"
cd "$PROJECT_DIR/client"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}[错误] 前端构建失败${NC}"
    exit 1
fi
echo -e "${GREEN}[完成] 前端构建完成${NC}"
echo ""

# 复制前端构建到后端
echo -e "${YELLOW}[4/4] 复制前端文件到后端...${NC}"
rm -rf "$PROJECT_DIR/server/public"
cp -r "$PROJECT_DIR/client/dist" "$PROJECT_DIR/server/public"
echo -e "${GREEN}[完成] 前端文件复制完成${NC}"
echo ""

# 创建数据目录
mkdir -p "$PROJECT_DIR/data/db"
mkdir -p "$PROJECT_DIR/data/cache"
mkdir -p "$PROJECT_DIR/data/thumbnails"

# 复制环境变量文件
if [ ! -f "$PROJECT_DIR/server/.env" ]; then
    if [ -f "$PROJECT_DIR/docker/.env.example" ]; then
        cp "$PROJECT_DIR/docker/.env.example" "$PROJECT_DIR/server/.env"
        echo -e "${YELLOW}[信息] 已创建.env文件，请根据需要修改配置${NC}"
    fi
fi

# 启动后端服务
echo ""
echo "========================================"
echo "  正在启动NikkiGallery服务..."
echo "========================================"
echo ""
echo -e "${GREEN}服务启动后，请访问: http://localhost:4000${NC}"
echo "按Ctrl+C停止服务"
echo ""

cd "$PROJECT_DIR/server"
npm start
