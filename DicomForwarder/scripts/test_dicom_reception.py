"""
Test script to send a test DICOM image to the DICOM Forwarder
This helps verify that the system is receiving images correctly
"""

import sys
import os
from pathlib import Path
import json
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from pynetdicom import AE
    from pynetdicom.sop_class import CTImageStorage, MRImageStorage
    from pydicom import Dataset
    from pydicom.uid import generate_uid
    from pydicom.dataset import FileDataset
    from pydicom.sequence import Sequence
except ImportError:
    print("ERROR: Required packages not installed.")
    print("Please install: pip install pynetdicom pydicom")
    sys.exit(1)


def create_test_dicom():
    """Create a minimal test DICOM dataset."""
    # Create a basic DICOM dataset
    ds = Dataset()
    
    # File meta information
    ds.file_meta = Dataset()
    ds.file_meta.TransferSyntaxUID = '1.2.840.10008.1.2.1'  # Explicit VR Little Endian
    ds.file_meta.MediaStorageSOPClassUID = CTImageStorage
    ds.file_meta.MediaStorageSOPInstanceUID = generate_uid()
    ds.file_meta.ImplementationClassUID = '1.2.3.4.5'
    
    # Required DICOM fields
    ds.PatientName = "TEST^PATIENT"
    ds.PatientID = "TEST001"
    ds.PatientBirthDate = "20000101"
    ds.PatientSex = "M"
    
    ds.StudyInstanceUID = generate_uid()
    ds.StudyDate = datetime.now().strftime("%Y%m%d")
    ds.StudyTime = datetime.now().strftime("%H%M%S")
    ds.StudyDescription = "Test Study"
    ds.AccessionNumber = "TEST001"
    
    ds.SeriesInstanceUID = generate_uid()
    ds.SeriesNumber = "1"
    ds.SeriesDescription = "Test Series"
    ds.Modality = "CT"
    
    ds.SOPInstanceUID = ds.file_meta.MediaStorageSOPInstanceUID
    ds.SOPClassUID = CTImageStorage
    ds.InstanceNumber = "1"
    
    # Image information (minimal required fields)
    ds.Rows = 256
    ds.Columns = 256
    ds.BitsAllocated = 16
    ds.BitsStored = 12
    ds.HighBit = 11
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelSpacing = [1.0, 1.0]
    ds.SliceThickness = 1.0
    
    # Create minimal pixel data (256x256 = 65536 pixels, 2 bytes each = 131072 bytes)
    try:
        import numpy as np
        ds.PixelData = np.zeros((256, 256), dtype=np.uint16).tobytes()
    except ImportError:
        # Fallback: create pixel data without numpy
        ds.PixelData = bytes(256 * 256 * 2)  # 256x256 image, 2 bytes per pixel
    
    return ds


def send_test_image(config_path=None):
    """Send a test DICOM image to the forwarder."""
    
    # Load configuration
    if config_path is None:
        # Try to find config in common locations
        possible_paths = [
            Path("config.json"),
            Path("C:/Program Files/DICOM Forwarder/config.json"),
            Path("C:/Program Files (x86)/DICOM Forwarder/config.json"),
        ]
        
        config_path = None
        for path in possible_paths:
            if path.exists():
                config_path = path
                break
        
        if not config_path:
            print("ERROR: Could not find config.json")
            print("Please specify the path to config.json")
            return False
    
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
    except Exception as e:
        print(f"ERROR: Could not load config.json: {e}")
        return False
    
    local_ae_title = config.get('local_ae_title', 'DICOM_FORWARDER')
    local_port = config.get('local_port', 11112)
    local_host = config.get('local_host', '127.0.0.1')
    
    print("="*60)
    print("DICOM Forwarder - Test Image Sender")
    print("="*60)
    print(f"Target: {local_host}:{local_port}")
    print(f"AE Title: {local_ae_title}")
    print()
    
    # Create test DICOM dataset
    print("Creating test DICOM image...")
    ds = create_test_dicom()
    
    print(f"Patient ID: {ds.PatientID}")
    print(f"Study UID: {ds.StudyInstanceUID}")
    print(f"Series UID: {ds.SeriesInstanceUID}")
    print(f"Instance UID: {ds.SOPInstanceUID}")
    print()
    
    # Create association and send
    print("Connecting to DICOM Forwarder...")
    ae = AE(ae_title='TEST_CLIENT')
    ae.add_requested_context(CTImageStorage)
    
    try:
        assoc = ae.associate(local_host, local_port, ae_title=local_ae_title)
        
        if assoc.is_established:
            print("✓ Connection established!")
            print("Sending test image...")
            
            status = assoc.send_c_store(ds)
            
            if status and status.Status == 0x0000:
                print("✓ SUCCESS! Test image sent successfully!")
                print()
                print("Check the following to verify reception:")
                print(f"  1. Logs: {config.get('log_dir', './logs')}")
                print(f"  2. Storage: {config.get('storage_dir', './dicom_storage')}")
                print()
                assoc.release()
                return True
            else:
                print(f"✗ ERROR: Server returned status: {status}")
                assoc.release()
                return False
        else:
            print("✗ ERROR: Could not establish association")
            print("Make sure:")
            print(f"  1. The service is running on port {local_port}")
            print(f"  2. The AE Title matches: {local_ae_title}")
            print(f"  3. Firewall allows connections on port {local_port}")
            return False
            
    except Exception as e:
        print(f"✗ ERROR: {e}")
        print()
        print("Troubleshooting:")
        print(f"  1. Check if service is running: services.msc")
        print(f"  2. Verify port {local_port} is not blocked by firewall")
        print(f"  3. Check logs in: {config.get('log_dir', './logs')}")
        return False


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Send test DICOM image to forwarder')
    parser.add_argument('--config', help='Path to config.json', default=None)
    args = parser.parse_args()
    
    success = send_test_image(args.config)
    sys.exit(0 if success else 1)
