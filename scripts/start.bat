@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   NikkiGallery - 智能相册管理系统
echo ========================================
echo.

:: 检查Node.js是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到Node.js，请先安装Node.js 18或更高版本
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

:: 检查Node.js版本
for /f "tokens=1 delims=." %%a in ('node -v') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:v=%
if %NODE_VERSION% lss 18 (
    echo [错误] Node.js版本过低，需要18或更高版本
    node -v
    pause
    exit /b 1
)

echo [信息] Node.js版本检查通过
node -v
echo.

:: 安装前端依赖
echo [1/4] 安装前端依赖...
cd /d "%~dp0..\client"
if not exist "node_modules" (
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 前端依赖安装失败
        pause
        exit /b 1
    )
)
echo [完成] 前端依赖安装完成
echo.

:: 安装后端依赖
echo [2/4] 安装后端依赖...
cd /d "%~dp0..\server"
if not exist "node_modules" (
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 后端依赖安装失败
        pause
        exit /b 1
    )
)
echo [完成] 后端依赖安装完成
echo.

:: 构建前端
echo [3/4] 构建前端应用...
cd /d "%~dp0..\client"
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 前端构建失败
    pause
    exit /b 1
)
echo [完成] 前端构建完成
echo.

:: 复制前端构建到后端
echo [4/4] 复制前端文件到后端...
if exist "%~dp0..\server\public" rmdir /s /q "%~dp0..\server\public"
xcopy /E /I /Y "%~dp0..\client\dist" "%~dp0..\server\public"
echo [完成] 前端文件复制完成
echo.

:: 创建数据目录
if not exist "%~dp0..\data\db" mkdir "%~dp0..\data\db"
if not exist "%~dp0..\data\cache" mkdir "%~dp0..\data\cache"
if not exist "%~dp0..\data\thumbnails" mkdir "%~dp0..\data\thumbnails"

:: 复制环境变量文件
if not exist "%~dp0..\server\.env" (
    if exist "%~dp0..\docker\.env.example" (
        copy "%~dp0..\docker\.env.example" "%~dp0..\server\.env"
        echo [信息] 已创建.env文件，请根据需要修改配置
    )
)

:: 启动后端服务
echo.
echo ========================================
echo   正在启动NikkiGallery服务...
echo ========================================
echo.
echo 服务启动后，请访问: http://localhost:14000
echo 按Ctrl+C停止服务
echo.

cd /d "%~dp0..\server"
call npm start

pause
