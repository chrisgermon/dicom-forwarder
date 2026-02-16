@echo off
echo ============================================================
echo DICOM Forwarder - Recent Log Viewer
echo ============================================================
echo.

REM Try to find log directory
set LOG_DIR=
if exist "C:\Program Files\DICOM Forwarder\logs" (
    set LOG_DIR=C:\Program Files\DICOM Forwarder\logs
) else if exist "C:\Program Files (x86)\DICOM Forwarder\logs" (
    set LOG_DIR=C:\Program Files (x86)\DICOM Forwarder\logs
) else if exist "logs" (
    set LOG_DIR=logs
)

if "%LOG_DIR%"=="" (
    echo [ERROR] Could not find log directory
    echo Please check your installation directory
    pause
    exit /b 1
)

echo Log directory: %LOG_DIR%
echo.

REM Find the most recent log file
for /f "delims=" %%f in ('dir /b /o-d "%LOG_DIR%\dicom_forwarder_*.log" 2^>nul') do (
    set LATEST_LOG=%LOG_DIR%\%%f
    goto :found
)

:found
if not defined LATEST_LOG (
    echo [WARNING] No log files found
    pause
    exit /b 1
)

echo Latest log file: %LATEST_LOG%
echo.
echo ============================================================
echo Last 50 lines of log file:
echo ============================================================
echo.

powershell -Command "Get-Content '%LATEST_LOG%' -Tail 50"

echo.
echo ============================================================
echo.
echo To see logs in real-time, run:
echo   powershell -Command "Get-Content '%LATEST_LOG%' -Wait -Tail 20"
echo.
pause
