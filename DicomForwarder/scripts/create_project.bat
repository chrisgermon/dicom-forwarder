@echo off
echo Creating DICOM Forwarder Project Structure...
echo.

REM Create main directory
mkdir DicomForwarder 2>nul
cd DicomForwarder

echo Created project folder: %CD%
echo.
echo ========================================
echo NEXT STEPS:
echo ========================================
echo.
echo 1. Copy all .py files I provided into this folder
echo 2. Copy all .bat files into this folder
echo 3. Copy config.json into this folder
echo 4. Copy README.md and BUILD_INSTRUCTIONS.md into this folder
echo.
echo You'll need to copy these files manually from the chat:
echo   - dicom_forwarder.py
echo   - windows_service.py
echo   - config_wizard.py (NEW)
echo   - config.json
echo   - setup.py
echo   - build_installer.py (UPDATED)
echo   - requirements.txt
echo   - build.bat
echo   - README.md (UPDATED)
echo   - BUILD_INSTRUCTIONS.md
echo.
echo 5. Once all files are copied, run: build.bat
echo.
pause
