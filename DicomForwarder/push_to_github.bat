@echo off
echo ============================================================
echo DICOM Forwarder - Push to GitHub
echo ============================================================
echo.

REM Check if GitHub username is provided
if "%1"=="" (
    echo Usage: push_to_github.bat YOUR_GITHUB_USERNAME
    echo.
    echo Example: push_to_github.bat chrisgermon
    echo.
    echo First, create a repository on GitHub:
    echo   1. Go to https://github.com/new
    echo   2. Name: DicomForwarder
    echo   3. Don't initialize with README
    echo   4. Click Create repository
    echo.
    pause
    exit /b 1
)

set GITHUB_USER=%1
set REPO_NAME=DicomForwarder

echo Step 1: Setting remote URL...
git remote set-url origin https://github.com/%GITHUB_USER%/%REPO_NAME%.git
if errorlevel 1 (
    echo ERROR: Failed to set remote URL
    pause
    exit /b 1
)

echo.
echo Step 2: Committing changes...
git commit -m "DICOM Forwarder v1.0.0 - Fixed PACS forwarding and service issues"
if errorlevel 1 (
    echo ERROR: Failed to commit
    pause
    exit /b 1
)

echo.
echo Step 3: Pushing to GitHub...
git push -u origin main
if errorlevel 1 (
    echo.
    echo ERROR: Push failed. Make sure:
    echo   1. Repository exists at https://github.com/%GITHUB_USER%/%REPO_NAME%
    echo   2. You have push access
    echo   3. Repository is not empty (or allow force push)
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo SUCCESS! Code pushed to GitHub
echo ============================================================
echo.
echo Next steps:
echo   1. Go to: https://github.com/%GITHUB_USER%/%REPO_NAME%/releases/new
echo   2. Tag: v1.0.0
echo   3. Title: DICOM Forwarder v1.0.0
echo   4. Attach: build\DicomForwarder_Setup.exe
echo   5. Click "Publish release"
echo.
pause
