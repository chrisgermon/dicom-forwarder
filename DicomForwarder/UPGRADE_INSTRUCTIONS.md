# Upgrading DICOM Forwarder

## Quick Upgrade (Recommended)

**You don't need to uninstall first!** The installer handles upgrades automatically.

### Steps:

1. **Stop the service** (optional but recommended):
   - Open Windows Services (`services.msc`)
   - Find "DICOM Store and Forward Service"
   - Right-click → Stop
   
   OR use the Start Menu shortcut:
   - Start Menu → DICOM Forwarder → Stop Service

2. **Run the new installer:**
   - Double-click `DicomForwarder_Setup.exe`
   - When prompted "already installed, reinstall?", click **Yes**

3. **The installer will:**
   - ✅ Update all application files
   - ✅ Preserve your existing `config.json` (your settings are safe!)
   - ✅ Preserve all logs
   - ✅ Preserve all stored DICOM files
   - ✅ Reinstall the service
   - ✅ Optionally start the service automatically

4. **Done!** Your configuration and data are preserved.

## What Gets Preserved

- ✅ `config.json` - Your configuration settings
- ✅ `logs/` - All log files
- ✅ `dicom_storage/` - All stored DICOM images
- ✅ Service settings

## What Gets Updated

- ✅ `DicomForwarder.exe` - Main application
- ✅ `DicomForwarderService.exe` - Windows service
- ✅ `ConfigWizard.exe` - Configuration wizard
- ✅ Helper scripts in `scripts/` folder

## Alternative: Clean Install

If you want a completely fresh install:

1. **Uninstall first:**
   - Control Panel → Programs → Uninstall DICOM Forwarder
   - OR: Start Menu → DICOM Forwarder → Uninstall

2. **Install the new version:**
   - Run `DicomForwarder_Setup.exe`
   - Configure from scratch

**Note:** This will delete your configuration and you'll need to reconfigure.

## Troubleshooting

### Service won't start after upgrade

1. Stop the service manually
2. Uninstall the service: Start Menu → DICOM Forwarder → Uninstall Service
3. Reinstall the service: Start Menu → DICOM Forwarder → Install Service
4. Start the service: Start Menu → DICOM Forwarder → Start Service

### Configuration seems wrong

- Your `config.json` is preserved, but you can:
  - Use Configuration Wizard to update settings
  - Or edit `config.json` manually
