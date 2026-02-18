# D2D - Document to DICOM Converter Integration

## Overview
The D2D (Document to DICOM) converter is now integrated into VRG-Hub, allowing users to convert PDF, JPG, and PNG files into DICOM format and send them directly to PACS systems.

## Integration Details

### Deployment Architecture
- **Hosting**: Azure Container Apps
- **URL**: https://d2d-app-vnet.kindglacier-71e74fc9.australiasoutheast.azurecontainerapps.io
- **Location**: Australia Southeast
- **Network**: VNet integrated with Vision Radiology infrastructure
- **PACS Connectivity**: 10.17.1.21:5000

### Access Points in VRG-Hub

#### 1. Dedicated Page with Embedded Interface
**URL**: `/dicom-converter`

The main interface is accessible through a dedicated page that embeds the D2D tool using an iframe. This provides:
- Full D2D functionality within VRG-Hub
- Step-by-step workflow guides
- Quick access buttons
- Refresh functionality

**Features**:
- Upload documents (PDF, JPG, PNG)
- Enter patient metadata
- Configure DICOM destinations
- Test PACS connectivity
- Convert and send to PACS

#### 2. Integrations Page Card
**URL**: `/integrations`

A discovery card on the Integrations page provides:
- Feature overview
- Deployment details
- Quick links to the converter
- Status indicator (Live)

### Usage Workflow

1. **Navigate to D2D Converter**
   - Go to `/dicom-converter` in VRG-Hub
   - Or access via Integrations page

2. **Upload Document**
   - Drag and drop or browse for file
   - Supports PDF, JPG, PNG formats

3. **Enter Metadata**
   - Patient Name (required)
   - Patient ID (required)
   - Date of Birth (optional)
   - Sex (optional)
   - Study Description
   - Series Description
   - Accession Number
   - Referring Physician

4. **Configure Destination**
   - Add DICOM destination if not configured
   - Test connection to PACS
   - Select destination for sending

5. **Convert and Send**
   - Click convert button
   - Review preview
   - Send to PACS or save to archive

### Features

- **Multi-format Support**: PDF, JPG, PNG
- **DICOM Compliance**: Full DICOM metadata support
- **PACS Integration**: Direct C-STORE to PACS
- **Connection Testing**: Built-in connectivity tests
- **Archive Management**: View and manage converted files
- **VNet Security**: Secure private network connectivity

### Technical Implementation

#### New Files Created
1. `/src/pages/DicomConverter.tsx` - Main page component with iframe
2. `/docs/D2D-INTEGRATION.md` - This documentation

#### Modified Files
1. `/src/App.tsx` - Added route and lazy import
2. `/src/pages/Integrations.tsx` - Added D2D card

#### Route Configuration
```typescript
{ path: "/dicom-converter", element: <DicomConverter /> }
```

### Security Considerations

- **Iframe Sandbox**: Uses restricted sandbox attributes
- **VNet Integration**: Private network connectivity to PACS
- **HTTPS Only**: All traffic encrypted
- **No Credentials Stored**: PACS credentials configured per-session

### Maintenance

#### Updating the D2D Application
The D2D application is deployed separately in Azure. To update:

```bash
cd /home/claudeagent/d2d
./update-d2d.sh
```

#### Viewing Logs
```bash
az containerapp logs show \
  --name d2d-app-vnet \
  --resource-group d2d-rg \
  --follow
```

#### Checking Status
```bash
az containerapp show \
  --name d2d-app-vnet \
  --resource-group d2d-rg \
  --query "properties.runningStatus"
```

### Cost Estimate
- **Container Apps**: $0-10/month (scales to zero)
- **Storage**: ~$0.50/month
- **Container Registry**: ~$5/month
- **Total**: ~$6-15/month

### Network Configuration

#### Azure VNet
- **VNet**: vnet-migration (10.200.0.0/16)
- **Subnet**: snet-containerapps (10.200.2.0/23)
- **Container IPs**: Dynamic from 10.200.2.0 - 10.200.3.255

#### PACS Configuration Required
On your PACS at 10.17.1.21, allow:
- **Source**: 10.200.2.0/23 (entire subnet)
- **Destination**: 10.17.1.21:5000
- **Protocol**: TCP (DICOM)
- **AE Title**: D2D_SCU (configurable)

### Troubleshooting

#### D2D Not Loading in Iframe
1. Check if D2D Azure app is running
2. Verify network connectivity
3. Check browser console for errors
4. Try "Open in New Window" button

#### Cannot Connect to PACS
1. Verify PACS allows 10.200.2.0/23 subnet
2. Check VPN/ExpressRoute is active
3. Test from another machine on 10.200.x.x network
4. Review Azure container logs

#### Iframe Security Warnings
The iframe uses sandbox attributes for security. If issues arise:
- Use "Open in New Window" button
- Configure browser to allow iframe content

### Future Enhancements

Potential improvements:
1. Single Sign-On (SSO) integration
2. Pre-filled patient data from VRG systems
3. Batch conversion support
4. Integration with document management
5. Automatic PACS destination selection

### Support

- **D2D Issues**: Check logs in Azure Container Apps
- **VRG-Hub Integration**: Contact VRG-Hub support
- **PACS Connectivity**: Verify network configuration
- **Azure Infrastructure**: Review deployment docs in /home/claudeagent/d2d/

### References

- D2D Deployment Info: `/home/claudeagent/d2d/DEPLOYMENT-INFO.txt`
- Network Status: `/home/claudeagent/d2d/CONNECTIVITY-STATUS.md`
- Update Script: `/home/claudeagent/d2d/update-d2d.sh`
