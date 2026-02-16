"""
File creation checklist and helper
Run this in your project root to see what files exist
"""

import os
from pathlib import Path

def check_file(filepath, expected_size_range=None):
    """Check if file exists and has content."""
    if not os.path.exists(filepath):
        return "❌ MISSING"
    
    size = os.path.getsize(filepath)
    if size == 0:
        return "⚠️  EMPTY"
    
    if expected_size_range:
        min_size, max_size = expected_size_range
        if size < min_size:
            return f"⚠️  TOO SMALL ({size} bytes)"
    
    return f"✅ OK ({size} bytes)"

def main():
    print("="*60)
    print("DICOM Forwarder - File Checklist")
    print("="*60)
    print()
    
    files = {
        "Root Files": {
            "config.json": (100, 500),
            "requirements.txt": (50, 200),
            "requirements-build.txt": (50, 200),
            "README.md": (1000, None),
            ".gitignore": (200, None),
        },
        "Source Files (src/)": {
            "src/dicom_forwarder.py": (8000, None),
            "src/windows_service.py": (2000, None),
            "src/config_wizard.py": (7000, None),
        },
        "Build Files (build/)": {
            "build/setup.py": (2000, None),
            "build/build_installer.py": (6000, None),
        },
        "Scripts (scripts/)": {
            "scripts/build.bat": (300, None),
            "scripts/install_service.bat": (200, None),
            "scripts/uninstall_service.bat": (200, None),
            "scripts/quick_test.bat": (200, None),
        },
        "Documentation (docs/)": {
            "docs/INSTALLATION.md": (500, None),
            "docs/CONFIGURATION.md": (1000, None),
            "docs/BUILD_INSTRUCTIONS.md": (2000, None),
        }
    }
    
    all_good = True
    
    for section, section_files in files.items():
        print(f"\n{section}")
        print("-" * 60)
        for filepath, size_range in section_files.items():
            status = check_file(filepath, size_range)
            print(f"  {status}  {filepath}")
            if "❌" in status or "⚠️" in status:
                all_good = False
    
    print()
    print("="*60)
    if all_good:
        print("✅ All files present and valid!")
        print("\nNext steps:")
        print("  1. git add .")
        print("  2. git commit -m 'Add all source files'")
        print("  3. git push origin main")
    else:
        print("⚠️  Some files are missing or empty!")
        print("\nPlease:")
        print("  1. Review the list above")
        print("  2. Copy missing file contents from the chat")
        print("  3. Run this script again to verify")
    print("="*60)

if __name__ == '__main__':
    main()