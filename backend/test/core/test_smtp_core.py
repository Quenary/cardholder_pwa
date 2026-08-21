"""Tests for outgoing mail formatting.

Nothing here talks to a real SMTP server: `smtplib.SMTP` is replaced with a
stub that records the message it was asked to send, so we can assert on the
exact bytes that would go out.
"""

from email.message import Message
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from backend.config import Config
from backend.core.smtp_core import EmailSender


class _RecordingSMTP:
    """Stand-in for smtplib.SMTP that captures send_message() calls."""

    sent: list[Message] = []

    def __init__(self, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def starttls(self):
        pass

    def login(self, *args):
        pass

    def send_message(self, msg):
        _RecordingSMTP.sent.append(msg)


@pytest.fixture(autouse=True)
def smtp_config(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(Config, "SMTP_DISABLED", False, raising=False)
    monkeypatch.setattr(Config, "SMTP_SERVER", "smtp.example.org", raising=False)
    monkeypatch.setattr(Config, "SMTP_PORT", 587, raising=False)
    monkeypatch.setattr(Config, "SMTP_ENCRYPTION", "STARTTLS", raising=False)
    monkeypatch.setattr(Config, "SMTP_FROM_EMAIL", "noreply@example.org", raising=False)
    monkeypatch.setattr(Config, "SMTP_FROM_NAME", "", raising=False)
    monkeypatch.setattr(Config, "SMTP_USERNAME", "", raising=False)
    monkeypatch.setattr(Config, "SMTP_PASSWORD", "", raising=False)
    monkeypatch.setattr(Config, "SMTP_TIMEOUT", 5, raising=False)
    _RecordingSMTP.sent = []


def _last_sent() -> Message:
    return _RecordingSMTP.sent[-1]


def test_from_header_is_bare_address_without_a_display_name():
    with patch("smtplib.SMTP", _RecordingSMTP):
        EmailSender.send_email("to@example.org", "Subject", "Body")

    assert _last_sent()["From"] == "noreply@example.org"


def test_from_header_carries_the_display_name_when_configured(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(
        Config, "SMTP_FROM_NAME", "Cardholder - Famille Bonnier", raising=False
    )

    with patch("smtplib.SMTP", _RecordingSMTP):
        EmailSender.send_email("to@example.org", "Subject", "Body")

    from_header = _last_sent()["From"]
    assert from_header == "Cardholder - Famille Bonnier <noreply@example.org>"


def test_message_id_domain_is_unaffected_by_the_display_name(
    monkeypatch: pytest.MonkeyPatch,
):
    """A regression guard: an earlier version derived the Message-ID domain by
    splitting the From header on '@', so a display name containing '<' would
    have corrupted it. The domain must come from SMTP_FROM_EMAIL alone.
    """
    monkeypatch.setattr(
        Config, "SMTP_FROM_NAME", "Cardholder - Famille Bonnier", raising=False
    )

    with patch("smtplib.SMTP", _RecordingSMTP):
        EmailSender.send_email("to@example.org", "Subject", "Body")

    message_id = _last_sent()["Message-ID"]
    assert message_id.endswith("@example.org>")
    assert "<" not in message_id[1:-1]


def test_password_reset_email_link_is_a_real_clickable_anchor():
    with patch("smtplib.SMTP", _RecordingSMTP):
        EmailSender.send_password_reset_email(
            "to@example.org", "ABC123", "https://cards.example.org/reset?code=ABC123"
        )

    msg = _last_sent()
    assert msg.is_multipart()
    parts = {p.get_content_type(): p for p in msg.walk() if not p.is_multipart()}

    assert "text/html" in parts
    html = parts["text/html"].get_payload(decode=True).decode()
    assert '<a href="https://cards.example.org/reset?code=ABC123"' in html

    assert "text/plain" in parts
    plain = parts["text/plain"].get_payload(decode=True).decode()
    assert "<a href" not in plain
    assert "https://cards.example.org/reset?code=ABC123" in plain
    assert "ABC123" in plain


def test_password_reset_email_without_url_falls_back_to_a_code():
    with patch("smtplib.SMTP", _RecordingSMTP):
        EmailSender.send_password_reset_email("to@example.org", "ZZZ999", None)

    msg = _last_sent()
    parts = {p.get_content_type(): p for p in msg.walk() if not p.is_multipart()}
    assert "ZZZ999" in parts["text/plain"].get_payload(decode=True).decode()
    assert "ZZZ999" in parts["text/html"].get_payload(decode=True).decode()


def test_disabled_smtp_refuses_to_send():
    Config.SMTP_DISABLED = True
    try:
        with pytest.raises(HTTPException):
            EmailSender.send_email("to@example.org", "Subject", "Body")
    finally:
        Config.SMTP_DISABLED = False
