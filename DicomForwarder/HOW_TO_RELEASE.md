# How to Push Installer to GitHub

## Quick Method: Manual Release

1. **Go to your GitHub repository** (create one if needed):
   - https://github.com/yourusername/DicomForwarder

2. **Click "Releases" → "Create a new release"**

3. **Fill in:**
   - Tag: `v1.0.0`
   - Title: `DICOM Forwarder v1.0.0`
   - Description: Add release notes
   - **Attach file:** `build/DicomForwarder_Setup.exe`

4. **Click "Publish release"**

The installer will be available for download from the Releases page.

## Alternative: Add to Repository (if you want it in the repo)

If you want the installer committed to the repository:

1. **Remove from .gitignore:**
   ```bash
   # Edit .gitignore and comment out or remove:
   # DicomForwarder_Setup.exe
   ```

2. **Add and commit:**
   ```bash
   git add build/DicomForwarder_Setup.exe
   git commit -m "Add installer v1.0.0"
   git push
   ```

**Note:** The installer is ~60MB, so this will increase repository size significantly.

## Recommended: Use GitHub Releases

✅ **Best practice:** Keep installers in Releases, not in the repository
- Keeps repo size small
- Easy version management
- Better for users to download
