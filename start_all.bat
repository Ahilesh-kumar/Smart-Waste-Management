@echo off
TITLE Waste Management Launcher

REM ============================================
REM    CONFIG IS NOW IN config.json
REM    Edit config.json to change camera IP
REM ============================================

REM Read config from config.json using PowerShell
for /f "delims=" %%i in ('powershell -Command "(Get-Content config.json | ConvertFrom-Json).camera.ip"') do set IP_CAM_IP=%%i
for /f "delims=" %%i in ('powershell -Command "(Get-Content config.json | ConvertFrom-Json).camera.port"') do set IP_CAM_PORT=%%i
SET IP_CAM_URL=http://%IP_CAM_IP%:%IP_CAM_PORT%/video

ECHO.
ECHO ============================================
ECHO    Smart Waste Management System
ECHO ============================================
ECHO    Camera IP: %IP_CAM_IP%:%IP_CAM_PORT%
ECHO    (Edit config.json to change)
ECHO ============================================
ECHO.

ECHO Starting Backend Server...
start "Backend Server" cmd /k "cd backend && set IP_CAM_IP=%IP_CAM_IP% && set IP_CAM_PORT=%IP_CAM_PORT% && node index.js"

ECHO Starting Frontend Dashboard...
start "Frontend Dashboard" cmd /k "cd frontend && npm run dev"

ECHO Starting AI Vision Processor...
start "AI Vision Processor" cmd /k "set IP_CAM_URL=%IP_CAM_URL% && python vision_processor.py"

ECHO.
ECHO All Systems Launched!
ECHO Camera configured at: %IP_CAM_URL%
ECHO Please wait for the browser to open...
timeout /t 5
start http://localhost:5173
EXIT
