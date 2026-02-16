@echo off
echo ============================================================
echo DICOM Forwarder - Quick Test
echo ============================================================
echo.
echo This will run the DICOM Forwarder in console mode for testing.
echo Press Ctrl+C to stop.
echo.
pause

cd ..\src
python dicom_forwarder.py --config ..\config.json

pause