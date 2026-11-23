"""TOTP, recovery codes, and the keyed hash that stores them."""

import base64
from datetime import UTC, datetime, timedelta

import pytest

from backend.config import Config
from backend.core.two_factor_core import (
    build_otpauth_uri,
    generate_recovery_codes,
    hash_recovery_code,
    normalize_recovery_code,
    totp_at,
    verify_totp,
)

# RFC 6238 appendix B. The shared secret is the ASCII string, and the
# published SHA1 code at T=59 is the 8-digit value 94287082.
_RFC_SECRET = base64.b32encode(b"12345678901234567890").decode("ascii").rstrip("=")


def _moment(unix: int) -> datetime:
    return (datetime(1970, 1, 1, tzinfo=UTC) + timedelta(seconds=unix)).replace(
        tzinfo=None
    )


def test_rfc6238_sha1_vector_truncates_to_six_digits() -> None:
    assert totp_at(_RFC_SECRET, 59 // 30) == "287082"
    # T=1111111109 → 07081804, the same truncation.
    assert totp_at(_RFC_SECRET, 1111111109 // 30) == "081804"


def test_window_accepts_one_step_either_side_and_replay_does_not() -> None:
    # Step 3, so one step further back is still a real counter.
    moment = _moment(90)
    current = 90 // 30
    assert verify_totp(_RFC_SECRET, totp_at(_RFC_SECRET, current), None, moment) == (
        current
    )
    previous = totp_at(_RFC_SECRET, current - 1)
    upcoming = totp_at(_RFC_SECRET, current + 1)
    assert verify_totp(_RFC_SECRET, previous, None, moment) == current - 1
    assert verify_totp(_RFC_SECRET, upcoming, None, moment) == current + 1
    assert (
        verify_totp(_RFC_SECRET, totp_at(_RFC_SECRET, current - 2), None, moment)
        is None
    )
    assert (
        verify_totp(_RFC_SECRET, totp_at(_RFC_SECRET, current + 2), None, moment)
        is None
    )
    spaced = totp_at(_RFC_SECRET, current)
    assert verify_totp(_RFC_SECRET, f"{spaced[:3]} {spaced[3:]}", None, moment) == (
        current
    )
    assert verify_totp(_RFC_SECRET, spaced, current, moment) is None
    assert verify_totp(_RFC_SECRET, previous, current, moment) is None


@pytest.mark.parametrize("code", ["12345", "1234567", "12ab34", "12345a", ""])
def test_non_digit_input_is_rejected(code: str) -> None:
    assert verify_totp(_RFC_SECRET, code, None, _moment(59)) is None


def test_otpauth_uri_encodes_the_issuer_and_the_account() -> None:
    uri = build_otpauth_uri("SECRET", "a b/c")
    assert uri.startswith("otpauth://totp/Cardholder:a%20b%2Fc?")
    assert "secret=SECRET" in uri
    assert "issuer=Cardholder" in uri
    assert "algorithm=SHA1" in uri
    assert "digits=6" in uri
    assert "period=30" in uri


def test_recovery_codes_are_ten_crockford_codes() -> None:
    codes = generate_recovery_codes()
    assert len(codes) == 10
    alphabet = set("0123456789ABCDEFGHJKMNPQRSTVWXYZ")
    for code in codes:
        assert len(code) == 11
        assert code[5] == "-"
        assert set(code.replace("-", "")) <= alphabet


def test_recovery_code_normalization() -> None:
    assert normalize_recovery_code("ooiii-llLLL") == "0011111111"
    assert normalize_recovery_code("  abcd e-fghjk ") == "ABCDEFGHJK"


def test_recovery_code_hash_depends_on_the_master_key(monkeypatch) -> None:
    monkeypatch.setattr(Config, "MASTER_KEY", b"a" * 32)
    first = hash_recovery_code("AAAAA-BBBBB")
    monkeypatch.setattr(Config, "MASTER_KEY", b"b" * 32)
    second = hash_recovery_code("AAAAA-BBBBB")
    assert first.startswith("v1:")
    assert first != second
    monkeypatch.setattr(Config, "MASTER_KEY", b"a" * 32)
    assert hash_recovery_code("aa aaa-bb bbb") == first
