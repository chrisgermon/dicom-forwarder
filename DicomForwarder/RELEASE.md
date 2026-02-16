# Creating a GitHub Release

To publish the installer to GitHub:

## Option 1: Manual Release (Recommended)

1. **Build the installer locally:**
   ```bash
   cd build
   python build_installer.py
   ```

2. **Create a GitHub Release:**
   - Go to your GitHub repository
   - Click "Releases" → "Create a new release"
   - Tag version: `v1.0.0` (or your version)
   - Release title: `DICOM Forwarder v1.0.0`
   - Description: Release notes
   - **Attach `build/DicomForwarder_Setup.exe`** as a binary
   - Click "Publish release"

## Option 2: Automated Release with GitHub Actions

1. **Tag a version:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **GitHub Actions will automatically:**
   - Build the installer on Windows
   - Create a release
   - Attach the installer

## Option 3: Add to Repository (Not Recommended)

If you want the installer in the repository (not recommended due to size):

1. **Remove from .gitignore:**
   - Edit `.gitignore` and remove `DicomForwarder_Setup.exe`

2. **Use Git LFS (Large File Storage):**
   ```bash
   git lfs install
   git lfs track "*.exe"
   git add .gitattributes
   git add build/DicomForwarder_Setup.exe
   git commit -m "Add installer"
   git push
   ```

## Recommended Approach

**Use GitHub Releases** - This is the standard way to distribute installers:
- ✅ Keeps repository size small
- ✅ Easy to download
- ✅ Version management
- ✅ Release notes
- ✅ No Git LFS needed

The installer file should be attached to releases, not committed to the repository.
