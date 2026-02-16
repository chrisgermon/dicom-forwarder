# GitHub Setup - Quick Guide

## Step 1: Create GitHub Repository

1. Go to: https://github.com/new
2. Repository name: `DicomForwarder`
3. Description: "DICOM Store-and-Forward Application for Windows"
4. Public or Private (your choice)
5. **Don't** check "Initialize with README" (we have files)
6. Click "Create repository"

## Step 2: Update Remote and Push

After creating the repo, GitHub will show you commands. Use these:

```bash
cd C:\Git\DicomForwarder

# Set the correct remote (replace YOUR_USERNAME)
git remote set-url origin https://github.com/YOUR_USERNAME/DicomForwarder.git

# Commit all changes
git commit -m "DICOM Forwarder v1.0.0

- Fixed PACS forwarding (added requested presentation contexts)
- Fixed service stop functionality
- Enhanced logging with connection details
- Preserve configuration during reinstall
- Improved error handling"

# Push to GitHub
git push -u origin main
```

## Step 3: Create Release with Installer

1. Go to: https://github.com/YOUR_USERNAME/DicomForwarder/releases/new
2. Tag: `v1.0.0`
3. Title: `DICOM Forwarder v1.0.0`
4. Description:
   ```
   ## What's New
   - Fixed PACS forwarding issue (presentation contexts)
   - Fixed service stop functionality
   - Enhanced logging
   - Configuration preservation during upgrade
   
   ## Installation
   1. Download DicomForwarder_Setup.exe
   2. Run the installer
   3. Configure using the wizard
   4. Service will start automatically
   ```
5. **Attach file:** Drag `build/DicomForwarder_Setup.exe` (~60MB)
6. Click "Publish release"

## Done! 

Your code is on GitHub and the installer is available for download.
