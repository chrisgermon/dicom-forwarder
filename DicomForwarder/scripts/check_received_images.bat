@echo off
echo ============================================================
echo DICOM Forwarder - Check for Received Images
echo ============================================================
echo.

REM Find installation directory
set "INSTALL_DIR="
if exist "C:\Program Files\DICOM Forwarder\config.json" (
    set "INSTALL_DIR=C:\Program Files\DICOM Forwarder"
) else if exist "C:\Program Files (x86)\DICOM Forwarder\config.json" (
    set "INSTALL_DIR=C:\Program Files (x86)\DICOM Forwarder"
) else (
    echo [INFO] Running from current directory
    set "INSTALL_DIR=%~dp0.."
    cd /d "!INSTALL_DIR!"
)

echo Installation directory: %INSTALL_DIR%
echo.

REM Check logs for received images
echo ============================================================
echo Checking Logs for Received Images...
echo ============================================================
echo.

set "LOG_DIR=%INSTALL_DIR%\logs"
if exist "%LOG_DIR%" (
    echo Log directory: %LOG_DIR%
    echo.
    
    REM Find most recent log file
    for /f "delims=" %%f in ('dir /b /o-d "%LOG_DIR%\dicom_forwarder_*.log" 2^>nul') do (
        set "LATEST_LOG=%LOG_DIR%\%%f"
        goto :found_log
    )
    
    :found_log
    if defined LATEST_LOG (
        echo Latest log file: %LATEST_LOG%
        echo.
        echo Searching for "Received DICOM image" entries...
        findstr /C:"Received DICOM image" "%LATEST_LOG%" >nul 2>&1
        if errorlevel 1 (
            echo [INFO] No "Received DICOM image" entries found in log
            echo.
            echo Last 20 lines of log:
            echo ----------------------------------------
            powershell -Command "Get-Content '%LATEST_LOG%' -Tail 20"
        ) else (
            echo [SUCCESS] Found entries for received images!
            echo.
            echo Recent "Received DICOM image" entries:
            echo ----------------------------------------
            findstr /C:"Received DICOM image" "%LATEST_LOG%" | more
        )
    ) else (
        echo [WARNING] No log files found
    )
) else (
    echo [WARNING] Log directory not found: %LOG_DIR%
)

echo.
echo ============================================================
echo Checking Storage Directory...
echo ============================================================
echo.

set "STORAGE_DIR=%INSTALL_DIR%\dicom_storage"
if exist "%STORAGE_DIR%" (
    echo Storage directory: %STORAGE_DIR%
    echo.
    
    REM Count DICOM files
    for /f %%a in ('dir /s /b "%STORAGE_DIR%\*.dcm" 2^>nul ^| find /c /v ""') do set FILE_COUNT=%%a
    
    if defined FILE_COUNT (
        if !FILE_COUNT! GTR 0 (
            echo [SUCCESS] Found !FILE_COUNT! DICOM file(s) stored locally!
            echo.
            echo Sample files:
            echo ----------------------------------------
            dir /s /b "%STORAGE_DIR%\*.dcm" 2^>nul | more
        ) else (
            echo [INFO] Storage directory exists but no DICOM files found
            echo (Images may be forwarded without local storage)
        )
    ) else (
        echo [INFO] No DICOM files found in storage directory
        echo (Local storage may be disabled or no images received yet)
    )
) else (
    echo [INFO] Storage directory not found: %STORAGE_DIR%
    echo (Local storage may be disabled in configuration)
)

echo.
echo ============================================================
echo Checking Service Status...
echo ============================================================
echo.

sc query DicomForwarderService >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Service not found or not installed
) else (
    sc query DicomForwarderService | findstr "STATE"
)

echo.
echo ============================================================
echo Checking Network Connections...
echo ============================================================
echo.

echo Checking for listening socket on port 11112...
netstat -an | findstr "11112.*LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] No service listening on port 11112
    echo (Service may not be running or using different port)
) else (
    echo [OK] Service is listening on port 11112
)

echo.
echo Recent connections to port 11112:
netstat -an | findstr "11112" | findstr /V "LISTENING" | more

echo.
echo ============================================================
echo Summary
echo ============================================================
echo.
echo Based on the checks above:
echo   - If you see "Received DICOM image" in logs: Images ARE being received
echo   - If you see DICOM files in storage: Images ARE being stored locally
echo   - If you see TIME_WAIT connections: Devices HAVE connected recently
echo.
echo TIME_WAIT connections indicate successful connections that completed.
echo This is a good sign that devices are connecting to your forwarder!
echo.
pause
