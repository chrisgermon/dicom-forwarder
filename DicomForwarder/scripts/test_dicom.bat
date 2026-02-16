@echo off
setlocal enabledelayedexpansion
echo ============================================================
echo DICOM Forwarder - Test Image Sender
echo ============================================================
echo.
echo This script will send a test DICOM image to verify
echo that your DICOM Forwarder is receiving images.
echo.
echo Make sure the DICOM Forwarder service is running!
echo.
pause

REM Try to find config.json in installation directory
set CONFIG_PATH=
if exist "C:\Program Files\DICOM Forwarder\config.json" (
    set "CONFIG_PATH=C:\Program Files\DICOM Forwarder\config.json"
) else if exist "C:\Program Files (x86)\DICOM Forwarder\config.json" (
    set "CONFIG_PATH=C:\Program Files (x86)\DICOM Forwarder\config.json"
) else if exist "config.json" (
    set "CONFIG_PATH=config.json"
)

if "!CONFIG_PATH!"=="" (
    echo ERROR: Could not find config.json
    echo Please run this from the installation directory or specify the path
    pause
    exit /b 1
)

REM Get the script directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"
cd ..

REM Run the Python script with properly quoted path
python "scripts\test_dicom_reception.py" --config "!CONFIG_PATH!"

echo.
echo ============================================================
echo Test complete!
echo ============================================================
pause
endlocal