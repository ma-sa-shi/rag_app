import logging
from config import settings


def get_component_logger(component_name):

    logger = logging.getLogger(f"rag_app.{component_name}")
    logger.setLevel(logging.DEBUG)

    if logger.handlers:
        return logger

    console_handler = logging.StreamHandler()
    if settings.ENV == "prod":
        log_level = logging.INFO
    else:
        log_level = logging.DEBUG

    logger.setLevel(log_level)

    formatter = logging.Formatter(
        "{asctime} - {levelname} - {name} - [{user_id}][{request_id}] - {message}",
        style="{",
    )
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    logger.propagate = False

    return logger
