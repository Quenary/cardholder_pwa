import logging
import os
import secrets
from typing import ClassVar, Final, Literal

from dotenv import load_dotenv

SMTP_ENCRYPTION_TYPE = Literal["TLS", "STARTTLS", None]


class Config:
    _loaded: ClassVar[bool] = False

    API_PATH: ClassVar[str]
    LOG_LEVEL: ClassVar[str]
    JWT_SECRET_KEY: ClassVar[str | bytes]
    JWT_ALGORITHM: ClassVar[str]
    ACCESS_TOKEN_LIFETIME_MIN: ClassVar[float]
    REFRESH_TOKEN_LIFETIME_MIN: ClassVar[float]
    PASSWORD_RECOVERY_CODE_LIFETIME_MIN: ClassVar[float]
    DB_URL: ClassVar[str]
    DB_CLEANUP_INTERVAL_MIN: ClassVar[float]
    SMTP_DISABLED: ClassVar[bool]
    SMTP_ENCRYPTION: ClassVar[SMTP_ENCRYPTION_TYPE]
    SMTP_SERVER: ClassVar[str]
    SMTP_PORT: ClassVar[int]
    SMTP_FROM_EMAIL: ClassVar[str]
    SMTP_USERNAME: ClassVar[str]
    SMTP_PASSWORD: ClassVar[str]
    SMTP_TIMEOUT: ClassVar[int]

    @classmethod
    def load(cls):
        if not cls._loaded:
            load_dotenv()
            cls.API_PATH = os.getenv("API_PATH", "/api")
            cls.LOG_LEVEL = os.getenv("LOG_LEVEL") or "warning"
            cls.JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or secrets.token_urlsafe(
                32
            )
            cls.JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
            cls.ACCESS_TOKEN_LIFETIME_MIN = float(
                os.getenv("ACCESS_TOKEN_LIFETIME_MIN") or 5
            )
            cls.REFRESH_TOKEN_LIFETIME_MIN = float(
                os.getenv("REFRESH_TOKEN_LIFETIME_MIN") or 60 * 24 * 30
            )
            cls.PASSWORD_RECOVERY_CODE_LIFETIME_MIN = float(
                os.getenv("PASSWORD_RECOVERY_CODE_LIFETIME_MIN") or 15
            )
            cls.DB_URL = (
                os.getenv("DB_URL")
                or "sqlite+aiosqlite:////cardholder_pwa/cardholder_pwa.db"
            )
            cls.DB_CLEANUP_INTERVAL_MIN = float(
                os.getenv("DB_CLEANUP_INTERVAL_MIN") or 360
            )

            cls.SMTP_DISABLED = os.getenv("SMTP_DISABLED", "false").lower() == "true"

            raw_smtp_encryption: Final[str] = os.getenv("SMTP_ENCRYPTION", "").upper()
            valid_smtp_encryptions: Final[set[SMTP_ENCRYPTION_TYPE]] = {
                "TLS",
                "STARTTLS",
                None,
            }

            if raw_smtp_encryption in valid_smtp_encryptions:
                cls.SMTP_ENCRYPTION = raw_smtp_encryption
            elif os.getenv("SMTP_USE_TLS", "false").lower() == "true":
                logging.warning(
                    "SMTP_USE_TLS is deprecated. "
                    "Use SMTP_ENCRYPTION instead. "
                    "STARTTLS is used as fallback."
                )
                cls.SMTP_ENCRYPTION = "STARTTLS"
            else:
                cls.SMTP_ENCRYPTION = None

            if cls.SMTP_ENCRYPTION == "TLS":
                defaultPort = 465
            elif cls.SMTP_ENCRYPTION == "STARTTLS":
                defaultPort = 587
            else:
                defaultPort = 25

            cls.SMTP_SERVER = os.getenv("SMTP_SERVER", "")
            cls.SMTP_PORT = int(os.getenv("SMTP_PORT", defaultPort))
            cls.SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "")
            cls.SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
            cls.SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
            cls.SMTP_TIMEOUT = int(os.getenv("SMTP_TIMEOUT", 10))
            cls._loaded = True
            print(cls.SMTP_ENCRYPTION, cls.SMTP_SERVER, cls.SMTP_PORT)


Config.load()
