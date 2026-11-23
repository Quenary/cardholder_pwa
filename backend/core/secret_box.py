"""Encrypt secrets at rest with a key derived from MASTER_KEY.

The raw key never leaves this module's callers, and nothing here logs it.
TOTP secrets are the only payload today. A future rotation tool can tell
these ciphertexts apart by the ``v1:`` prefix.
"""

import base64
import secrets

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from backend.config import Config

_TOTP_PURPOSE = b"cardholder:totp-secret:v1"
_VERSION = "v1"


class SecretBoxError(Exception):
    """A secret could not be sealed or opened. Safe to show as a 503."""


def is_master_key_configured() -> bool:
    return Config.MASTER_KEY is not None


def derive_key(purpose: bytes) -> bytes:
    """32 bytes of HKDF-SHA256, different for every purpose string."""
    if Config.MASTER_KEY is None:
        raise SecretBoxError("MASTER_KEY is not configured")
    return HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=purpose,
    ).derive(Config.MASTER_KEY)


def _aad(user_id: int) -> bytes:
    return _TOTP_PURPOSE + b":user:" + str(user_id).encode("ascii")


def encrypt_totp_secret(secret: str, user_id: int) -> str:
    key = derive_key(_TOTP_PURPOSE)
    nonce = secrets.token_bytes(12)
    ciphertext = AESGCM(key).encrypt(nonce, secret.encode("utf-8"), _aad(user_id))
    blob = base64.b64encode(nonce + ciphertext).decode("ascii")
    return f"{_VERSION}:{blob}"


def decrypt_totp_secret(token: str, user_id: int) -> str:
    if not token.startswith(f"{_VERSION}:"):
        raise SecretBoxError("Unknown two-factor secret version")
    try:
        raw = base64.b64decode(token[len(_VERSION) + 1 :], validate=False)
        if len(raw) <= 12:
            raise SecretBoxError("Two-factor secret ciphertext is truncated")
        nonce, ciphertext = raw[:12], raw[12:]
        plain = AESGCM(derive_key(_TOTP_PURPOSE)).decrypt(
            nonce, ciphertext, _aad(user_id)
        )
        return plain.decode("utf-8")
    except SecretBoxError:
        raise
    except (InvalidTag, ValueError, UnicodeDecodeError) as exc:
        raise SecretBoxError("Two-factor secret could not be decrypted") from exc
