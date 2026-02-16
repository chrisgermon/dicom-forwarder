@echo off
echo ============================================================
echo DICOM Forwarder - Connection Status Check
echo ============================================================
echo.

echo Checking if service is listening on port 11112...
netstat -an | findstr "11112.*LISTENING"
if errorlevel 1 (
    echo [WARNING] No LISTENING socket found on port 11112
    echo The service may not be running or configured on a different port
) else (
    echo [OK] Service is listening on port 11112
)
echo.

echo Recent connections to port 11112:
netstat -an | findstr "11112"
echo.

echo Checking for active connections...
netstat -an | findstr "11112.*ESTABLISHED"
if errorlevel 1 (
    echo [INFO] No active connections (this is normal if no images are being sent right now)
) else (
    echo [OK] Active connections found!
)
echo.

echo TIME_WAIT connections indicate recent successful connections.
echo These are normal and show that devices HAVE connected to your forwarder.
echo.

pause
