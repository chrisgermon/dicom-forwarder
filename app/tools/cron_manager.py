import os
import logging
import asyncssh
import re
import tempfile
from typing import List, Dict, Optional, Any
from app.core.config import get_secret_sync

logger = logging.getLogger(__name__)

class UbuntuConfig:
    """Ubuntu server SSH configuration for remote command execution."""
    def __init__(self):
        self.hostname = os.getenv("UBUNTU_HOSTNAME", "")
        self.port = int(os.getenv("UBUNTU_PORT", "22"))
        self.username = os.getenv("UBUNTU_USERNAME", "")
        self.password = os.getenv("UBUNTU_PASSWORD", "")
        # SSH private key (base64 encoded or direct key content)
        self._private_key = os.getenv("UBUNTU_PRIVATE_KEY", "")
        # Optional: path to private key file in Secret Manager
        self._private_key_secret = os.getenv("UBUNTU_PRIVATE_KEY_SECRET", "")
        # Known hosts verification (disable for self-signed/unknown hosts)
        self.verify_host = os.getenv("UBUNTU_VERIFY_HOST", "false").lower() == "true"
        # Connection timeout
        self.timeout = int(os.getenv("UBUNTU_TIMEOUT", "30"))
        # Friendly name for this server
        self.server_name = os.getenv("UBUNTU_SERVER_NAME", "Ubuntu Server")

    @property
    def is_configured(self) -> bool:
        """Check if minimum SSH configuration is available."""
        return bool(self.hostname and self.username)
        
    @property
    def key_content(self) -> Optional[str]:
        """Get the private key content, checking Secret Manager if needed."""
        if self._private_key:
            return self._private_key
        if self._private_key_secret:
            return get_secret_sync(self._private_key_secret)
        return None

class CronManager:
    def __init__(self):
        self.config = UbuntuConfig()

    async def _get_ssh_connection(self):
        """Establish SSH connection to the Ubuntu server."""
        if not self.config.is_configured:
            raise ValueError("Ubuntu SSH is not configured")

        connect_kwargs = {
            "host": self.config.hostname,
            "port": self.config.port,
            "username": self.config.username,
            "known_hosts": None if not self.config.verify_host else None,
            "client_keys": None,
        }

        # Handle authentication (Key or Password)
        key_content = self.config.key_content
        if key_content:
            # Load private key from string
            try:
                # importing_key handles various formats (RSA, Ed25519)
                private_key = asyncssh.import_private_key(key_content)
                connect_kwargs["client_keys"] = [private_key]
            except Exception as e:
                logger.error(f"Failed to import SSH key: {e}")
                
        if self.config.password:
            connect_kwargs["password"] = self.config.password

        return await asyncssh.connect(**connect_kwargs)

    async def list_jobs(self) -> List[Dict[str, str]]:
        """List all cron jobs."""
        try:
            async with await self._get_ssh_connection() as conn:
                result = await conn.run("crontab -l", check=True)
                output = result.stdout
                
                jobs = []
                for line in output.splitlines():
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                        
                    parts = line.split(maxsplit=5)
                    if len(parts) >= 6:
                        schedule = " ".join(parts[:5])
                        command = parts[5]
                        jobs.append({
                            "raw": line,
                            "schedule": schedule,
                            "command": command
                        })
                    elif line.startswith("@"):
                        parts = line.split(maxsplit=1)
                        if len(parts) == 2:
                            jobs.append({
                                "raw": line,
                                "schedule": parts[0],
                                "command": parts[1]
                            })
                            
                return jobs
        except Exception as e:
            logger.error(f"Failed to list cron jobs: {e}")
            raise

    async def run_job(self, command: str) -> str:
        """Execute a cron command immediately manually."""
        try:
            async with await self._get_ssh_connection() as conn:
                logger.info(f"Manually running cron command: {command}")
                result = await conn.run(command)
                
                output = f"Stdout:\n{result.stdout}\n"
                if result.stderr:
                    output += f"Stderr:\n{result.stderr}"
                return output
        except Exception as e:
            logger.error(f"Failed to run cron command: {e}")
            raise

    async def update_job(self, old_raw: str, new_schedule: str, new_command: str) -> bool:
        """Update a cron job safely by creating a temp file."""
        try:
            async with await self._get_ssh_connection() as conn:
                result = await conn.run("crontab -l")
                current_crontab = result.stdout or ""
                
                new_line = f"{new_schedule} {new_command}"
                
                if old_raw not in current_crontab:
                    logger.warning(f"Old cron line not found: {old_raw}")
                    raise ValueError("Original cron job not found, cannot update.")
                
                new_crontab = current_crontab.replace(old_raw, new_line)
                
                temp_file = f"/tmp/cron_update_{os.urandom(4).hex()}"
                
                async with conn.start_sftp_client() as sftp:
                    async with sftp.open(temp_file, 'w') as f:
                        await f.write(new_crontab)
                        
                await conn.run(f"crontab {temp_file}", check=True)
                await conn.run(f"rm {temp_file}")
                
                return True
                
        except Exception as e:
            logger.error(f"Failed to update cron job: {e}")
            raise
