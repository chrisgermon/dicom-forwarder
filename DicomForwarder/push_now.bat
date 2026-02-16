@echo off
echo ============================================================
echo Pushing DICOM Forwarder to GitHub
echo ============================================================
echo.

echo Setting remote to: https://github.com/chrisgermon/dicom-forwarder.git
git remote set-url origin https://github.com/chrisgermon/dicom-forwarder.git
if errorlevel 1 (
    echo ERROR: Failed to set remote
    pause
    exit /b 1
)
echo Remote set successfully!
echo.

echo Adding all files...
git add .
if errorlevel 1 (
    echo ERROR: Failed to add files
    pause
    exit /b 1
)
echo Files added!
echo.

echo Committing changes...
git commit -m "DICOM Forwarder v1.0.0 - Fixed PACS forwarding, service stop, and max_pdu issues"
if errorlevel 1 (
    echo WARNING: Commit may have failed or nothing to commit
)
echo.

echo Pushing to GitHub...
git push -u origin main
if errorlevel 1 (
    echo.
    echo ERROR: Push failed!
    echo Make sure you have:
    echo   1. Access to the repository
    echo   2. Authentication set up (GitHub credentials)
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo SUCCESS! Code pushed to GitHub
echo ============================================================
echo.
echo Repository: https://github.com/chrisgermon/dicom-forwarder
echo.
echo Next: Create a release with the installer:
echo   1. Go to: https://github.com/chrisgermon/dicom-forwarder/releases/new
echo   2. Tag: v1.0.0
echo   3. Title: DICOM Forwarder v1.0.0
echo   4. Attach: build\DicomForwarder_Setup.exe
echo   5. Click "Publish release"
echo.
pause
