@echo off
TITLE Waste Management Launcher
ECHO Starting Backend...
start "Backend Server" cmd /k "cd backend && node index.js"

ECHO Starting Frontend...
start "Frontend Dashboard" cmd /k "cd frontend && npm run dev"

ECHO Starting AI Vision...
start "AI Vision Processor" cmd /k "python vision_processor.py"

ECHO All Systems Launched!
ECHO Please wait for the browser to open...
timeout /t 5
start http://localhost:5173
EXIT
