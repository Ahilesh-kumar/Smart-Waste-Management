@echo off
title Smart Waste Management System - Launcher
echo ============================================
echo   Smart Waste Management System Launcher
echo ============================================
echo.

:: Set the project directory
cd /d "%~dp0"

:: Kill any existing processes on our ports
echo [1/4] Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do taskkill /F /PID %%a 2>nul
timeout /t 2 /nobreak >nul

:: Start Backend
echo [2/4] Starting Backend Server...
start "Backend Server" cmd /k "cd /d %~dp0backend && node index.js"
timeout /t 3 /nobreak >nul

:: Start Frontend
echo [3/4] Starting Frontend Dev Server...
start "Frontend Dev" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 3 /nobreak >nul

:: Start AI Vision Processor
echo [4/4] Starting AI Vision Processor...
start "AI Vision" cmd /k "cd /d %~dp0 && python vision_processor.py"

echo.
echo ============================================
echo   All services started successfully!
echo ============================================
echo.
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:5173
echo   AI:       Running in separate window
echo.
echo   Close this window or press any key to exit.
echo   (Services will keep running in their windows)
echo ============================================
pause >nul
