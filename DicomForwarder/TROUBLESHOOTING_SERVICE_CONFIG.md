# Troubleshooting Service Config Issues

## Problem
Service doesn't use the same config as the application when run directly.

## Enhanced Logging Added

The latest build includes detailed logging to help diagnose the issue. After installing, check the logs to see:

1. **Service startup logs** will show:
   - Service executable path
   - Service directory
   - Working directory
   - Config file path
   - Whether config file exists
   - Config file contents
   - Final config values being used

2. **Config loading logs** will show:
   - Where config is being loaded from
   - What values are in the config file
   - What values are actually being used

## How to Check

1. **Stop the service**
2. **Check the logs** in: `C:\Program Files\DICOM Forwarder\logs\`
3. **Look for these sections:**
   - "DICOM Forwarder Service Starting"
   - "Loading config from:"
   - "Forwarder Configuration Verification"

## Common Issues

### Issue 1: Config file not found
**Symptoms:** Logs show "Config file not found"
**Solution:** Verify `config.json` exists in installation directory

### Issue 2: Config loaded but wrong values
**Symptoms:** Logs show config loaded but values don't match
**Solution:** Check if there are multiple config files or the service is reading a different one

### Issue 3: Path resolution issues
**Symptoms:** Relative paths not working
**Solution:** The latest build converts all relative paths to absolute paths

## Quick Test

1. Run the application directly and note the config values it uses
2. Check the service logs and compare
3. Look for differences in:
   - Config file path
   - Config values
   - Working directory

## Next Steps

After installing the new build, check the logs and share:
- The "Service Starting" section
- The "Config Loading" section  
- The "Configuration Verification" section

This will help identify exactly what's different between running as service vs application.
