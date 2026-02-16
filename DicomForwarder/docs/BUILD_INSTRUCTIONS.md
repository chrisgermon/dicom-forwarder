# Building DICOM Forwarder Installer

This guide explains how to build a complete Windows installer for the DICOM Forwarder application.

## Prerequisites

### 1. Python
- **Version**: Python 3.8 or higher
- **Download**: https://www.python.org/downloads/
- **Installation**: Make sure to check "Add Python to PATH" during installation

### 2. NSIS (Nullsoft Scriptable Install System)
- **Download**: https://nsis.sourceforge.io/Download
- **Version**: 3.x or higher
- **Installation**: Use default installation path

### 3. Internet Connection
Required for downloading Python packages during build

## Quick Build (Automated)

### Option 1: Using the Batch File (Easiest)

1. Double-click `build.bat`
2. Wait for the build process to complete
3. Find `DicomForwarder_Setup.exe` in the current directory

### Option 2: Using Command Line

```batch
# Run the automated build script
python build_installer.py
```

## Manual Build Process

If you need more control, follow these steps:

### Step 1: Install Python Dependencies

```batch
pip install pyinstaller pynetdicom pydicom pywin32
```

### Step 2: Build Executables

```batch
python setup.py
```

This creates:
- `dist/DicomForwarder.exe` - Main application
- `dist/DicomForwarderService.exe` - Windows service
- `installer_files/` - Folder with all necessary files

### Step 3: Create Installer (requires NSIS)

```batch
# Make sure NSIS is installed, then:
"C:\Program Files (x86)\NSIS\makensis.exe" installer.nsi
```

## Build Output

After a successful build, you'll have:

```
DicomForwarder_Setup.exe    # Windows installer (distribute this)
installer_files/            # Folder with executables
├── DicomForwarder.exe
├── DicomForwarderService.exe
├── config.json
└── README.md
```

## Customization

### Custom Icon

Replace `icon.ico` with your own icon file before building:
- **Format**: ICO format
- **Recommended size**: 256x256 pixels
- **Name**: Must be named `icon.ico`

### Application Version

Edit `build_installer.py` and modify:

```python
!define VERSION "1.0.0.0"
```

### Installation Directory

Edit `build_installer.py` and modify:

```python
!define INSTALL_DIR "$PROGRAMFILES64\\${APP_NAME}"
```

## Troubleshooting

### "Python not found"
- Install Python from python.org
- Make sure Python is added to PATH
- Restart command prompt/terminal

### "NSIS not found"
- Install NSIS from nsis.sourceforge.io
- Use default installation path
- If installed in custom location, update path in `build_installer.py`

### "Module not found" errors
```batch
pip install --upgrade pyinstaller pynetdicom pydicom pywin32
```

### Build succeeds but executable crashes
- Make sure all dependencies are installed
- Check that config.json is present
- Try building without `--onefile` flag for debugging

### Antivirus blocks the executable
- PyInstaller executables may trigger false positives
- Add exception in antivirus software
- Consider code signing certificate for production

## Distribution

### What to Distribute

**For End Users:**
- `DicomForwarder_Setup.exe` - All-in-one installer

**For Advanced Users:**
- Entire `installer_files/` folder as ZIP

### Installation Instructions for End Users

1. Run `DicomForwarder_Setup.exe`
2. Follow the installation wizard
3. Configure `config.json` in installation directory
4. Use Start Menu shortcuts to:
   - Install/start/stop the Windows service
   - Run the application directly
   - Access configuration and logs

## Building for Different Python Versions

The executable will include the Python version used to build it. To target different Python versions:

```batch
# Use py launcher to specify version
py -3.9 build_installer.py
py -3.10 build_installer.py
```

## Code Signing (Optional but Recommended)

For production deployments, sign your executables:

```batch
# After building, sign the installer
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com DicomForwarder_Setup.exe
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Installer

on: [push]

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.10'
      - name: Install NSIS
        run: choco install nsis -y
      - name: Build
        run: python build_installer.py
      - uses: actions/upload-artifact@v2
        with:
          name: installer
          path: DicomForwarder_Setup.exe
```

## Support

If you encounter issues during the build process:

1. Check that all prerequisites are installed
2. Review error messages in the console
3. Verify all source files are present
4. Try building in a fresh directory

## License

See LICENSE.txt for licensing information.
