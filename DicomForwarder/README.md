# DICOM Store-and-Forward Application

A Python-based DICOM receiver that runs in the background, receives DICOM images, and forwards them to a PACS server.

## Features

- ✅ **Easy Installation** - Configuration wizard during setup
- ✅ **Auto-Start Service** - Option to start service automatically after installation
- ✅ **GUI Configuration** - User-friendly configuration wizard
- ✅ **DICOM Receiver** - Receives DICOM images via C-STORE protocol
- ✅ **Store & Forward** - Forwards images to PACS server automatically
- ✅ **Local Storage** - Optional local storage with organized directory structure
- ✅ **Windows Service** - Runs in background without user login
- ✅ **Comprehensive Logging** - Detailed logs for troubleshooting
- ✅ **Retry Mechanism** - Automatic retry for failed forwards
- ✅ **Firewall Configuration** - Automatically configured during installation

## Installation

### Method 1: Using the Installer (Recommended)

1. **Run** `DicomForwarder_Setup.exe`
2. **Follow** the installation wizard
3. **Configure** your settings using the configuration wizard (launches automatically)
4. **Choose** to start the service automatically (checkbox on finish page)

### Method 2: Manual Installation

1. Install Python 3.8+ from https://www.python.org/
2. Install dependencies: `pip install -r requirements.txt`
3. Run configuration wizard: `python src/config_wizard.py`
4. Install service: `python src/windows_service.py install`
5. Start service: `python src/windows_service.py start`

## Configuration

### Using the Configuration Wizard (GUI)

Launch the configuration wizard from:
- Start Menu → DICOM Forwarder → Configuration Wizard
- Desktop shortcut "DICOM Forwarder Config"
- Command line: `ConfigWizard.exe`

The wizard allows you to configure:

**Local Receiver Settings:**
- Local AE Title
- Local Port

**PACS Server Settings:**
- PACS Server IP address
- PACS Server Port
- PACS AE Title

**Storage Settings:**
- Enable/disable local storage
- Storage directory
- Log directory

**Advanced Settings:**
- Forward images immediately
- Number of retry attempts

### Manual Configuration

Edit `config.json` in the installation directory:

```json
{
  "local_ae_title": "DICOM_FORWARDER",
  "local_port": 11112,
  "local_host": "0.0.0.0",
  "pacs_host": "192.168.1.100",
  "pacs_port": 11110,
  "pacs_ae_title": "PACS_SERVER",
  "store_locally": true,
  "storage_dir": "./dicom_storage",
  "log_dir": "./logs",
  "forward_immediately": true,
  "retry_attempts": 3
}
```

## Usage

### Starting and Stopping the Service

**From Start Menu:**
- Start Menu → DICOM Forwarder → Start Service
- Start Menu → DICOM Forwarder → Stop Service

**From Command Line:**
```cmd
# Start service
DicomForwarderService.exe start

# Stop service
DicomForwarderService.exe stop

# Check status in Windows Services (services.msc)
```

### Running as Console Application (for testing)

```cmd
DicomForwarder.exe --config config.json
```

## Testing

### Test Connection
Use the "Test Connection" button in the Configuration Wizard to verify connectivity to your PACS server.

### Send Test Images
Use any DICOM client or modality configured to send to:
- **Host:** Your computer's IP address
- **Port:** 11112 (or your configured port)
- **AE Title:** DICOM_FORWARDER (or your configured AE title)

Example using pynetdicom:
```bash
python -m pynetdicom storescu localhost 11112 -ae DICOM_FORWARDER test_image.dcm
```

## Directory Structure

```
Installation Directory/
├── DicomForwarder.exe          # Main application
├── DicomForwarderService.exe   # Windows service
├── ConfigWizard.exe             # Configuration wizard
├── config.json                  # Configuration file
├── README.md                    # This file
├── dicom_storage/               # Local DICOM storage
│   └── PatientID/
│       └── StudyUID/
│           └── SeriesUID/
│               └── InstanceUID.dcm
└── logs/                        # Application logs
    └── dicom_forwarder_YYYYMMDD.log
```

## Logging

Logs are written to both console and file. Log files are created daily in the `logs` directory.

**Log entries include:**
- Received DICOM images with patient/study information
- Local storage confirmation
- Forwarding status to PACS
- Errors and retry attempts
- Service start/stop events

**View logs:**
- Start Menu → DICOM Forwarder → Logs Folder
- Or navigate to installation directory → logs

## Troubleshooting

### Service Won't Start
1. Check Windows Event Viewer for errors
2. Verify config.json is valid JSON
3. Ensure configured ports are not in use
4. Check logs folder for error details

### Images Not Forwarding
1. Use Configuration Wizard to test PACS connection
2. Verify PACS server IP, port, and AE Title
3. Check network connectivity
4. Review logs for specific error messages
5. Ensure PACS server accepts connections from this AE Title

### Images Not Being Received
1. Verify service is running (services.msc)
2. Check sending modality configuration
3. Verify firewall rules allow incoming connections
4. Check logs for connection attempts

### Configuration Not Saving
1. Ensure you have write permissions to installation directory
2. Run Configuration Wizard as Administrator if needed
3. Check for disk space

## Uninstallation

1. Stop the service: Start Menu → DICOM Forwarder → Stop Service
2. Uninstall: Start Menu → DICOM Forwarder → Uninstall
3. Or use Windows "Add or Remove Programs"

**Note:** User data in storage and log directories may be preserved.

## Features of the Installer

✅ **One-Click Installation** - Simple wizard-based setup  
✅ **Configuration Wizard** - Launches automatically during install  
✅ **Auto-Start Option** - Service can start immediately after install  
✅ **Firewall Rules** - Automatically configured  
✅ **Start Menu Integration** - All tools accessible from Start Menu  
✅ **Desktop Shortcut** - Quick access to configuration  
✅ **Clean Uninstall** - Complete removal of application  

## Security Considerations

- Application listens on all network interfaces by default (0.0.0.0)
- Firewall rules are automatically created during installation
- No authentication is implemented (relies on DICOM AE Title verification)
- Store sensitive configuration separately if required
- Review DICOM security best practices for your environment
- Ensure compliance with HIPAA and other relevant regulations

## System Requirements

- Windows 10/11 or Windows Server 2016+
- .NET Framework 4.5+ (usually pre-installed)
- 100 MB free disk space (plus storage for DICOM images)
- Network connectivity to PACS server
- Administrator rights for service installation

## Support

For issues, questions, or feature requests:
1. Check the logs folder for error details
2. Review this README for troubleshooting steps
3. Verify your configuration using the Configuration Wizard

## License

This application is provided as-is for educational and development purposes.
See LICENSE.txt for complete license terms.
