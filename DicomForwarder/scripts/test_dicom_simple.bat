@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo DICOM Forwarder - Test Image Sender
echo ============================================================
echo.

REM Check if we're in the installation directory
if exist "config.json" (
    set "CONFIG_PATH=config.json"
) else if exist "C:\Program Files\DICOM Forwarder\config.json" (
    set "CONFIG_PATH=C:\Program Files\DICOM Forwarder\config.json"
) else if exist "C:\Program Files (x86)\DICOM Forwarder\config.json" (
    set "CONFIG_PATH=C:\Program Files (x86)\DICOM Forwarder\config.json"
) else (
    echo ERROR: Could not find config.json
    echo.
    echo Please run this script from the DICOM Forwarder installation directory
    echo (where config.json is located)
    echo.
    pause
    exit /b 1
)

echo Using config: !CONFIG_PATH!
echo.
echo Make sure the DICOM Forwarder service is running!
echo.
pause

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

REM Try to find the test script
set "TEST_SCRIPT="
if exist "scripts\test_dicom_reception.py" (
    set "TEST_SCRIPT=scripts\test_dicom_reception.py"
) else if exist "C:\Git\DicomForwarder\scripts\test_dicom_reception.py" (
    set "TEST_SCRIPT=C:\Git\DicomForwarder\scripts\test_dicom_reception.py"
) else (
    echo ERROR: Could not find test_dicom_reception.py
    echo Please ensure the script is in the scripts directory
    pause
    exit /b 1
)

echo Running test script...
echo.
python "!TEST_SCRIPT!" --config "!CONFIG_PATH!"

echo.
echo ============================================================
echo Test complete!
echo ============================================================
pause
endlocal
