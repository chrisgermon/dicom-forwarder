"""
Query/Retrieve PACS and activate the DICOM forwarder service.

Uses C-FIND to query PACS for one recent study, then C-MOVE to send that study
to the local forwarder (same AE as this config). The forwarder receives via
C-STORE, stores the images, then this script deletes them. Purpose: activate
the service (prove it can receive and process) without retaining data.

Requires:
  - Forwarder (C-STORE SCP) running so it can receive the C-MOVE result.
  - PACS configured to know the forwarder's AE title and host:port for C-MOVE.
  - config.json (or --config path) with pacs_* and local_ae_title, storage_dir.

Usage:
  python activate_service.py [--config path/to/config.json]
"""

import argparse
import json
import logging
import os
import shutil
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

# Add parent so we can use config loading from src if needed
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(REPO_ROOT / "src"))

try:
    from pynetdicom import AE
    from pynetdicom.sop_class import (
        StudyRootQueryRetrieveInformationModelFind,
        StudyRootQueryRetrieveInformationModelMove,
    )
    from pydicom.dataset import Dataset
except ImportError as e:
    print("ERROR: Required packages not installed.", file=sys.stderr)
    print("Please install: pip install pynetdicom pydicom", file=sys.stderr)
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("activate_service")


def load_config(config_path: str) -> dict:
    """Load config.json; resolve paths relative to config dir."""
    path = Path(config_path)
    if not path.is_absolute():
        path = (SCRIPT_DIR / path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Config not found: {path}")
    with open(path, "r") as f:
        config = json.load(f)
    config_dir = path.parent
    if not os.path.isabs(config.get("storage_dir", "")):
        config["storage_dir"] = os.path.normpath(
            os.path.join(config_dir, config.get("storage_dir", "./dicom_storage"))
        )
    return config


def c_find_one_study(config: dict) -> str | None:
    """C-FIND at STUDY level for a study in the last 7 days; return first StudyInstanceUID or None."""
    ae = AE(ae_title=config["local_ae_title"])
    ae.add_requested_context(StudyRootQueryRetrieveInformationModelFind)

    # Query studies from last 7 days
    end_date = datetime.now().strftime("%Y%m%d")
    start_date = (datetime.now() - timedelta(days=7)).strftime("%Y%m%d")

    ds = Dataset()
    ds.QueryRetrieveLevel = "STUDY"
    ds.StudyDate = f"{start_date}-{end_date}"
    ds.StudyInstanceUID = ""
    ds.PatientID = ""
    ds.PatientName = ""
    ds.StudyDescription = ""

    study_uid = None
    try:
        assoc = ae.associate(
            config["pacs_host"],
            config["pacs_port"],
            ae_title=config["pacs_ae_title"],
        )
        if not assoc.is_established:
            logger.error("C-FIND: Association not established with PACS")
            return None
        responses = assoc.send_c_find(
            ds, StudyRootQueryRetrieveInformationModelFind
        )
        for status, identifier in responses:
            if status and status.Status in (0xFF00, 0x0000):
                if identifier and getattr(identifier, "StudyInstanceUID", None):
                    study_uid = identifier.StudyInstanceUID
                    logger.info("C-FIND: found study %s", study_uid)
                    break
            elif status and status.Status != 0xFF00:
                logger.warning("C-FIND status: 0x%04x", status.Status)
        assoc.release()
    except Exception as e:
        logger.exception("C-FIND failed: %s", e)
    return study_uid


def c_move_study(config: dict, study_uid: str) -> bool:
    """C-MOVE one study to the local AE (forwarder). Returns True if move was sent successfully."""
    ae = AE(ae_title=config["local_ae_title"])
    ae.add_requested_context(StudyRootQueryRetrieveInformationModelMove)

    ds = Dataset()
    ds.QueryRetrieveLevel = "STUDY"
    ds.StudyInstanceUID = study_uid

    dest_ae = (config["local_ae_title"] or "DICOM_FORWARDER")[:16]

    try:
        assoc = ae.associate(
            config["pacs_host"],
            config["pacs_port"],
            ae_title=config["pacs_ae_title"],
        )
        if not assoc.is_established:
            logger.error("C-MOVE: Association not established with PACS")
            return False
        responses = assoc.send_c_move(
            ds, dest_ae, StudyRootQueryRetrieveInformationModelMove
        )
        success = False
        for status, _ in responses:
            if status:
                if status.Status == 0x0000:
                    success = True
                logger.info("C-MOVE status: 0x%04x", status.Status)
        assoc.release()
        return success
    except Exception as e:
        logger.exception("C-MOVE failed: %s", e)
        return False


def delete_study_from_storage(storage_dir: str, study_uid: str) -> int:
    """Delete any folders under storage_dir that contain the given StudyInstanceUID. Returns count of deleted files."""
    storage = Path(storage_dir)
    if not storage.is_dir():
        return 0
    deleted = 0
    # Layout: storage_dir / patient_id / study_uid / series_uid / *.dcm
    for patient_dir in storage.iterdir():
        if not patient_dir.is_dir():
            continue
        study_dir = patient_dir / study_uid
        if study_dir.is_dir():
            for f in study_dir.rglob("*"):
                if f.is_file():
                    try:
                        f.unlink()
                        deleted += 1
                    except OSError as e:
                        logger.warning("Could not delete %s: %s", f, e)
            try:
                shutil.rmtree(study_dir)
            except OSError as e:
                logger.warning("Could not remove dir %s: %s", study_dir, e)
    return deleted


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Query PACS, retrieve one study to the forwarder (activate service), then delete stored images."
    )
    parser.add_argument(
        "--config",
        type=str,
        default="config.json",
        help="Path to config.json (default: config.json in script dir or repo)",
    )
    parser.add_argument(
        "--no-delete",
        action="store_true",
        help="Do not delete stored images after retrieve (for debugging).",
    )
    parser.add_argument(
        "--wait",
        type=int,
        default=30,
        metavar="SECONDS",
        help="Seconds to wait for C-STORE receives before deleting (default: 30).",
    )
    args = parser.parse_args()

    # Resolve config path
    config_path = args.config
    for candidate in (
        Path(config_path),
        SCRIPT_DIR / config_path,
        REPO_ROOT / config_path,
    ):
        if candidate.exists():
            config_path = str(candidate)
            break
    else:
        logger.error("Config not found: %s", args.config)
        return 1

    try:
        config = load_config(config_path)
    except Exception as e:
        logger.error("Failed to load config: %s", e)
        return 1

    logger.info("Querying PACS for one recent study...")
    study_uid = c_find_one_study(config)
    if not study_uid:
        logger.warning("No study found; cannot activate. Check PACS and date range.")
        return 0

    logger.info("Sending C-MOVE for study %s to %s", study_uid, config["local_ae_title"])
    if not c_move_study(config, study_uid):
        logger.warning("C-MOVE may have failed; check PACS and forwarder. Skipping delete.")
        return 1

    logger.info("Waiting %s seconds for forwarder to receive images...", args.wait)
    time.sleep(args.wait)

    if args.no_delete:
        logger.info("Skipping delete (--no-delete). Stored images left in %s", config["storage_dir"])
        return 0

    deleted = delete_study_from_storage(config["storage_dir"], study_uid)
    logger.info("Deleted %s file(s) for study %s (service activated).", deleted, study_uid)
    return 0


if __name__ == "__main__":
    sys.exit(main())
