@echo off
setlocal enabledelayedexpansion
echo ============================================================
echo DICOM Forwarder - Storage Directory Check
echo ============================================================
echo.

REM Try to find storage directory
set "STORAGE_DIR="
if exist "C:\Program Files\DICOM Forwarder\dicom_storage" (
    set "STORAGE_DIR=C:\Program Files\DICOM Forwarder\dicom_storage"
) else if exist "C:\Program Files (x86)\DICOM Forwarder\dicom_storage" (
    set "STORAGE_DIR=C:\Program Files (x86)\DICOM Forwarder\dicom_storage"
) else if exist "dicom_storage" (
    set "STORAGE_DIR=dicom_storage"
) else (
    REM Try current directory's parent
    cd /d "%~dp0.."
    if exist "dicom_storage" (
        set "STORAGE_DIR=dicom_storage"
    )
)

if "!STORAGE_DIR!"=="" (
    echo [INFO] Storage directory not found
    echo Local storage may be disabled in configuration
    echo.
    echo To enable local storage:
    echo   1. Run ConfigWizard.exe
    echo   2. Check "Store images locally before forwarding"
    echo   3. Set the storage directory path
    pause
    endlocal
    exit /b 0
)

echo Storage directory: !STORAGE_DIR!
echo.

REM Count DICOM files using PowerShell (more reliable with paths containing spaces)
for /f %%a in ('powershell -Command "(Get-ChildItem -Path '!STORAGE_DIR!' -Filter *.dcm -Recurse -ErrorAction SilentlyContinue).Count"') do set FILE_COUNT=%%a

if defined FILE_COUNT (
    if !FILE_COUNT! GTR 0 (
        echo [OK] Found !FILE_COUNT! DICOM file(s) stored locally
        echo.
        echo Sample files (first 20):
        echo ----------------------------------------
        powershell -Command "Get-ChildItem -Path '!STORAGE_DIR!' -Filter *.dcm -Recurse -ErrorAction SilentlyContinue | Select-Object -First 20 FullName"
    ) else (
        echo [INFO] No DICOM files found in storage directory
        echo.
        echo This could mean:
        echo   1. No images have been received yet
        echo   2. Local storage is disabled
        echo   3. Images are being forwarded but not stored locally
        echo.
        echo Check the logs to see if images are being received
    )
) else (
    echo [INFO] No DICOM files found in storage directory
    echo.
    echo This could mean:
    echo   1. No images have been received yet
    echo   2. Local storage is disabled
    echo   3. Images are being forwarded but not stored locally
    echo.
    echo Check the logs to see if images are being received
)

echo.
pause
endlocal
