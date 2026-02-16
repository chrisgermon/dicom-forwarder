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
                service_dir = os.path.dirname(sys.executable)
            else:
                # Running as script
                service_dir = os.path.dirname(os.path.abspath(__file__))
            
            config_path = os.path.join(service_dir, 'config.json')
            
            # Set up basic logging to Windows Event Log first
            logging.basicConfig(
                level=logging.INFO,
                format='%(asctime)s - %(levelname)s - %(message)s',
                handlers=[logging.StreamHandler()]
            )
            logger = logging.getLogger(__name__)
            logger.info(f'Starting DICOM Forwarder Service from {service_dir}')
            logger.info(f'Config path: {config_path}')
            
            # Initialize the forwarder (this will set up proper logging)
            self.forwarder = DicomForwarder(config_path=config_path)
            
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