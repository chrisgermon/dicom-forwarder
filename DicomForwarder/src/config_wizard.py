"""
Configuration wizard GUI for DICOM Forwarder
Can be launched standalone or during installation
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import json
import os
import socket
from pathlib import Path

# Optional import for service management
try:
    import win32serviceutil
    HAS_WIN32 = True
except ImportError:
    HAS_WIN32 = False


class ConfigWizard:
    def __init__(self, config_path="config.json"):
        self.config_path = config_path
        self.config = self.load_default_config()
        
        self.root = tk.Tk()
        self.root.title("DICOM Forwarder - Configuration Wizard")
        self.root.geometry("600x800")
        self.root.resizable(False, False)
        
        self.create_widgets()
        
    def get_local_ip(self):
        """Get the primary local network IP address."""
        try:
            # Connect to external address to determine local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            return local_ip
        except:
            try:
                # Fallback to hostname IP
                hostname = socket.gethostname()
                return socket.gethostbyname(hostname)
            except:
                return '0.0.0.0'
    
    def load_default_config(self):
        """Load existing config or return defaults."""
        # Auto-detect primary local IP
        detected_ip = self.get_local_ip()
        
        default = {
            'local_ae_title': 'DICOM_FORWARDER',
            'local_port': 11112,
            'local_host': detected_ip,  # Use detected IP instead of 0.0.0.0
            'pacs_host': '127.0.0.1',
            'pacs_port': 11110,
            'pacs_ae_title': 'PACS_SERVER',
            'store_locally': True,
            'storage_dir': './dicom_storage',
            'log_dir': './logs',
            'max_pdu_size': 0,
            'forward_immediately': True,
            'retry_attempts': 3,
            'accept_any_ae_title': False,
            'auto_delete_days': 0,
            'log_max_bytes': 10 * 1024 * 1024,
            'log_backup_count': 5
        }
        
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    loaded = json.load(f)
                    default.update(loaded)
                    # If config has 0.0.0.0, replace with detected IP
                    if loaded.get('local_host') == '0.0.0.0':
                        default['local_host'] = detected_ip
            except:
                pass
        
        return default
    
    def create_widgets(self):
        """Create the wizard interface."""
        # Main frame
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Title
        title = ttk.Label(main_frame, text="DICOM Forwarder Configuration", 
                         font=('Arial', 16, 'bold'))
        title.grid(row=0, column=0, columnspan=2, pady=(0, 20))
        
        # Local Settings Section
        ttk.Label(main_frame, text="Local Receiver Settings", 
                 font=('Arial', 12, 'bold')).grid(row=1, column=0, columnspan=2, 
                                                  sticky=tk.W, pady=(10, 5))
        ttk.Separator(main_frame, orient='horizontal').grid(row=2, column=0, 
                                                            columnspan=2, sticky='ew', pady=(0, 10))
        
        row = 3
        
        # Local AE Title
        ttk.Label(main_frame, text="Local AE Title:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.local_ae = ttk.Entry(main_frame, width=40)
        self.local_ae.insert(0, self.config['local_ae_title'])
        self.local_ae.grid(row=row, column=1, sticky=tk.W, pady=5)
        row += 1
        
        # Local Host/IP Address
        ttk.Label(main_frame, text="Local IP Address:").grid(row=row, column=0, sticky=tk.W, pady=5)
        local_host_frame = ttk.Frame(main_frame)
        local_host_frame.grid(row=row, column=1, sticky=tk.W, pady=5)
        self.local_host = ttk.Entry(local_host_frame, width=30)
        self.local_host.insert(0, self.config.get('local_host', '0.0.0.0'))
        self.local_host.pack(side=tk.LEFT)
        ttk.Button(local_host_frame, text="Auto-detect", 
                  command=self.auto_detect_ip).pack(side=tk.LEFT, padx=(5, 0))
        row += 1
        
        # Local Port
        ttk.Label(main_frame, text="Local Port:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.local_port = ttk.Entry(main_frame, width=40)
        self.local_port.insert(0, str(self.config['local_port']))
        self.local_port.grid(row=row, column=1, sticky=tk.W, pady=5)
        row += 1
        
        # PACS Server Section
        ttk.Label(main_frame, text="PACS Server Settings", 
                 font=('Arial', 12, 'bold')).grid(row=row, column=0, columnspan=2, 
                                                  sticky=tk.W, pady=(20, 5))
        ttk.Separator(main_frame, orient='horizontal').grid(row=row+1, column=0, 
                                                            columnspan=2, sticky='ew', pady=(0, 10))
        row += 2
        
        # PACS Host
        ttk.Label(main_frame, text="PACS Server IP:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.pacs_host = ttk.Entry(main_frame, width=40)
        self.pacs_host.insert(0, self.config['pacs_host'])
        self.pacs_host.grid(row=row, column=1, sticky=tk.W, pady=5)
        row += 1
        
        # PACS Port
        ttk.Label(main_frame, text="PACS Server Port:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.pacs_port = ttk.Entry(main_frame, width=40)
        self.pacs_port.insert(0, str(self.config['pacs_port']))
        self.pacs_port.grid(row=row, column=1, sticky=tk.W, pady=5)
        row += 1
        
        # PACS AE Title
        ttk.Label(main_frame, text="PACS AE Title:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.pacs_ae = ttk.Entry(main_frame, width=40)
        self.pacs_ae.insert(0, self.config['pacs_ae_title'])
        self.pacs_ae.grid(row=row, column=1, sticky=tk.W, pady=5)
        row += 1
        
        # Storage Settings Section
        ttk.Label(main_frame, text="Storage Settings", 
                 font=('Arial', 12, 'bold')).grid(row=row, column=0, columnspan=2, 
                                                  sticky=tk.W, pady=(20, 5))
        ttk.Separator(main_frame, orient='horizontal').grid(row=row+1, column=0, 
                                                            columnspan=2, sticky='ew', pady=(0, 10))
        row += 2
        
        # Store Locally checkbox
        self.store_locally_var = tk.BooleanVar(value=self.config['store_locally'])
        ttk.Checkbutton(main_frame, text="Store images locally before forwarding", 
                       variable=self.store_locally_var).grid(row=row, column=0, 
                                                             columnspan=2, sticky=tk.W, pady=5)
        row += 1
        
        # Storage Directory
        ttk.Label(main_frame, text="Storage Directory:").grid(row=row, column=0, sticky=tk.W, pady=5)
        storage_frame = ttk.Frame(main_frame)
        storage_frame.grid(row=row, column=1, sticky=tk.W, pady=5)
        self.storage_dir = ttk.Entry(storage_frame, width=30)
        self.storage_dir.insert(0, self.config['storage_dir'])
        self.storage_dir.pack(side=tk.LEFT)
        ttk.Button(storage_frame, text="Browse...", 
                  command=self.browse_storage).pack(side=tk.LEFT, padx=(5, 0))
        row += 1
        
        # Log Directory
        ttk.Label(main_frame, text="Log Directory:").grid(row=row, column=0, sticky=tk.W, pady=5)
        log_frame = ttk.Frame(main_frame)
        log_frame.grid(row=row, column=1, sticky=tk.W, pady=5)
        self.log_dir = ttk.Entry(log_frame, width=30)
        self.log_dir.insert(0, self.config['log_dir'])
        self.log_dir.pack(side=tk.LEFT)
        ttk.Button(log_frame, text="Browse...", 
                  command=self.browse_logs).pack(side=tk.LEFT, padx=(5, 0))
        row += 1
        
        # Advanced Settings Section
        ttk.Label(main_frame, text="Advanced Settings", 
                 font=('Arial', 12, 'bold')).grid(row=row, column=0, columnspan=2, 
                                                  sticky=tk.W, pady=(20, 5))
        ttk.Separator(main_frame, orient='horizontal').grid(row=row+1, column=0, 
                                                            columnspan=2, sticky='ew', pady=(0, 10))
        row += 2
        
        # Forward Immediately
        self.forward_immediately_var = tk.BooleanVar(value=self.config['forward_immediately'])
        ttk.Checkbutton(main_frame, text="Forward images immediately to PACS", 
                       variable=self.forward_immediately_var).grid(row=row, column=0, 
                                                                   columnspan=2, sticky=tk.W, pady=5)
        row += 1
        
        # Max PDU Size
        ttk.Label(main_frame, text="Max PDU Size (0=unlimited):").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.max_pdu = ttk.Entry(main_frame, width=40)
        self.max_pdu.insert(0, str(self.config.get('max_pdu_size', 0)))
        self.max_pdu.grid(row=row, column=1, sticky=tk.W, pady=5)
        row += 1
        
        # Retry Attempts
        ttk.Label(main_frame, text="Retry Attempts:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.retry_attempts = ttk.Spinbox(main_frame, from_=1, to=10, width=38)
        self.retry_attempts.set(self.config['retry_attempts'])
        self.retry_attempts.grid(row=row, column=1, sticky=tk.W, pady=5)
        row += 1
        
        # Buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=row, column=0, columnspan=2, pady=(30, 0))
        
        ttk.Button(button_frame, text="Test Connection", 
                  command=self.test_connection).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Save Configuration", 
                  command=self.save_config).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Cancel", 
                  command=self.root.quit).pack(side=tk.LEFT, padx=5)
    
    def browse_storage(self):
        """Browse for storage directory."""
        directory = filedialog.askdirectory(title="Select Storage Directory")
        if directory:
            self.storage_dir.delete(0, tk.END)
            self.storage_dir.insert(0, directory)
    
    def browse_logs(self):
        """Browse for log directory."""
        directory = filedialog.askdirectory(title="Select Log Directory")
        if directory:
            self.log_dir.delete(0, tk.END)
            self.log_dir.insert(0, directory)
    
    def auto_detect_ip(self):
        """Auto-detect local IP addresses."""
        try:
            # Get hostname
            hostname = socket.gethostname()
            # Get local IP
            local_ip = socket.gethostbyname(hostname)
            
            # Try to get the actual network IP (not 127.0.0.1)
            try:
                # Connect to external address to determine local IP
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                network_ip = s.getsockname()[0]
                s.close()
                
                # Show dialog with options
                choice = messagebox.askyesnocancel(
                    "Auto-detect IP",
                    f"Detected IP addresses:\n\n"
                    f"Network IP: {network_ip}\n"
                    f"Hostname IP: {local_ip}\n"
                    f"All interfaces (0.0.0.0)\n\n"
                    f"Use network IP ({network_ip})?\n\n"
                    f"Click 'Yes' for network IP\n"
                    f"Click 'No' for 0.0.0.0 (all interfaces)\n"
                    f"Click 'Cancel' to keep current"
                )
                
                if choice is True:
                    self.local_host.delete(0, tk.END)
                    self.local_host.insert(0, network_ip)
                elif choice is False:
                    self.local_host.delete(0, tk.END)
                    self.local_host.insert(0, "0.0.0.0")
                # If Cancel, do nothing
            except:
                # Fallback to hostname IP
                self.local_host.delete(0, tk.END)
                self.local_host.insert(0, local_ip)
                messagebox.showinfo("Auto-detect", f"Detected IP: {local_ip}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to detect IP address: {e}")
    
    def test_connection(self):
        """Test connection to PACS server."""
        try:
            import socket
            host = self.pacs_host.get()
            port = int(self.pacs_port.get())
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((host, port))
            sock.close()
            
            if result == 0:
                messagebox.showinfo("Success", f"Successfully connected to {host}:{port}")
            else:
                messagebox.showwarning("Connection Failed", 
                                      f"Could not connect to {host}:{port}\n"
                                      "Please verify the server is running.")
        except Exception as e:
            messagebox.showerror("Error", f"Connection test failed: {e}")
    
    def validate_config(self):
        """Validate configuration values."""
        errors = []
        
        # Validate ports
        try:
            local_port = int(self.local_port.get())
            if not (1 <= local_port <= 65535):
                errors.append("Local port must be between 1 and 65535")
        except ValueError:
            errors.append("Local port must be a valid number")
        
        try:
            pacs_port = int(self.pacs_port.get())
            if not (1 <= pacs_port <= 65535):
                errors.append("PACS port must be between 1 and 65535")
        except ValueError:
            errors.append("PACS port must be a valid number")
        
        # Validate IP addresses
        local_host = self.local_host.get().strip()
        if local_host and local_host != '0.0.0.0':
            try:
                socket.inet_aton(local_host)
            except socket.error:
                errors.append(f"Invalid local IP address: {local_host}")
        
        pacs_host = self.pacs_host.get().strip()
        if pacs_host:
            try:
                socket.inet_aton(pacs_host)
            except socket.error:
                # Try hostname resolution
                try:
                    socket.gethostbyname(pacs_host)
                except socket.error:
                    errors.append(f"Invalid PACS host address: {pacs_host}")
        
        # Check if local port is available
        try:
            local_port = int(self.local_port.get())
            test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            test_socket.settimeout(1)
            result = test_socket.connect_ex(('127.0.0.1', local_port))
            test_socket.close()
            if result == 0:
                errors.append(f"Local port {local_port} is already in use")
        except:
            pass  # Skip port check if it fails
        
        return errors
    
    def save_config(self):
        """Save configuration to file."""
        try:
            # Validate configuration
            errors = self.validate_config()
            if errors:
                messagebox.showerror("Validation Error", 
                    "Please fix the following errors:\n\n" + "\n".join(f"• {e}" for e in errors))
                return
            
            # Validate local_host
            local_host = self.local_host.get().strip()
            if not local_host:
                local_host = '0.0.0.0'
            
            # Validate max_pdu_size
            try:
                max_pdu_size = int(self.max_pdu.get().strip() or '0')
                if max_pdu_size < 0:
                    max_pdu_size = 0
            except ValueError:
                max_pdu_size = 0
            
            config = {
                'local_ae_title': self.local_ae.get().strip(),
                'local_port': int(self.local_port.get()),
                'local_host': local_host,
                'pacs_host': self.pacs_host.get().strip(),
                'pacs_port': int(self.pacs_port.get()),
                'pacs_ae_title': self.pacs_ae.get().strip(),
                'store_locally': self.store_locally_var.get(),
                'storage_dir': self.storage_dir.get().strip(),
                'log_dir': self.log_dir.get().strip(),
                'max_pdu_size': max_pdu_size,
                'forward_immediately': self.forward_immediately_var.get(),
                'retry_attempts': int(self.retry_attempts.get()),
                'accept_any_ae_title': self.accept_any_ae_title_var.get(),
                'auto_delete_days': int(self.auto_delete_days.get()),
                'log_max_bytes': 10 * 1024 * 1024,
                'log_backup_count': 5
            }
            
            # Create directories
            Path(config['storage_dir']).mkdir(parents=True, exist_ok=True)
            Path(config['log_dir']).mkdir(parents=True, exist_ok=True)
            
            # Save configuration
            with open(self.config_path, 'w') as f:
                json.dump(config, f, indent=2)
            
            # Check if service is running and offer to restart
            service_running = self.check_service_status()
            if service_running:
                restart = messagebox.askyesno(
                    "Service Restart",
                    "Configuration saved successfully!\n\n"
                    "The DICOM Forwarder service is currently running.\n"
                    "Would you like to restart it to apply the new configuration?\n\n"
                    "Note: You may need administrator privileges."
                )
                if restart:
                    self.restart_service()
                else:
                    messagebox.showinfo(
                        "Configuration Saved",
                        "Configuration saved successfully!\n\n"
                        "Please restart the service manually to apply changes:\n"
                        "Start Menu → DICOM Forwarder → Restart Service"
                    )
            else:
                messagebox.showinfo("Success", "Configuration saved successfully!")
            
            self.root.quit()
            
        except ValueError as e:
            messagebox.showerror("Error", f"Invalid value: {e}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save configuration: {e}")
    
    def check_service_status(self):
        """Check if the Windows service is running."""
        if not HAS_WIN32:
            return False
        try:
            status = win32serviceutil.QueryServiceStatus('DicomForwarderService')
            return status[1] == 4  # SERVICE_RUNNING
        except:
            return False
    
    def restart_service(self):
        """Restart the Windows service."""
        if not HAS_WIN32:
            messagebox.showwarning(
                "Service Management Unavailable",
                "Service management requires pywin32.\n"
                "Please restart the service manually."
            )
            return
        try:
            import subprocess
            service_exe = os.path.join(os.path.dirname(self.config_path), 'DicomForwarderService.exe')
            if os.path.exists(service_exe):
                # Stop service
                subprocess.run([service_exe, 'stop'], timeout=10, capture_output=True)
                import time
                time.sleep(2)
                # Start service
                subprocess.run([service_exe, 'start'], timeout=10, capture_output=True)
                messagebox.showinfo("Success", "Service restarted successfully!")
            else:
                messagebox.showwarning(
                    "Service Not Found",
                    "Could not find DicomForwarderService.exe.\n"
                    "Please restart the service manually."
                )
        except Exception as e:
            messagebox.showwarning(
                "Restart Failed",
                f"Could not restart service automatically:\n{e}\n\n"
                "Please restart the service manually:\n"
                "Start Menu → DICOM Forwarder → Restart Service"
            )
    
    def run(self):
        """Run the wizard."""
        self.root.mainloop()
        return os.path.exists(self.config_path)


def main():
    """Main entry point for standalone execution."""
    wizard = ConfigWizard()
    wizard.run()


if __name__ == '__main__':
    main()