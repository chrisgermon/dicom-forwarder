# Feature Ideas - Easy to Implement

## ✅ Just Added

1. **Local IP Address Configuration** - Added to config wizard with auto-detect button
2. **Max PDU Size Configuration** - Added to config wizard

## Easy to Implement Features

### 1. Service Restart Notification
**Difficulty:** Easy  
**Description:** After saving config, prompt user to restart service  
**Implementation:**
- Add checkbox "Restart service after save"
- After save, check if service is running
- If checked, stop and start service automatically

### 2. Current Statistics Display
**Difficulty:** Easy  
**Description:** Show current statistics in config wizard  
**Implementation:**
- Read latest stats from log file or create stats.json
- Display in a separate tab or section:
  - Images received today
  - Success rate
  - Last image received time

### 3. Test Local Receiver
**Difficulty:** Easy  
**Description:** Test button to verify local receiver is working  
**Implementation:**
- Similar to "Test Connection" but for local receiver
- Try to bind to the port
- Send a test echo request

### 4. Network Interface Selection
**Difficulty:** Easy-Medium  
**Description:** Dropdown to select which network interface to bind to  
**Implementation:**
- Use `netifaces` or `socket` to enumerate interfaces
- Show list of available IPs
- Let user select specific interface

### 5. Log Level Selection
**Difficulty:** Easy  
**Description:** Add log level dropdown (INFO, DEBUG, WARNING, ERROR)  
**Implementation:**
- Add to config.json: `"log_level": "INFO"`
- Update logging configuration to use this level

### 6. Connection Status Indicator
**Difficulty:** Easy  
**Description:** Show if service is running in config wizard  
**Implementation:**
- Check Windows service status
- Show green/red indicator
- Display last connection time

### 7. Quick View of Recent Logs
**Difficulty:** Easy  
**Description:** Button in config wizard to view last 20 log entries  
**Implementation:**
- Read last N lines from log file
- Display in a popup window or new tab

### 8. Backup/Restore Configuration
**Difficulty:** Easy  
**Description:** Export/import config as backup  
**Implementation:**
- "Export Config" button - saves to chosen location
- "Import Config" button - loads from file
- Include timestamp in backup filename

### 9. Port Availability Check
**Difficulty:** Easy  
**Description:** Check if port is available before saving  
**Implementation:**
- When saving, test if port is in use
- Warn user if port is already taken
- Suggest alternative port

### 10. Configuration Validation
**Difficulty:** Easy  
**Description:** Validate all fields before saving  
**Implementation:**
- Check IP address format
- Check port ranges (1-65535)
- Check AE title format
- Check directory paths exist or can be created

### 11. Service Status Dashboard
**Difficulty:** Medium  
**Description:** Simple window showing service status and stats  
**Implementation:**
- New window/tab in config wizard
- Real-time updates (poll every 5 seconds)
- Show: Running status, images today, errors, uptime

### 12. Email Notifications
**Difficulty:** Medium  
**Description:** Send email on errors or daily summary  
**Implementation:**
- Add SMTP settings to config
- Send email on forwarding failures
- Optional daily summary email

### 13. Web Interface
**Difficulty:** Medium-Hard  
**Description:** Simple web interface for monitoring  
**Implementation:**
- Flask/FastAPI simple web server
- Show statistics, logs, config
- Start/stop service buttons

### 14. Scheduled Forwarding
**Difficulty:** Medium  
**Description:** Queue images and forward at scheduled times  
**Implementation:**
- Add "forward_schedule" to config
- Store failed forwards in queue
- Retry at scheduled intervals

### 15. Multiple PACS Support
**Difficulty:** Medium  
**Description:** Forward to multiple PACS servers  
**Implementation:**
- Change `pacs_host` to `pacs_servers` array
- Forward to all configured servers
- Track success per server

## Recommended Next Steps (Easy Wins)

1. ✅ **Local IP Address** - DONE
2. ✅ **Max PDU Size** - DONE
3. **Service Restart Notification** - Very useful
4. **Port Availability Check** - Prevents common errors
5. **Configuration Validation** - Better UX
6. **Current Statistics Display** - Quick visibility

These would significantly improve usability with minimal effort.
