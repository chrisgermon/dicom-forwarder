# Push to GitHub - Step by Step Guide

## Option 1: Create New Repository (Recommended)

1. **Create a new repository on GitHub:**
   - Go to https://github.com/new
   - Repository name: `DicomForwarder` (or your choice)
   - Make it Public or Private
   - Don't initialize with README (we have files already)
   - Click "Create repository"

2. **Set the remote and push:**
   ```bash
   cd C:\Git\DicomForwarder
   git remote set-url origin https://github.com/YOUR_USERNAME/DicomForwarder.git
   git add .
   git commit -m "Initial commit - DICOM Forwarder v1.0.0"
   git push -u origin main
   ```

3. **Create a Release with the installer:**
   - Go to your GitHub repo
   - Click "Releases" → "Create a new release"
   - Tag: `v1.0.0`
   - Title: `DICOM Forwarder v1.0.0`
   - Description: Add release notes
   - **Drag and drop** `build/DicomForwarder_Setup.exe` to attach it
   - Click "Publish release"

## Option 2: Use Existing Repository

If you already have a DicomForwarder repository:

```bash
cd C:\Git\DicomForwarder
git remote set-url origin https://github.com/YOUR_USERNAME/DicomForwarder.git
git add .
git commit -m "Update to v1.0.0 - Fixed PACS forwarding"
git push origin main
```

Then create a release as above.

## Quick Commands

```bash
# Check current status
git status

# Add all files (except those in .gitignore)
git add .

# Commit changes
git commit -m "DICOM Forwarder v1.0.0 - Fixed PACS forwarding and service stop issues"

# Push to GitHub
git push origin main

# Create a tag for the release
git tag v1.0.0
git push origin v1.0.0
```

## Important Notes

- The installer (~60MB) should be attached to a GitHub Release, not committed to the repo
- Your `.gitignore` already excludes the installer from commits
- All source code and documentation will be pushed
- The installer goes in the Release as a downloadable binary
