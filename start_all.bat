@echo off
TITLE Waste Management Launcher

REM ============================================
REM       CENTRALIZED CONFIGURATION
REM ============================================
REM Change this IP address to match your phone's IP Webcam URL
REM Your phone will show: http://192.168.X.X:8080
SET IP_CAM_IP=192.168.128.114
SET IP_CAM_PORT=8080
SET IP_CAM_URL=http://%IP_CAM_IP%:%IP_CAM_PORT%/video
REM ============================================

ECHO.
ECHO ============================================
ECHO    Smart Waste Management System
ECHO ============================================
ECHO    Camera IP: %IP_CAM_IP%:%IP_CAM_PORT%
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
