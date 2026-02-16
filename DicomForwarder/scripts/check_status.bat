@echo off
setlocal enabledelayedexpansion
echo ============================================================
echo DICOM Forwarder - Status Checker
echo ============================================================
echo.

REM Check if service is running
echo Checking Windows Service status...
sc query DicomForwarderService >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Service not found or not installed
    echo.
    echo To install the service:
    echo   DicomForwarderService.exe install
    echo   DicomForwarderService.exe start
) else (
    sc query DicomForwarderService | findstr "STATE"
    echo.
)

REM Try to find installation directory and check logs
echo.
echo Checking for log files...
set "LOG_DIR="
if exist "C:\Program Files\DICOM Forwarder\logs" (
    set "LOG_DIR=C:\Program Files\DICOM Forwarder\logs"
) else if exist "C:\Program Files (x86)\DICOM Forwarder\logs" (
    set "LOG_DIR=C:\Program Files (x86)\DICOM Forwarder\logs"
) else if exist "logs" (
    set "LOG_DIR=logs"
)

if not "!LOG_DIR!"=="" (
    echo Log directory: !LOG_DIR!
    echo.
    echo Recent log entries:
    echo ----------------------------------------
    for /f "delims=" %%f in ('dir /b /o-d "!LOG_DIR!\*.log" 2^>nul') do (
        echo.
        echo Latest log file: %%f
        echo Last 10 lines:
        powershell -Command "Get-Content '!LOG_DIR!\%%f' -Tail 10"
        goto :found_log
    )
    :found_log
) else (
    echo [WARNING] Log directory not found
)

echo.
echo Checking for stored DICOM images...
set "STORAGE_DIR="
if exist "C:\Program Files\DICOM Forwarder\dicom_storage" (
    set "STORAGE_DIR=C:\Program Files\DICOM Forwarder\dicom_storage"
) else if exist "C:\Program Files (x86)\DICOM Forwarder\dicom_storage" (
    set "STORAGE_DIR=C:\Program Files (x86)\DICOM Forwarder\dicom_storage"
) else if exist "dicom_storage" (
    set "STORAGE_DIR=dicom_storage"
)

if not "!STORAGE_DIR!"=="" (
    echo Storage directory: !STORAGE_DIR!
    for /f %%a in ('dir /s /b "!STORAGE_DIR!\*.dcm" 2^>nul ^| find /c /v ""') do set COUNT=%%a
    if defined COUNT (
        echo Found !COUNT! DICOM file(s) stored locally
    ) else (
        echo No DICOM files found in storage directory
    )
) else (
    echo [INFO] Storage directory not found (local storage may be disabled)
)

echo.
echo ============================================================
echo Status check complete!
echo ============================================================
echo.
echo To test if images are being received:
echo   1. Run: check_received_images.bat
echo   2. Check the logs shown above
echo   3. Check Windows Services (services.msc) to verify service is running
echo.
pause
endlocal