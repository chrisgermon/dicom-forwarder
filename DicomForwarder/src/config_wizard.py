"""
Configuration wizard GUI for DICOM Forwarder
Can be launched standalone or during installation
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import json
import os
from pathlib import Path


class ConfigWizard:
    def __init__(self, config_path="config.json"):
        self.config_path = config_path
        self.config = self.load_default_config()
        
        self.root = tk.Tk()
        self.root.title("DICOM Forwarder - Configuration Wizard")
        self.root.geometry("600x700")
        self.root.resizable(False, False)
        
        self.create_widgets()
        
    def load_default_config(self):
        """Load existing config or return defaults."""
        default = {
            'local_ae_title': 'DICOM_FORWARDER',
            'local_port': 11112,
            'local_host': '0.0.0.0',
            'pacs_host': '127.0.0.1',
            'pacs_port': 11110,
            'pacs_ae_title': 'PACS_SERVER',
            'store_locally': True,
            'storage_dir': './dicom_storage',
            'log_dir': './logs',
            'max_pdu_size': 0,
            'forward_immediately': True,
            'retry_attempts': 3
        }
        
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    loaded = json.load(f)
                    default.update(loaded)
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
    
    def save_config(self):
        """Save configuration to file."""
        try:
            config = {
                'local_ae_title': self.local_ae.get(),
                'local_port': int(self.local_port.get()),
                'local_host': '0.0.0.0',
                'pacs_host': self.pacs_host.get(),
                'pacs_port': int(self.pacs_port.get()),
                'pacs_ae_title': self.pacs_ae.get(),
                'store_locally': self.store_locally_var.get(),
                'storage_dir': self.storage_dir.get(),
                'log_dir': self.log_dir.get(),
                'max_pdu_size': 0,
                'forward_immediately': self.forward_immediately_var.get(),
                'retry_attempts': int(self.retry_attempts.get())
            }
            
            # Create directories
            Path(config['storage_dir']).mkdir(parents=True, exist_ok=True)
            Path(config['log_dir']).mkdir(parents=True, exist_ok=True)
            
            # Save configuration
            with open(self.config_path, 'w') as f:
                json.dump(config, f, indent=2)
            
            messagebox.showinfo("Success", "Configuration saved successfully!")
            self.root.quit()
            
        except ValueError as e:
            messagebox.showerror("Error", f"Invalid port number: {e}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save configuration: {e}")
    
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