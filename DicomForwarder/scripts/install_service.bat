@echo off
echo Installing DICOM Forwarder Service...
cd ..\src
python windows_service.py install
echo.
echo Starting service...
python windows_service.py start
echo.
echo Service installed and started!
echo Check Windows Services (services.msc) for status.
pause