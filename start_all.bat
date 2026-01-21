@echo off
title Smart Waste Management System - Launcher
echo ============================================
echo   Smart Waste Management System Launcher
echo ============================================
echo.

:: Set the project directory
cd /d "%~dp0"

:: Kill any existing processes on our ports
echo [1/5] Cleaning up existing processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul

:: Start Backend
echo [2/5] Starting Backend Server...
start "Backend Server" /min cmd /k "cd /d %~dp0backend && node index.js"
timeout /t 3 /nobreak >nul

:: Start Frontend
echo [3/5] Starting Frontend Dev Server...
start "Frontend Dev" /min cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 4 /nobreak >nul

:: Start AI Vision Processor
echo [4/5] Starting AI Vision Processor...
start "AI Vision" cmd /k "cd /d %~dp0 && python vision_processor.py"
timeout /t 2 /nobreak >nul

:: Open Browser
echo [5/5] Opening Dashboard in Browser...
start http://localhost:5173

echo.
echo ============================================
echo   All services started successfully!
echo ============================================
echo.
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:5173
echo   AI:       Running in separate window
echo   Browser:  Opened automatically
echo.
echo   Press any key to STOP all services.
echo ============================================
pause >nul

:: Stop all services
echo.
echo Stopping all services...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
echo All services stopped.
timeout /t 2 /nobreak >nul
