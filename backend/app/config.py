import os
import secrets
from dotenv import load_dotenv
from typing import ClassVar


class Config:
    _loaded: ClassVar[bool] = False

    API_PATH: ClassVar[str]
    JWT_SECRET_KEY: ClassVar[str | bytes]
    JWT_ALGORITHM: ClassVar[str]
    ACCESS_TOKEN_LIFETIME_MIN: ClassVar[float]
    REFRESH_TOKEN_LIFETIME_MIN: ClassVar[float]
    PASSWORD_RECOVERY_CODE_LIFETIME_MIN: ClassVar[float]
    DB_URL: ClassVar[str]
    SMTP_USE_TLS: ClassVar[bool]
    SMTP_SERVER: ClassVar[str]
    SMTP_PORT: ClassVar[int]
    SMTP_FROM_EMAIL: ClassVar[str]
    SMTP_USERNAME: ClassVar[str]
    SMTP_PASSWORD: ClassVar[str]

    @classmethod
    def load(cls):
        if not cls._loaded:
            load_dotenv()
            cls.API_PATH = os.getenv("API_PATH", "/api")
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
                os.getenv("DB_URL") or "sqlite:////cardholder_pwa/cardholder_pwa.db"
            )
            cls.SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "false").lower() == "true"
            defaultPort: int = 587 if cls.SMTP_USE_TLS else 25
            cls.SMTP_SERVER = os.getenv("SMTP_SERVER", "")
            cls.SMTP_PORT = int(os.getenv("SMTP_PORT", defaultPort))
            cls.SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "")
            cls.SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
            cls.SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
            cls._loaded = True


Config.load()
