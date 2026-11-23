"""MASTER_KEY, HKDF, and the AES-GCM box around TOTP secrets."""

import base64

import pytest

from backend.config import Config, decode_master_key
from backend.core.secret_box import (
    SecretBoxError,
    decrypt_totp_secret,
    encrypt_totp_secret,
)


@pytest.fixture
def master_key(monkeypatch):
    key = b"k" * 32
    monkeypatch.setattr(Config, "MASTER_KEY", key)
    return key


def test_round_trip_uses_a_version_prefix_and_a_fresh_nonce(master_key) -> None:
    first = encrypt_totp_secret("JBSWY3DPEHPK3PXP", user_id=7)
    second = encrypt_totp_secret("JBSWY3DPEHPK3PXP", user_id=7)
    assert first.startswith("v1:")
    assert first != second
    assert decrypt_totp_secret(first, 7) == "JBSWY3DPEHPK3PXP"


def test_a_different_user_id_cannot_open_the_secret(master_key) -> None:
    token = encrypt_totp_secret("JBSWY3DPEHPK3PXP", user_id=7)
    with pytest.raises(SecretBoxError):
        decrypt_totp_secret(token, 8)


def test_a_different_master_key_cannot_open_the_secret(master_key, monkeypatch) -> None:
    token = encrypt_totp_secret("JBSWY3DPEHPK3PXP", user_id=7)
    monkeypatch.setattr(Config, "MASTER_KEY", b"q" * 32)
    with pytest.raises(SecretBoxError):
        decrypt_totp_secret(token, 7)


def test_an_unknown_prefix_is_rejected(master_key) -> None:
    with pytest.raises(SecretBoxError):
        decrypt_totp_secret("v2:aaaa", 7)


def test_decode_master_key_accepts_standard_and_urlsafe_base64() -> None:
    raw = bytes(range(32))
    assert decode_master_key(base64.b64encode(raw).decode()) == raw
    urlsafe = base64.urlsafe_b64encode(raw).decode().rstrip("=")
    assert decode_master_key(urlsafe) == raw


@pytest.mark.parametrize(
    "value",
    ["not base64!!", base64.b64encode(b"short-key").decode(), "@@@@"],
)
def test_config_rejects_a_malformed_or_short_master_key(
    monkeypatch, value: str
) -> None:
    monkeypatch.setenv("MASTER_KEY", value)
    Config._loaded = False
    try:
        with pytest.raises(ValueError, match="MASTER_KEY"):
            Config.load()
    finally:
        monkeypatch.delenv("MASTER_KEY", raising=False)
        Config._loaded = False
        Config.load()
