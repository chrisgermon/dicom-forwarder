"""
DICOM Store-and-Forward Application
Receives DICOM images and forwards them to a PACS server
"""

import os
import sys
import logging
from datetime import datetime
from pathlib import Path
import argparse
import json
from typing import Optional
import time
import threading
from collections import defaultdict

from pynetdicom import AE, evt, StoragePresentationContexts
from pynetdicom.sop_class import Verification
from pydicom import dcmread
from pydicom.dataset import Dataset


class DicomForwarder:
    def __init__(self, config_path: str = "config.json"):
        """Initialize the DICOM forwarder with configuration."""
        self.config = self.load_config(config_path)
        self.setup_logging()
        self.ae = AE(ae_title=self.config['local_ae_title'])
        
        # Support all storage SOP classes
        self.ae.supported_contexts = StoragePresentationContexts
        self.ae.add_supported_context(Verification)
        
        # Statistics tracking
        self.stats = {
            'images_received': 0,
            'images_stored': 0,
            'images_forwarded': 0,
            'forward_failures': 0,
            'storage_failures': 0,
            'connections': 0,
            'start_time': datetime.now()
        }
        self.stats_lock = threading.Lock()
        
        # Stop event for graceful shutdown
        self.stop_event = threading.Event()
        self.server_thread = None
        
    def load_config(self, config_path: str) -> dict:
        """Load configuration from JSON file or use defaults."""
        default_config = {
            'local_ae_title': 'DICOM_FORWARDER',
            'local_port': 11112,
            'local_host': '0.0.0.0',
            'pacs_host': '127.0.0.1',
            'pacs_port': 11110,
            'pacs_ae_title': 'PACS_SERVER',
            'store_locally': True,
            'storage_dir': './dicom_storage',
            'log_dir': './logs',
            'max_pdu_size': 0,  # 0 = unlimited
            'forward_immediately': True,
            'retry_attempts': 3
        }
        
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                loaded_config = json.load(f)
                default_config.update(loaded_config)
                
        # Create directories if they don't exist
        Path(default_config['storage_dir']).mkdir(parents=True, exist_ok=True)
        Path(default_config['log_dir']).mkdir(parents=True, exist_ok=True)
        
        return default_config
    
    def setup_logging(self):
        """Configure enhanced logging with detailed formatting."""
        log_dir = Path(self.config['log_dir'])
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # Main log file (daily rotation)
        log_file = log_dir / f"dicom_forwarder_{datetime.now().strftime('%Y%m%d')}.log"
        
        # Detailed log file for debugging
        detailed_log_file = log_dir / f"dicom_forwarder_detailed_{datetime.now().strftime('%Y%m%d')}.log"
        
        # Statistics log file
        stats_log_file = log_dir / f"dicom_forwarder_stats_{datetime.now().strftime('%Y%m%d')}.log"
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.DEBUG)
        root_logger.handlers.clear()
        
        # Detailed format for file logging
        detailed_formatter = logging.Formatter(
            '%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Standard format for console
        console_formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%H:%M:%S'
        )
        
        # File handler with detailed format
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(detailed_formatter)
        
        # Detailed file handler for debugging
        detailed_handler = logging.FileHandler(detailed_log_file, encoding='utf-8')
        detailed_handler.setLevel(logging.DEBUG)
        detailed_handler.setFormatter(detailed_formatter)
        
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(console_formatter)
        
        # Statistics handler (separate file)
        stats_handler = logging.FileHandler(stats_log_file, encoding='utf-8')
        stats_handler.setLevel(logging.INFO)
        stats_formatter = logging.Formatter('%(asctime)s | %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
        stats_handler.setFormatter(stats_formatter)
        
        root_logger.addHandler(file_handler)
        root_logger.addHandler(detailed_handler)
        root_logger.addHandler(console_handler)
        
        self.logger = logging.getLogger(__name__)
        self.stats_logger = logging.getLogger('stats')
        self.stats_logger.addHandler(stats_handler)
        self.stats_logger.setLevel(logging.INFO)
        
        # Log startup information
        self.logger.info("="*80)
        self.logger.info("DICOM Forwarder Starting")
        self.logger.info("="*80)
        self.logger.info(f"Version: 1.0.0")
        self.logger.info(f"Python Version: {sys.version}")
        self.logger.info(f"Log Directory: {log_dir.absolute()}")
        self.logger.info(f"Main Log: {log_file}")
        self.logger.info(f"Detailed Log: {detailed_log_file}")
        self.logger.info(f"Statistics Log: {stats_log_file}")
        
    def handle_store(self, event):
        """Handle incoming C-STORE requests with enhanced logging."""
        start_time = time.time()
        ds = event.dataset
        ds.file_meta = event.file_meta
        
        # Get connection information
        # event.assoc.requestor is a ServiceUser object, not a dict
        requestor = getattr(event.assoc, 'requestor', None)
        if requestor:
            calling_ae = getattr(requestor, 'ae_title', 'UNKNOWN')
            calling_address = getattr(requestor, 'address', 'UNKNOWN')
        else:
            calling_ae = 'UNKNOWN'
            calling_address = 'UNKNOWN'
        
        # Generate filename from DICOM metadata
        patient_id = getattr(ds, 'PatientID', 'UNKNOWN')
        patient_name = getattr(ds, 'PatientName', 'UNKNOWN')
        study_uid = getattr(ds, 'StudyInstanceUID', 'UNKNOWN')
        study_date = getattr(ds, 'StudyDate', 'UNKNOWN')
        study_description = getattr(ds, 'StudyDescription', 'UNKNOWN')
        series_uid = getattr(ds, 'SeriesInstanceUID', 'UNKNOWN')
        series_number = getattr(ds, 'SeriesNumber', 'UNKNOWN')
        series_description = getattr(ds, 'SeriesDescription', 'UNKNOWN')
        instance_uid = getattr(ds, 'SOPInstanceUID', 'UNKNOWN')
        instance_number = getattr(ds, 'InstanceNumber', 'UNKNOWN')
        modality = getattr(ds, 'Modality', 'UNKNOWN')
        sop_class = getattr(ds, 'SOPClassUID', 'UNKNOWN')
        
        # Update statistics
        with self.stats_lock:
            self.stats['images_received'] += 1
            self.stats['connections'] += 1
        
        # Enhanced logging
        self.logger.info("="*80)
        self.logger.info(f"RECEIVED DICOM IMAGE #{self.stats['images_received']}")
        self.logger.info(f"  Connection: {calling_ae} from {calling_address}")
        self.logger.info(f"  Patient: {patient_id} ({patient_name})")
        self.logger.info(f"  Study: {study_uid}")
        self.logger.info(f"    Date: {study_date}, Description: {study_description}")
        self.logger.info(f"  Series: {series_uid}")
        self.logger.info(f"    Number: {series_number}, Description: {series_description}")
        self.logger.info(f"  Instance: {instance_uid}")
        self.logger.info(f"    Number: {instance_number}, Modality: {modality}")
        self.logger.info(f"  SOP Class: {sop_class}")
        self.logger.debug(f"  Full Dataset Tags: {list(ds.keys())[:20]}...")  # First 20 tags
        
        # Store locally if configured
        file_path = None
        storage_time = 0
        if self.config['store_locally']:
            storage_start = time.time()
            file_path = self.save_locally(ds, patient_id, study_uid, series_uid, instance_uid)
            storage_time = time.time() - storage_start
            if file_path:
                file_size = os.path.getsize(file_path) if file_path and os.path.exists(file_path) else 0
                self.logger.info(f"  Storage: SUCCESS ({file_size:,} bytes, {storage_time:.3f}s)")
                with self.stats_lock:
                    self.stats['images_stored'] += 1
            else:
                self.logger.error(f"  Storage: FAILED")
                with self.stats_lock:
                    self.stats['storage_failures'] += 1
        else:
            self.logger.debug("  Storage: DISABLED")
            
        # Forward to PACS if configured
        forward_time = 0
        if self.config['forward_immediately']:
            forward_start = time.time()
            success = self.forward_to_pacs(ds, file_path)
            forward_time = time.time() - forward_start
            if success:
                self.logger.info(f"  Forward: SUCCESS ({forward_time:.3f}s)")
                with self.stats_lock:
                    self.stats['images_forwarded'] += 1
                total_time = time.time() - start_time
                self.logger.info(f"  Total Processing Time: {total_time:.3f}s")
                self.logger.info("="*80)
                return 0x0000  # Success
            else:
                self.logger.error(f"  Forward: FAILED after {self.config['retry_attempts']} attempts ({forward_time:.3f}s)")
                with self.stats_lock:
                    self.stats['forward_failures'] += 1
                total_time = time.time() - start_time
                self.logger.error(f"  Total Processing Time: {total_time:.3f}s")
                self.logger.info("="*80)
                return 0xC000  # Failure
        else:
            self.logger.debug("  Forward: DISABLED (not forwarding immediately)")
        
        total_time = time.time() - start_time
        self.logger.info(f"  Total Processing Time: {total_time:.3f}s")
        self.logger.info("="*80)
        return 0x0000  # Success
    
    def save_locally(self, ds: Dataset, patient_id: str, study_uid: str, 
                     series_uid: str, instance_uid: str) -> str:
        """Save DICOM file locally with enhanced error logging."""
        try:
            # Create directory structure: storage_dir/PatientID/StudyUID/SeriesUID/
            save_dir = Path(self.config['storage_dir']) / patient_id / study_uid / series_uid
            save_dir.mkdir(parents=True, exist_ok=True)
            
            # Save with instance UID as filename
            file_path = save_dir / f"{instance_uid}.dcm"
            ds.save_as(file_path, write_like_original=False)
            
            file_size = file_path.stat().st_size
            self.logger.debug(f"Saved locally: {file_path} ({file_size:,} bytes)")
            return str(file_path)
        except PermissionError as e:
            self.logger.error(f"Permission denied saving locally: {e}")
            self.logger.error(f"  Directory: {save_dir}")
            return None
        except OSError as e:
            self.logger.error(f"OS error saving locally: {e}")
            self.logger.error(f"  Directory: {save_dir}")
            return None
        except Exception as e:
            self.logger.error(f"Error saving locally: {e}", exc_info=True)
            return None
    
    def forward_to_pacs(self, ds: Dataset, file_path: Optional[str] = None) -> bool:
        """Forward DICOM file to PACS server with enhanced logging."""
        patient_id = getattr(ds, 'PatientID', 'UNKNOWN')
        instance_uid = getattr(ds, 'SOPInstanceUID', 'UNKNOWN')
        sop_class_uid = getattr(ds, 'SOPClassUID', None)
        
        self.logger.debug(f"Forwarding to PACS: {self.config['pacs_host']}:{self.config['pacs_port']} (AE: {self.config['pacs_ae_title']})")
        
        # Create a separate AE for forwarding to avoid conflicts with the receiving AE
        forward_ae = AE(ae_title=self.config['local_ae_title'])
        
        # Add requested context for the dataset's SOP class
        if sop_class_uid:
            try:
                forward_ae.add_requested_context(sop_class_uid)
                self.logger.debug(f"  Added requested context for SOP Class: {sop_class_uid}")
            except Exception as e:
                self.logger.warning(f"  Could not add requested context for {sop_class_uid}: {e}")
                # Fallback: add all storage contexts
                forward_ae.requested_contexts = StoragePresentationContexts
        else:
            # If no SOP class, add all storage contexts
            forward_ae.requested_contexts = StoragePresentationContexts
        
        for attempt in range(1, self.config['retry_attempts'] + 1):
            try:
                self.logger.debug(f"  Attempt {attempt}/{self.config['retry_attempts']}: Establishing association...")
                
                # Create association with PACS
                assoc_start = time.time()
                # Handle max_pdu: 0 means unlimited, use a large default value
                max_pdu = self.config['max_pdu_size'] if self.config['max_pdu_size'] > 0 else 16384
                assoc = forward_ae.associate(
                    self.config['pacs_host'],
                    self.config['pacs_port'],
                    ae_title=self.config['pacs_ae_title'],
                    max_pdu=max_pdu
                )
                assoc_time = time.time() - assoc_start
                
                if assoc.is_established:
                    self.logger.debug(f"  Association established in {assoc_time:.3f}s")
                    
                    # Send C-STORE request
                    store_start = time.time()
                    status = assoc.send_c_store(ds)
                    store_time = time.time() - store_start
                    
                    # Release association
                    assoc.release()
                    
                    if status and status.Status == 0x0000:
                        self.logger.debug(f"  C-STORE successful in {store_time:.3f}s")
                        return True
                    else:
                        status_code = status.Status if status else 'None'
                        self.logger.warning(f"  PACS returned error status: {status_code} (attempt {attempt}/{self.config['retry_attempts']})")
                        if status and hasattr(status, 'Status'):
                            self.logger.debug(f"  Status details: {status}")
                else:
                    self.logger.warning(f"  Failed to establish association (attempt {attempt}/{self.config['retry_attempts']}, {assoc_time:.3f}s)")
                    if hasattr(assoc, 'acse'):
                        self.logger.debug(f"  Association details: {assoc.acse}")
                    
            except ConnectionRefusedError as e:
                self.logger.error(f"  Connection refused by PACS (attempt {attempt}/{self.config['retry_attempts']}): {e}")
            except TimeoutError as e:
                self.logger.error(f"  Connection timeout to PACS (attempt {attempt}/{self.config['retry_attempts']}): {e}")
            except Exception as e:
                self.logger.error(f"  Error forwarding to PACS (attempt {attempt}/{self.config['retry_attempts']}): {e}", exc_info=True)
                
        self.logger.error(f"  All {self.config['retry_attempts']} forwarding attempts failed")
        return False
    
    def log_statistics(self):
        """Log current statistics."""
        with self.stats_lock:
            uptime = datetime.now() - self.stats['start_time']
            self.stats_logger.info("STATISTICS")
            self.stats_logger.info(f"  Uptime: {uptime}")
            self.stats_logger.info(f"  Images Received: {self.stats['images_received']}")
            self.stats_logger.info(f"  Images Stored: {self.stats['images_stored']}")
            self.stats_logger.info(f"  Images Forwarded: {self.stats['images_forwarded']}")
            self.stats_logger.info(f"  Forward Failures: {self.stats['forward_failures']}")
            self.stats_logger.info(f"  Storage Failures: {self.stats['storage_failures']}")
            self.stats_logger.info(f"  Total Connections: {self.stats['connections']}")
            if self.stats['images_received'] > 0:
                success_rate = (self.stats['images_forwarded'] / self.stats['images_received']) * 100
                self.stats_logger.info(f"  Forward Success Rate: {success_rate:.2f}%")
    
    def stop(self):
        """Stop the DICOM SCP server gracefully."""
        self.logger.info("="*80)
        self.logger.info("Shutting down DICOM forwarder...")
        self.stop_event.set()
        
        # Shutdown the server
        if hasattr(self.ae, 'shutdown'):
            try:
                self.ae.shutdown()
            except Exception as e:
                self.logger.warning(f"Error during AE shutdown: {e}")
        
        # Log final statistics
        self.log_statistics()
        self.logger.info("="*80)
    
    def start(self):
        """Start the DICOM SCP server with enhanced logging."""
        handlers = [(evt.EVT_C_STORE, self.handle_store)]
        
        self.logger.info("="*80)
        self.logger.info("CONFIGURATION")
        self.logger.info("="*80)
        self.logger.info(f"  Local Receiver:")
        self.logger.info(f"    AE Title: {self.config['local_ae_title']}")
        self.logger.info(f"    Host: {self.config['local_host']}")
        self.logger.info(f"    Port: {self.config['local_port']}")
        self.logger.info(f"  PACS Server:")
        self.logger.info(f"    Host: {self.config['pacs_host']}")
        self.logger.info(f"    Port: {self.config['pacs_port']}")
        self.logger.info(f"    AE Title: {self.config['pacs_ae_title']}")
        self.logger.info(f"  Storage:")
        self.logger.info(f"    Local Storage: {'ENABLED' if self.config['store_locally'] else 'DISABLED'}")
        if self.config['store_locally']:
            self.logger.info(f"    Storage Directory: {self.config['storage_dir']}")
        self.logger.info(f"  Forwarding:")
        self.logger.info(f"    Immediate Forward: {'ENABLED' if self.config['forward_immediately'] else 'DISABLED'}")
        self.logger.info(f"    Retry Attempts: {self.config['retry_attempts']}")
        self.logger.info(f"    Max PDU Size: {self.config['max_pdu_size'] if self.config['max_pdu_size'] > 0 else 'Unlimited'}")
        self.logger.info("="*80)
        self.logger.info("Starting DICOM SCP server...")
        
        # Reset stop event
        self.stop_event.clear()
        
        # Log statistics every 10 images or every 5 minutes
        def stats_timer():
            import time
            last_count = 0
            while not self.stop_event.is_set():
                # Wait with timeout so we can check stop event
                if self.stop_event.wait(300):  # 5 minutes or until stopped
                    break
                with self.stats_lock:
                    if self.stats['images_received'] != last_count:
                        self.log_statistics()
                        last_count = self.stats['images_received']
        
        stats_thread = threading.Thread(target=stats_timer, daemon=True)
        stats_thread.start()
        
        try:
            # Start server in blocking mode in a separate thread
            # This allows us to interrupt it when stop is called
            server_started = threading.Event()
            server_error = None
            
            def run_server():
                nonlocal server_error
                try:
                    self.logger.info(f"Server thread starting...")
                    self.ae.start_server(
                        (self.config['local_host'], self.config['local_port']),
                        evt_handlers=handlers,
                        block=True
                    )
                except Exception as e:
                    server_error = e
                    if not self.stop_event.is_set():
                        self.logger.error(f"Server thread error: {e}", exc_info=True)
                finally:
                    if not self.stop_event.is_set():
                        self.logger.info("Server thread exited")
            
            self.server_thread = threading.Thread(target=run_server, daemon=True)
            self.server_thread.start()
            
            # Give the server a moment to start
            time.sleep(0.5)
            
            # Check if server started successfully
            if server_error:
                raise server_error
            
            if self.server_thread.is_alive():
                self.logger.info("="*80)
                self.logger.info("DICOM SCP SERVER STARTED SUCCESSFULLY")
                self.logger.info(f"  Listening on: {self.config['local_host']}:{self.config['local_port']}")
                self.logger.info(f"  AE Title: {self.config['local_ae_title']}")
                self.logger.info("  Ready to receive DICOM images...")
                self.logger.info("="*80)
            else:
                raise RuntimeError("Server thread exited immediately after start")
            
            # Wait for stop event or server thread to finish
            while not self.stop_event.is_set():
                if not self.server_thread.is_alive():
                    if not self.stop_event.is_set():
                        self.logger.warning("Server thread stopped unexpectedly")
                    break
                time.sleep(0.5)  # Check every 500ms
            
            # If stop was requested, try to shutdown gracefully
            if self.stop_event.is_set():
                try:
                    # Try to shutdown the AE
                    if hasattr(self.ae, 'shutdown'):
                        self.ae.shutdown()
                except Exception as e:
                    self.logger.warning(f"Error during shutdown: {e}")
                
        except KeyboardInterrupt:
            self.logger.info("="*80)
            self.logger.info("Shutting down DICOM forwarder (KeyboardInterrupt)...")
            self.log_statistics()
            self.logger.info("="*80)
        except OSError as e:
            self.logger.error("="*80)
            self.logger.error(f"Server startup error: {e}")
            if "Address already in use" in str(e) or "Only one usage of each socket address" in str(e):
                self.logger.error(f"  Port {self.config['local_port']} is already in use!")
                self.logger.error(f"  Check if another instance is running or change the port in config.json")
            self.logger.error("="*80)
            raise
        except Exception as e:
            self.logger.error("="*80)
            self.logger.error(f"Server error: {e}", exc_info=True)
            self.logger.error("="*80)
            raise
        finally:
            # Ensure we stop gracefully
            if not self.stop_event.is_set():
                self.stop()


def main():
    parser = argparse.ArgumentParser(description='DICOM Store-and-Forward Service')
    parser.add_argument('--config', default='config.json', help='Path to configuration file')
    args = parser.parse_args()
    
    forwarder = DicomForwarder(config_path=args.config)
    forwarder.start()


if __name__ == '__main__':
    main()