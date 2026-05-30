@echo off
chcp 65001 >nul 2>&1
title NikkiGallery Manager
echo ========================================
echo   NikkiGallery 智能相册管理系统
echo ========================================
echo.
echo 正在启动管理面板...
echo.

cd /d "%~dp0desktop"

:: 检查 node_modules
if not exist "node_modules" (
  echo 首次运行，正在安装依赖...
  call npm install
  echo.
)

:: 启动管理面板
node server.js

pause
