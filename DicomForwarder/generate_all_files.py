"""
DICOM Forwarder - Complete Project File Generator
This script creates ALL project files with their content
"""

import os
from pathlib import Path

# File contents as dictionary
FILES = {
    "config.json": """{
  "local_ae_title": "DICOM_FORWARDER",
  "local_port": 11112,
  "local_host": "0.0.0.0",
  "pacs_host": "127.0.0.1",
  "pacs_port": 11110,
  "pacs_ae_title": "PACS_SERVER",
  "store_locally": true,
  "storage_dir": "./dicom_storage",
  "log_dir": "./logs",
  "max_pdu_size": 0,
  "forward_immediately": true,
  "retry_attempts": 3
}""",

    "requirements.txt": """pynetdicom>=2.0.2
pydicom>=2.3.0
pywin32>=305""",

    "requirements-build.txt": """pyinstaller>=5.0
pynetdicom>=2.0.2
pydicom>=2.3.0
pywin32>=305""",

    "scripts/build.bat": """@echo off
echo ============================================================
echo DICOM Forwarder - Automated Build Script
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo Python found. Starting build process...
cd ..\\build
python build_installer.py

pause""",

    "scripts/install_service.bat": """@echo off
echo Installing DICOM Forwarder Service...
cd ..\\src
python windows_service.py install
echo.
echo Starting service...
python windows_service.py start
pause""",

    "scripts/uninstall_service.bat": """@echo off
echo Stopping DICOM Forwarder Service...
cd ..\\src
python windows_service.py stop
echo.
echo Uninstalling service...
python windows_service.py remove
pause""",

    "scripts/quick_test.bat": """@echo off
echo ============================================================
echo DICOM Forwarder - Quick Test
echo ============================================================
pause
cd ..\\src
python dicom_forwarder.py --config ..\\config.json
pause""",
}

def create_file(filepath, content):
    """Create a file with content."""
    path = Path(filepath)
    path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    size = len(content)
    print(f"  ✅ Created {filepath} ({size} bytes)")

def main():
    print("="*70)
    print("DICOM Forwarder - File Generator")
    print("="*70)
    print()
    print("⚠️  WARNING: This will create/overwrite files!")
    print()
    
    response = input("Continue? (yes/no): ")
    if response.lower() != 'yes':
        print("Cancelled.")
        return
    
    print()
    print("Creating files...")
    print()
    
    # Create simple files
    for filepath, content in FILES.items():
        create_file(filepath, content)
    
    print()
    print("="*70)
    print("✅ Basic files created!")
    print("="*70)
    print()
    print("⚠️  NOTE: The large Python source files need to be copied manually:")
    print("  - src/dicom_forwarder.py")
    print("  - src/windows_service.py")
    print("  - src/config_wizard.py")
    print("  - build/setup.py")
    print("  - build/build_installer.py")
    print()
    print("These files are too large to embed here.")
    print("Please copy them from the chat conversation.")
    print()
    print("After copying, run: python create_files_checklist.py")
    print("="*70)

if __name__ == '__main__':
    main()