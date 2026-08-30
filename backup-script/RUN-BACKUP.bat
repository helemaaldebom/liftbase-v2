@echo off
echo.
echo ================================
echo  HC-Lifters Backup naar OneDrive
echo ================================
echo.

REM Navigeer naar de script directory
cd /d "%~dp0"

REM Voer backup uit
node backup-to-onedrive.js

echo.
echo Druk op een toets om te sluiten...
pause >nul
