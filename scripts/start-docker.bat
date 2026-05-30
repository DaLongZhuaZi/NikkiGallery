@echo off
echo ========================================
echo NikkiGallery Docker Launcher
echo ========================================
echo.

REM 检查Docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Docker is not installed or not in PATH
    echo Please install Docker Desktop from https://www.docker.com/
    pause
    exit /b 1
)

REM 检查Docker Compose
where docker-compose >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Docker Compose is not installed
    pause
    exit /b 1
)

REM 检查.env文件
if not exist "%~dp0\..\docker\.env" (
    echo Creating .env file from example...
    copy "%~dp0\..\docker\.env.example" "%~dp0\..\docker\.env"
    echo.
    echo Please edit docker\.env file to set your game screenshots path
    echo.
    pause
)

echo Starting NikkiGallery with Docker...
echo.

cd /d "%~dp0\..\docker"
docker-compose up -d

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo NikkiGallery started successfully!
    echo.
    echo Access the application at:
    echo - http://localhost:13000
    echo.
    echo To view logs: docker-compose logs -f
    echo To stop: docker-compose down
    echo ========================================
) else (
    echo.
    echo Error: Failed to start NikkiGallery
)

echo.
pause