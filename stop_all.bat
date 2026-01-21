@echo off
title Stopping All Services
echo Stopping all Smart Waste Management services...

:: Kill Node processes (backend and frontend)
taskkill /F /IM node.exe 2>nul

:: Kill Python processes (vision processor)
taskkill /F /IM python.exe 2>nul

echo.
echo All services stopped.
pause
