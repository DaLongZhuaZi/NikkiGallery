#!/bin/bash

echo "========================================"
echo "NikkiGallery Development Server Launcher"
echo "========================================"
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "[1/4] Installing server dependencies..."
cd "$PROJECT_DIR/server"
npm install
if [ $? -ne 0 ]; then
    echo "Error: Failed to install server dependencies"
    exit 1
fi

echo ""
echo "[2/4] Initializing database..."
npm run db:migrate
npm run db:seed

echo ""
echo "[3/4] Installing client dependencies..."
cd "$PROJECT_DIR/client"
npm install
if [ $? -ne 0 ]; then
    echo "Error: Failed to install client dependencies"
    exit 1
fi

echo ""
echo "[4/4] Starting development servers..."
echo ""
echo "Starting server on http://localhost:4000"
echo "Starting client on http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop servers"
echo ""

# 启动后端服务
cd "$PROJECT_DIR/server"
npm run dev &
SERVER_PID=$!

# 等待后端启动
sleep 3

# 启动前端服务
cd "$PROJECT_DIR/client"
npm run dev &
CLIENT_PID=$!

echo ""
echo "========================================"
echo "Development servers started!"
echo "- Client: http://localhost:3000"
echo "- Server: http://localhost:4000"
echo "========================================"

# 捕获Ctrl+C
trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit 0" INT TERM

# 等待进程结束
wait