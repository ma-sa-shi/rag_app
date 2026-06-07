import logging
import datetime
import zoneinfo
from pathlib import Path
from config import settings

JST = zoneinfo.ZoneInfo("Asia/Tokyo")


def jst_time_converter(timestamp: float):
    dt = datetime.datetime.fromtimestamp(timestamp, tz=JST)
    return dt.timetuple()


def get_component_logger(component_name):

    logger = logging.getLogger(f"rag_app.{component_name}")
    logger.setLevel(logging.DEBUG)

    if logger.handlers:
        return logger

    file_formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    file_formatter.converter = jst_time_converter
    console_formatter = logging.Formatter("%(levelname)s: %(message)s")
    console_formatter.converter = jst_time_converter

    log_dir = Path(settings.LOG_DIR) if settings.LOG_DIR else Path("/app/log")
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file_path = log_dir / f"{component_name}.log"

    file_handler = logging.FileHandler(log_file_path, encoding="utf-8")
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)

    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    logger.propagate = False

    return logger
