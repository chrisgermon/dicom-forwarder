@echo off
echo ============================================================
echo DICOM Forwarder - Log Viewer
echo ============================================================
echo.

REM Find installation directory
set "INSTALL_DIR="
if exist "C:\Program Files\DICOM Forwarder\config.json" (
    set "INSTALL_DIR=C:\Program Files\DICOM Forwarder"
) else if exist "C:\Program Files (x86)\DICOM Forwarder\config.json" (
    set "INSTALL_DIR=C:\Program Files (x86)\DICOM Forwarder"
) else (
    set "INSTALL_DIR=%~dp0.."
    cd /d "%INSTALL_DIR%"
)

set "LOG_DIR=%INSTALL_DIR%\logs"

if not exist "%LOG_DIR%" (
    echo [ERROR] Log directory not found: %LOG_DIR%
    pause
    exit /b 1
)

echo Log directory: %LOG_DIR%
echo.

REM Find most recent log file
for /f "delims=" %%f in ('dir /b /o-d "%LOG_DIR%\dicom_forwarder_*.log" 2^>nul') do (
    set "LATEST_LOG=%LOG_DIR%\%%f"
    goto :found
)

:found
if not defined LATEST_LOG (
    echo [ERROR] No log files found
    pause
    exit /b 1
)

echo Latest log file: %LATEST_LOG%
echo.
echo ============================================================
echo Last 50 lines of log:
echo ============================================================
echo.

powershell -Command "Get-Content '%LATEST_LOG%' -Tail 50"

echo.
echo ============================================================
echo.
echo To watch logs in real-time, run:
echo   powershell -Command "Get-Content '%LATEST_LOG%' -Wait -Tail 20"
echo.
pause
