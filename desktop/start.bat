@echo off
chcp 65001 >nul 2>&1
title NikkiGallery Manager

echo ================================
echo   NikkiGallery Management Panel
echo ================================
echo.

cd /d "%~dp0"

echo Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

echo Starting management panel...
echo URL: http://localhost:19527
echo.
echo Press Ctrl+C to stop
echo.

node server.js

pause
