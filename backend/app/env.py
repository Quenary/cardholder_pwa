import os
from cryptography.fernet import Fernet

API_PATH: str = os.environ.get("API_PATH", "/api")
JWT_SECRET_KEY: str | bytes = os.environ.get("JWT_SECRET_KEY") or Fernet.generate_key()
JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM") or "HS256"
ACCESS_TOKEN_LIFETIME_MIN: float = float(
    os.environ.get("ACCESS_TOKEN_LIFETIME_MIN") or 5
)
REFRESH_TOKEN_LIFETIME_MIN: float = float(
    os.environ.get("REFRESH_TOKEN_LIFETIME_MIN") or 60 * 24 * 30
)
DB_URL: str = os.environ.get("DB_URL") or "sqlite:////cardholder_pwa/cardholder_pwa.db"
