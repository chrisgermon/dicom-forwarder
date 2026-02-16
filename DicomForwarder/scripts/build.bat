@echo off
echo ============================================================
echo DICOM Forwarder - Automated Build Script
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo Python found. Starting build process...
cd ..\build
python build_installer.py

pause