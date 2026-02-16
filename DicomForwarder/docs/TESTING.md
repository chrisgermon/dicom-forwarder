# Testing DICOM Forwarder

This guide helps you verify that your DICOM Forwarder is receiving and processing DICOM images correctly.

## Quick Status Check

1. **Check if Service is Running:**
   - Open Windows Services (`services.msc`)
   - Look for "DICOM Store and Forward Service"
   - Status should be "Running"

   OR

   - Run: `scripts\check_status.bat`

2. **Check Logs:**
   - Navigate to: `C:\Program Files\DICOM Forwarder\logs\` (or your configured log directory)
   - Open the most recent log file (format: `dicom_forwarder_YYYYMMDD.log`)
   - Look for entries like:
     - "Starting DICOM forwarder..."
     - "Listening on: 0.0.0.0:11112"
     - "Received DICOM image: Patient=..."

3. **Check Local Storage (if enabled):**
   - Navigate to: `C:\Program Files\DICOM Forwarder\dicom_storage\` (or your configured storage directory)
   - If images are being received, you'll see folders organized by PatientID/StudyUID/SeriesUID/

## Send a Test Image

### Method 1: Using the Test Script (Easiest)

1. **Install Python dependencies** (if not already installed):
   ```cmd
   pip install pynetdicom pydicom numpy
   ```

2. **Run the test script:**
   ```cmd
   scripts\test_dicom.bat
   ```

   This will:
   - Create a test DICOM image
   - Send it to your DICOM Forwarder
   - Show you if it was received successfully

### Method 2: Using pynetdicom Command Line

If you have a DICOM file to test with:

```cmd
python -m pynetdicom storescu localhost 11112 -ae DICOM_FORWARDER test_image.dcm
```

Replace:
- `11112` with your configured port
- `DICOM_FORWARDER` with your configured AE Title
- `test_image.dcm` with your DICOM file path

### Method 3: Using Python Script

```python
from pynetdicom import AE
from pynetdicom.sop_class import CTImageStorage
from pydicom import dcmread

# Load your DICOM file
ds = dcmread('test_image.dcm')

# Create association
ae = AE(ae_title='TEST_CLIENT')
ae.add_requested_context(CTImageStorage)

# Connect and send
assoc = ae.associate('localhost', 11112, ae_title='DICOM_FORWARDER')
if assoc.is_established:
    status = assoc.send_c_store(ds)
    print(f"Status: {status}")
    assoc.release()
```

## Verify Reception

After sending a test image, check:

1. **Log File:**
   - Should show: "Received DICOM image: Patient=TEST001, Study=..."
   - Should show: "Saved locally: ..." (if local storage enabled)
   - Should show: "Successfully forwarded to PACS: ..." (if forwarding enabled)

2. **Storage Directory:**
   - Should contain: `TEST001/StudyUID/SeriesUID/InstanceUID.dcm`

3. **PACS Server:**
   - If forwarding is enabled, check your PACS server to verify the image was received

## Troubleshooting

### "Could not establish association"

**Possible causes:**
- Service is not running
- Wrong port number
- Firewall blocking the port
- Wrong AE Title

**Solutions:**
1. Check service status: `services.msc`
2. Verify port in `config.json`
3. Check Windows Firewall rules
4. Verify AE Title matches configuration

### "No images in storage directory"

**Possible causes:**
- Local storage is disabled in config
- Images are being forwarded but not stored locally
- Storage directory path is incorrect

**Solutions:**
1. Check `config.json`: `"store_locally": true`
2. Verify storage directory path exists and is writable
3. Check logs for error messages

### "Images not forwarding to PACS"

**Possible causes:**
- PACS server is unreachable
- Wrong PACS configuration (IP, port, AE Title)
- Network connectivity issues

**Solutions:**
1. Use Configuration Wizard "Test Connection" button
2. Verify PACS server IP, port, and AE Title
3. Check network connectivity: `ping <PACS_IP>`
4. Review logs for forwarding errors

## Monitoring

### Real-time Monitoring

To monitor incoming images in real-time:

1. **Watch the log file:**
   ```cmd
   powershell -Command "Get-Content 'C:\Program Files\DICOM Forwarder\logs\dicom_forwarder_*.log' -Wait -Tail 20"
   ```

2. **Run in console mode** (for testing):
   ```cmd
   DicomForwarder.exe --config "C:\Program Files\DICOM Forwarder\config.json"
   ```
   This shows all activity in the console window.

### Expected Log Entries

When working correctly, you should see:

```
2026-01-XX XX:XX:XX - INFO - Starting DICOM forwarder...
2026-01-XX XX:XX:XX - INFO - AE Title: DICOM_FORWARDER
2026-01-XX XX:XX:XX - INFO - Listening on: 0.0.0.0:11112
2026-01-XX XX:XX:XX - INFO - Forwarding to: 192.168.1.100:11110 (AE: PACS_SERVER)
2026-01-XX XX:XX:XX - INFO - Received DICOM image: Patient=TEST001, Study=1.2.840.113619.2.55.3...
2026-01-XX XX:XX:XX - INFO - Saved locally: C:\Program Files\DICOM Forwarder\dicom_storage\TEST001\...
2026-01-XX XX:XX:XX - INFO - Successfully forwarded to PACS: 192.168.1.100:11110
```

## Getting Help

If you're still having issues:

1. Check the logs for specific error messages
2. Verify your configuration using the Configuration Wizard
3. Test connectivity to PACS server
4. Ensure the Windows service has proper permissions
