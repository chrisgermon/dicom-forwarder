"""
DICOM Store-and-Forward Application
Receives DICOM images and forwards them to a PACS server
"""

import os
import sys
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, timedelta
from pathlib import Path
import argparse
import json
from typing import Optional
import time
import threading
from collections import defaultdict

from pynetdicom import AE, evt, StoragePresentationContexts
from pynetdicom.sop_class import Verification
from pynetdicom.events import Event
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
        
        # Track forwarded files for auto-delete
        self.forwarded_files = {}  # {file_path: forward_timestamp}
        self.forwarded_files_lock = threading.Lock()
        self.forwarded_files_db = Path(self.config['log_dir']) / 'forwarded_files.json'
        self.load_forwarded_files_db()
        
    def load_config(self, config_path: str) -> dict:
        """Load configuration from JSON file or use defaults."""
        # Normalize the config path to absolute
        if not os.path.isabs(config_path):
            config_path = os.path.abspath(config_path)
        
        # Get the base directory (where config.json is located)
        config_dir = os.path.dirname(config_path) if config_path else os.getcwd()
        if not config_dir:
            config_dir = os.getcwd()
        
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
            'retry_attempts': 3,
            'accept_any_ae_title': False,  # Accept any Called AE Title
            'auto_delete_days': 0,  # 0 = disabled, number of days to keep forwarded images
            'log_max_bytes': 10 * 1024 * 1024,  # 10 MB per log file
            'log_backup_count': 5  # Keep 5 backup log files
        }
        
        # Log config loading attempt
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Loading config from: {config_path}")
        logger.info(f"Config file exists: {os.path.exists(config_path)}")
        
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    loaded_config = json.load(f)
                    logger.info(f"Successfully loaded config file. Keys: {list(loaded_config.keys())}")
                    default_config.update(loaded_config)
                    logger.info(f"Config values after loading:")
                    logger.info(f"  local_ae_title: {default_config.get('local_ae_title')}")
                    logger.info(f"  local_port: {default_config.get('local_port')}")
                    logger.info(f"  pacs_host: {default_config.get('pacs_host')}")
                    logger.info(f"  pacs_port: {default_config.get('pacs_port')}")
                    logger.info(f"  pacs_ae_title: {default_config.get('pacs_ae_title')}")
            except Exception as e:
                logger.error(f"Error loading config file: {e}", exc_info=True)
        else:
            logger.warning(f"Config file not found at {config_path}, using defaults")
        
        # Convert relative paths to absolute paths based on config file location
        # This ensures paths work correctly when running as a service
        if not os.path.isabs(default_config['storage_dir']):
            default_config['storage_dir'] = os.path.normpath(os.path.join(config_dir, default_config['storage_dir']))
        
        if not os.path.isabs(default_config['log_dir']):
            default_config['log_dir'] = os.path.normpath(os.path.join(config_dir, default_config['log_dir']))
        
        # Create directories if they don't exist
        Path(default_config['storage_dir']).mkdir(parents=True, exist_ok=True)
        Path(default_config['log_dir']).mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Final config paths:")
        logger.info(f"  storage_dir: {default_config['storage_dir']}")
        logger.info(f"  log_dir: {default_config['log_dir']}")
        
        return default_config
    
    def setup_logging(self):
        """Configure enhanced logging with detailed formatting and rotation."""
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
        
        # File handler with rotation (max size and backup count from config)
        max_bytes = self.config.get('log_max_bytes', 10 * 1024 * 1024)  # Default 10 MB
        backup_count = self.config.get('log_backup_count', 5)  # Default 5 backups
        
        file_handler = RotatingFileHandler(
            log_file, 
            maxBytes=max_bytes, 
            backupCount=backup_count,
            encoding='utf-8'
        )
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(detailed_formatter)
        
        # Detailed file handler for debugging with rotation
        detailed_handler = RotatingFileHandler(
            detailed_log_file,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding='utf-8'
        )
        detailed_handler.setLevel(logging.DEBUG)
        detailed_handler.setFormatter(detailed_formatter)
        
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(console_formatter)
        
        # Statistics handler (separate file) with rotation
        stats_handler = RotatingFileHandler(
            stats_log_file,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding='utf-8'
        )
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
        self.logger.info(f"Log Rotation: Max {max_bytes / 1024 / 1024:.1f} MB, {backup_count} backups")
        
    def load_forwarded_files_db(self):
        """Load the database of forwarded files."""
        try:
            if self.forwarded_files_db.exists():
                with open(self.forwarded_files_db, 'r') as f:
                    data = json.load(f)
                    # Convert string keys (file paths) to actual paths and timestamps
                    self.forwarded_files = {k: float(v) for k, v in data.items()}
                    self.logger.debug(f"Loaded {len(self.forwarded_files)} forwarded file records")
        except Exception as e:
            self.logger.warning(f"Error loading forwarded files database: {e}")
            self.forwarded_files = {}
    
    def save_forwarded_files_db(self):
        """Save the database of forwarded files."""
        try:
            with self.forwarded_files_lock:
                data = {str(k): float(v) for k, v in self.forwarded_files.items()}
            with open(self.forwarded_files_db, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            self.logger.warning(f"Error saving forwarded files database: {e}")
    
    def cleanup_old_forwarded_files(self):
        """Delete old forwarded files that exceed the retention period."""
        auto_delete_days = self.config.get('auto_delete_days', 0)
        if auto_delete_days <= 0:
            return
        
        cutoff_time = time.time() - (auto_delete_days * 24 * 3600)
        deleted_count = 0
        deleted_size = 0
        errors = []
        
        self.logger.info(f"Starting cleanup: Deleting forwarded files older than {auto_delete_days} days...")
        
        with self.forwarded_files_lock:
            files_to_delete = []
            for file_path, forward_time in list(self.forwarded_files.items()):
                if forward_time < cutoff_time:
                    files_to_delete.append((file_path, forward_time))
        
        for file_path, forward_time in files_to_delete:
            try:
                file_path_obj = Path(file_path)
                if file_path_obj.exists():
                    file_size = file_path_obj.stat().st_size
                    file_path_obj.unlink()
                    deleted_count += 1
                    deleted_size += file_size
                    
                    # Remove from tracking
                    with self.forwarded_files_lock:
                        self.forwarded_files.pop(file_path, None)
                    
                    self.logger.debug(f"Deleted old forwarded file: {file_path} (forwarded {datetime.fromtimestamp(forward_time).strftime('%Y-%m-%d %H:%M:%S')})")
                else:
                    # File doesn't exist, just remove from tracking
                    with self.forwarded_files_lock:
                        self.forwarded_files.pop(file_path, None)
            except Exception as e:
                errors.append(f"{file_path}: {e}")
                self.logger.warning(f"Error deleting file {file_path}: {e}")
        
        if deleted_count > 0:
            self.logger.info(f"Cleanup complete: Deleted {deleted_count} files ({deleted_size / 1024 / 1024:.2f} MB)")
            self.save_forwarded_files_db()
        
        if errors:
            self.logger.warning(f"Cleanup had {len(errors)} errors")
        else:
            self.logger.debug("Cleanup completed successfully with no errors")
    
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
                
                # Track forwarded file for auto-delete
                if file_path and os.path.exists(file_path):
                    with self.forwarded_files_lock:
                        self.forwarded_files[file_path] = time.time()
                    self.save_forwarded_files_db()
                
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
            self.logger.error(f"Permission error saving file: {e}")
            return None
        except OSError as e:
            self.logger.error(f"OS error saving file: {e}")
            return None
        except Exception as e:
            self.logger.error(f"Unexpected error saving file: {e}", exc_info=True)
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
        
        # Save forwarded files database
        self.save_forwarded_files_db()
        
        self.logger.info("="*80)
    
    def handle_requested(self, event):
        """Handle association request events."""
        requestor = getattr(event.assoc, 'requestor', None)
        if requestor:
            calling_ae = getattr(requestor, 'ae_title', 'UNKNOWN')
            calling_address = getattr(requestor, 'address', 'UNKNOWN')
        else:
            calling_ae = 'UNKNOWN'
            calling_address = 'UNKNOWN'
        
        # Get called AE title (what they're calling us)
        called_ae = getattr(event.assoc, 'acceptor', None)
        if called_ae:
            called_ae_title = getattr(called_ae, 'ae_title', 'UNKNOWN')
        else:
            # Try to get from the association
            if hasattr(event.assoc, 'acceptor') and hasattr(event.assoc.acceptor, 'ae_title'):
                called_ae_title = event.assoc.acceptor.ae_title
            else:
                called_ae_title = 'UNKNOWN'
        
        # Log requested presentation contexts
        requested_contexts = []
        if hasattr(event.assoc, 'requestor') and hasattr(event.assoc.requestor, 'requested_contexts'):
            for context in event.assoc.requestor.requested_contexts:
                requested_contexts.append(f"{context.abstract_syntax} ({context.transfer_syntax})")
        
        self.logger.info(f"Association Request from {calling_ae} ({calling_address})")
        self.logger.info(f"  Called AE Title: {called_ae_title}, Our AE Title: {self.config['local_ae_title']}")
        
        # If accept_any_ae_title is enabled, log that we'll accept it
        if self.config.get('accept_any_ae_title', False):
            if called_ae_title != self.config['local_ae_title']:
                self.logger.info(f"  ✓ Will accept association with different Called AE Title (accept_any_ae_title enabled)")
        
        if requested_contexts:
            self.logger.debug(f"  Requested contexts: {len(requested_contexts)}")
            for ctx in requested_contexts[:5]:  # Log first 5
                self.logger.debug(f"    - {ctx}")
            if len(requested_contexts) > 5:
                self.logger.debug(f"    ... and {len(requested_contexts) - 5} more")
        
        # Log our supported contexts
        self.logger.debug(f"  Our supported contexts: {len(self.ae.supported_contexts)}")
    
    def handle_rejected(self, event):
        """Handle association rejection events."""
        try:
            requestor = getattr(event.assoc, 'requestor', None)
            if requestor:
                calling_ae = getattr(requestor, 'ae_title', 'UNKNOWN')
                calling_address = getattr(requestor, 'address', 'UNKNOWN')
            else:
                calling_ae = 'UNKNOWN'
                calling_address = 'UNKNOWN'
            
            # Get rejection reason - try multiple ways to access it
            rejection_reason = "Unknown reason"
            rejection_source = "Unknown"
            
            # Try to get from event.assoc.acse
            if hasattr(event, 'assoc') and hasattr(event.assoc, 'acse'):
                acse = event.assoc.acse
                if hasattr(acse, 'reject_reason'):
                    rejection_reason = acse.reject_reason
                if hasattr(acse, 'reject_source'):
                    rejection_source = acse.reject_source
            
            # Try to get from event directly
            if hasattr(event, 'reject_reason'):
                rejection_reason = event.reject_reason
            if hasattr(event, 'reject_source'):
                rejection_source = event.reject_source
            
            # Log detailed rejection information
            self.logger.warning("="*80)
            self.logger.warning(f"REJECTED Association from {calling_ae} ({calling_address})")
            self.logger.warning(f"  Rejection Source: {rejection_source}")
            self.logger.warning(f"  Rejection Reason: {rejection_reason}")
            self.logger.warning(f"  Our AE Title: {self.config['local_ae_title']}")
            self.logger.warning(f"  Listening on: {self.config['local_host']}:{self.config['local_port']}")
            self.logger.warning(f"  Accept Any AE Title: {'ENABLED' if self.config.get('accept_any_ae_title', False) else 'DISABLED'}")
            
            # Check if AE title mismatch (only warn if not accepting any)
            if calling_ae != 'UNKNOWN' and calling_ae != self.config['local_ae_title']:
                if not self.config.get('accept_any_ae_title', False):
                    self.logger.warning(f"  ⚠️  AE Title mismatch! Caller: '{calling_ae}', Expected: '{self.config['local_ae_title']}'")
                    self.logger.warning(f"  💡 Tip: Enable 'accept_any_ae_title' in config to accept any AE Title")
                else:
                    self.logger.debug(f"  AE Title mismatch (accepted due to accept_any_ae_title): '{calling_ae}' vs '{self.config['local_ae_title']}'")
            
            # Log requested contexts if available
            if hasattr(event.assoc, 'requestor') and hasattr(event.assoc.requestor, 'requested_contexts'):
                requested = event.assoc.requestor.requested_contexts
                self.logger.debug(f"  Requested {len(requested)} presentation contexts")
                if len(requested) == 0:
                    self.logger.warning(f"  ⚠️  No presentation contexts requested!")
                else:
                    self.logger.debug(f"  First few requested contexts:")
                    for ctx in list(requested)[:3]:
                        self.logger.debug(f"    - {ctx}")
            
            # Log our supported contexts
            self.logger.debug(f"  We support {len(self.ae.supported_contexts)} presentation contexts")
            self.logger.warning("="*80)
        except Exception as e:
            self.logger.error(f"Error in handle_rejected: {e}")
            import traceback
            self.logger.debug(traceback.format_exc())
    
    def handle_accepted(self, event):
        """Handle association accepted events."""
        requestor = getattr(event.assoc, 'requestor', None)
        if requestor:
            calling_ae = getattr(requestor, 'ae_title', 'UNKNOWN')
            calling_address = getattr(requestor, 'address', 'UNKNOWN')
        else:
            calling_ae = 'UNKNOWN'
            calling_address = 'UNKNOWN'
        
        self.logger.info(f"ACCEPTED Association from {calling_ae} ({calling_address})")
    
    def start(self):
        """Start the DICOM SCP server with enhanced logging."""
        # Try to register association event handlers if they exist
        handlers = [(evt.EVT_C_STORE, self.handle_store)]
        
        # Add association event handlers if available in pynetdicom
        try:
            if hasattr(evt, 'EVT_REQUESTED'):
                handlers.append((evt.EVT_REQUESTED, self.handle_requested))
        except:
            pass
        
        try:
            if hasattr(evt, 'EVT_REJECTED'):
                handlers.append((evt.EVT_REJECTED, self.handle_rejected))
        except:
            pass
        
        try:
            if hasattr(evt, 'EVT_ACCEPTED'):
                handlers.append((evt.EVT_ACCEPTED, self.handle_accepted))
        except:
            pass
        
        self.logger.info("="*80)
        self.logger.info("CONFIGURATION")
        self.logger.info("="*80)
        self.logger.info(f"  Local Receiver:")
        self.logger.info(f"    AE Title: {self.config['local_ae_title']}")
        self.logger.info(f"    Host: {self.config['local_host']}")
        self.logger.info(f"    Port: {self.config['local_port']}")
        self.logger.info(f"    Accept Any AE Title: {'ENABLED' if self.config.get('accept_any_ae_title', False) else 'DISABLED'}")
        self.logger.info(f"  PACS Server:")
        self.logger.info(f"    Host: {self.config['pacs_host']}")
        self.logger.info(f"    Port: {self.config['pacs_port']}")
        self.logger.info(f"    AE Title: {self.config['pacs_ae_title']}")
        self.logger.info(f"  Storage:")
        self.logger.info(f"    Local Storage: {'ENABLED' if self.config['store_locally'] else 'DISABLED'}")
        if self.config['store_locally']:
            self.logger.info(f"    Storage Directory: {self.config['storage_dir']}")
            auto_delete_days = self.config.get('auto_delete_days', 0)
            if auto_delete_days > 0:
                self.logger.info(f"    Auto-Delete: ENABLED (after {auto_delete_days} days)")
            else:
                self.logger.info(f"    Auto-Delete: DISABLED")
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
        
        # Start auto-delete cleanup thread if enabled
        if self.config.get('auto_delete_days', 0) > 0:
            def cleanup_timer():
                while not self.stop_event.is_set():
                    # Wait 1 hour or until stopped
                    if self.stop_event.wait(3600):
                        break
                    self.cleanup_old_forwarded_files()
            
            cleanup_thread = threading.Thread(target=cleanup_timer, daemon=True)
            cleanup_thread.start()
            self.logger.info(f"Auto-delete enabled: Will delete forwarded images older than {self.config['auto_delete_days']} days")
        
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
                    self.logger.error(f"Server error: {e}", exc_info=True)
                finally:
                    server_started.set()
            
            self.server_thread = threading.Thread(target=run_server, daemon=True)
            self.server_thread.start()
            
            # Wait a moment for server to start
            if server_started.wait(timeout=5):
                if server_error:
                    raise server_error
            else:
                self.logger.warning("Server start timeout - may still be starting...")
            
            self.logger.info("="*80)
            self.logger.info("DICOM SCP SERVER STARTED SUCCESSFULLY")
            self.logger.info(f"Listening on {self.config['local_host']}:{self.config['local_port']}")
            self.logger.info(f"AE Title: {self.config['local_ae_title']}")
            if self.config.get('accept_any_ae_title', False):
                self.logger.info("Accepting associations with ANY Called AE Title")
            self.logger.info("="*80)
            
            # Wait for stop event
            while not self.stop_event.is_set():
                self.stop_event.wait(1)
                
        except KeyboardInterrupt:
            self.logger.info("Received keyboard interrupt")
            self.stop()
        except Exception as e:
            self.logger.error(f"Fatal error starting server: {e}", exc_info=True)
            self.stop()
            raise


def main():
    """Main entry point for command-line execution."""
    parser = argparse.ArgumentParser(description='DICOM Store-and-Forward Application')
    parser.add_argument('--config', type=str, default='config.json',
                      help='Path to configuration file (default: config.json)')
    args = parser.parse_args()
    
    forwarder = DicomForwarder(config_path=args.config)
    
    try:
        forwarder.start()
    except KeyboardInterrupt:
        forwarder.stop()
    except Exception as e:
        forwarder.logger.error(f"Fatal error: {e}", exc_info=True)
        forwarder.stop()
        sys.exit(1)


if __name__ == '__main__':
    main()