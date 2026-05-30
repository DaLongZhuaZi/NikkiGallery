@echo off
echo ========================================
echo NikkiGallery Development Server Launcher
echo ========================================
echo.

REM 检查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM 检查npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo [1/4] Installing server dependencies...
cd /d "%~dp0\..\server"
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install server dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Initializing database...
call npm run db:migrate
call npm run db:seed

echo.
echo [3/4] Installing client dependencies...
cd /d "%~dp0\..\client"
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install client dependencies
    pause
    exit /b 1
)

echo.
echo [4/4] Starting development servers...
echo.
echo Starting server on http://localhost:14000
echo Starting client on http://localhost:13000
echo.
echo Press Ctrl+C to stop servers
echo.

REM 启动后端服务
cd /d "%~dp0\..\server"
start "NikkiGallery Server" cmd /c "npm run dev"

REM 等待后端启动
timeout /t 3 /nobreak >nul

REM 启动前端服务
cd /d "%~dp0\..\client"
start "NikkiGallery Client" cmd /c "npm run dev"

echo.
echo ========================================
echo Development servers started!
echo - Client: http://localhost:13000
echo - Server: http://localhost:14000
echo ========================================
echo.
pause