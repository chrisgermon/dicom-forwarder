import logging
import sys
import os
try:
    from pythonjsonlogger import jsonlogger
except ImportError:
    # Fallback if dependency is missing during local dev without install
    jsonlogger = None

def setup_logging(level=logging.INFO):
    """Configure structured JSON logging for Cloud Run."""
    
    # Check if we are in a Cloud Run environment or explicitly want JSON logs
    use_json = os.getenv("LOG_FORMAT", "json").lower() == "json"
    
    logger = logging.getLogger()
    logger.setLevel(level)

    # Clear existing handlers to avoid duplicates
    if logger.handlers:
        logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    
    if use_json and jsonlogger:
        # GCP compatible JSON formatter
        # Mapping 'levelname' to 'severity' aligns with Google Cloud Logging
        formatter = jsonlogger.JsonFormatter(
            '%(asctime)s %(levelname)s %(name)s %(message)s %(filename)s %(lineno)d',
            rename_fields={
                'asctime': 'timestamp',
                'levelname': 'severity',
            },
            datefmt='%Y-%m-%dT%H:%M:%S%z'
        )
    else:
        # Human readable formatter for local development if desired
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(name)s - %(message)s'
        )

    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    # Reduce noise from third-party libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("google.auth").setLevel(logging.WARNING)
    
    return logger
