"""
Windows Service wrapper for DICOM Forwarder
Allows the application to run as a Windows background service
"""

import sys
import os
import win32serviceutil
import win32service
import win32event
import servicemanager
import socket
import logging
import threading
from pathlib import Path

# Add the current directory to path to import our module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dicom_forwarder import DicomForwarder


class DicomForwarderService(win32serviceutil.ServiceFramework):
    _svc_name_ = "DicomForwarderService"
    _svc_display_name_ = "DICOM Store and Forward Service"
    _svc_description_ = "Receives DICOM images and forwards them to a PACS server"

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.forwarder = None
        socket.setdefaulttimeout(60)

    def SvcStop(self):
        """Called when the service is being stopped."""
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        logging.info('Stopping DICOM Forwarder Service...')
        
        # Stop the forwarder if it's running
        if self.forwarder:
            try:
                # Call the forwarder's stop method for graceful shutdown
                if hasattr(self.forwarder, 'stop'):
                    self.forwarder.stop()
                elif hasattr(self.forwarder, 'ae'):
                    # Fallback: try to shutdown the AE directly
                    if hasattr(self.forwarder.ae, 'shutdown'):
                        self.forwarder.ae.shutdown()
            except Exception as e:
                logging.error(f'Error stopping forwarder: {e}')
                import traceback
                logging.error(traceback.format_exc())
        
        # Signal the stop event
        win32event.SetEvent(self.stop_event)

    def SvcDoRun(self):
        """Called when the service is started."""
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, '')
        )
        self.main()

    def main(self):
        """Main service loop."""
        try:
            # Get the directory where the service executable is located
            # Handle both script execution and PyInstaller executable
            if getattr(sys, 'frozen', False):
                # Running as compiled executable
                # sys.executable points to the .exe file itself
                service_dir = os.path.dirname(os.path.abspath(sys.executable))
            else:
                # Running as script
                service_dir = os.path.dirname(os.path.abspath(__file__))
            
            # Change to the service directory to ensure relative paths work
            os.chdir(service_dir)
            
            config_path = os.path.join(service_dir, 'config.json')
            
            # Verify config file exists
            if not os.path.exists(config_path):
                error_msg = f'Config file not found at: {config_path}'
                logging.error(error_msg)
                servicemanager.LogErrorMsg(error_msg)
                # Try to create a default config
                try:
                    import json
                    default_config = {
                        'local_ae_title': 'DICOM_FORWARDER',
                        'local_port': 11112,
                        'local_host': '0.0.0.0',
                        'pacs_host': '127.0.0.1',
                        'pacs_port': 11110,
                        'pacs_ae_title': 'PACS_SERVER',
                        'store_locally': True,
                        'storage_dir': os.path.join(service_dir, 'dicom_storage'),
                        'log_dir': os.path.join(service_dir, 'logs'),
                        'max_pdu_size': 0,
                        'forward_immediately': True,
                        'retry_attempts': 3
                    }
                    with open(config_path, 'w') as f:
                        json.dump(default_config, f, indent=2)
                    logging.info(f'Created default config file at: {config_path}')
                except Exception as e:
                    logging.error(f'Failed to create default config: {e}')
            
            # Set up basic logging to Windows Event Log first
            logging.basicConfig(
                level=logging.INFO,
                format='%(asctime)s - %(levelname)s - %(message)s',
                handlers=[logging.StreamHandler()]
            )
            logger = logging.getLogger(__name__)
            logger.info('='*80)
            logger.info('DICOM Forwarder Service Starting')
            logger.info('='*80)
            logger.info(f'Service executable: {sys.executable}')
            logger.info(f'Service directory: {service_dir}')
            logger.info(f'Working directory: {os.getcwd()}')
            logger.info(f'Config path: {config_path}')
            logger.info(f'Config exists: {os.path.exists(config_path)}')
            
            # Read and log config file contents before loading
            if os.path.exists(config_path):
                try:
                    import json
                    with open(config_path, 'r') as f:
                        config_content = json.load(f)
                    logger.info(f'Config file contents: {json.dumps(config_content, indent=2)}')
                except Exception as e:
                    logger.error(f'Error reading config file: {e}')
            
            logger.info('='*80)
            
            # Initialize the forwarder (this will set up proper logging)
            # Pass absolute path to ensure it's found
            abs_config_path = os.path.abspath(config_path)
            logger.info(f'Initializing forwarder with config: {abs_config_path}')
            self.forwarder = DicomForwarder(config_path=abs_config_path)
            
            # Verify the forwarder loaded the config correctly
            logger.info('='*80)
            logger.info('Forwarder Configuration Verification')
            logger.info('='*80)
            logger.info(f'  local_ae_title: {self.forwarder.config.get("local_ae_title")}')
            logger.info(f'  local_port: {self.forwarder.config.get("local_port")}')
            logger.info(f'  local_host: {self.forwarder.config.get("local_host")}')
            logger.info(f'  pacs_host: {self.forwarder.config.get("pacs_host")}')
            logger.info(f'  pacs_port: {self.forwarder.config.get("pacs_port")}')
            logger.info(f'  pacs_ae_title: {self.forwarder.config.get("pacs_ae_title")}')
            logger.info(f'  store_locally: {self.forwarder.config.get("store_locally")}')
            logger.info(f'  forward_immediately: {self.forwarder.config.get("forward_immediately")}')
            logger.info('='*80)
            
            # Start the forwarder in a separate thread so the service can respond to stop requests
            forwarder_thread = threading.Thread(target=self._run_forwarder, daemon=True)
            forwarder_thread.start()
            
            # Wait for the stop event (this keeps the service running)
            # The service will stop when SvcStop is called
            win32event.WaitForSingleObject(self.stop_event, win32event.INFINITE)
            
            logger.info('DICOM Forwarder Service stopped')
            
        except Exception as e:
            import traceback
            error_msg = f'Service error: {e}'
            logging.error(error_msg)
            logging.error(traceback.format_exc())
            servicemanager.LogErrorMsg(f'DICOM Forwarder Service error: {e}')
    
    def _run_forwarder(self):
        """Run the forwarder in a separate thread."""
        try:
            if self.forwarder:
                self.forwarder.start()
        except Exception as e:
            logging.error(f'Forwarder thread error: {e}')
            import traceback
            logging.error(traceback.format_exc())


if __name__ == '__main__':
    if len(sys.argv) == 1:
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(DicomForwarderService)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(DicomForwarderService)