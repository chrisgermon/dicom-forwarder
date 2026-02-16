@echo off
echo Stopping DICOM Forwarder Service...
cd ..\src
python windows_service.py stop
echo.
echo Uninstalling service...
python windows_service.py remove
echo.
echo Service uninstalled!
pause