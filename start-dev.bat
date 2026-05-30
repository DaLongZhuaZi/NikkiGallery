@echo off
echo ========================================
echo   NikkiGallery Smart Photo Manager
echo ========================================
echo.

echo [1/2] Starting backend server...
cd /d "D:\NikkiGallery\server"
start "NikkiGallery-Server" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Starting frontend dev server...
cd /d "D:\NikkiGallery\client"
start "NikkiGallery-Client" cmd /k "npm run dev"

echo.
echo ========================================
echo   All services started!
echo   - Frontend: http://localhost:13000
echo   - Backend:  http://localhost:14000
echo ========================================
echo.
pause
