"""Tests for the password-reset link builder.

This is a security-relevant piece of logic: it decides where the link inside
a password reset email points to. Every case here exists because trusting
the wrong input would let an attacker redirect that link.
"""

import pytest
from starlette.requests import Request

from backend.api.password_recovery_api import build_reset_url
from backend.config import Config


def _request(host: str, scheme: str = "https") -> Request:
    scope = {
        "type": "http",
        "scheme": scheme,
        "headers": [(b"host", host.encode())] if host else [],
    }
    return Request(scope)


@pytest.fixture(autouse=True)
def clear_public_url(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(Config, "PUBLIC_URL", "", raising=False)


def test_uses_public_url_when_configured(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        Config, "PUBLIC_URL", "https://cards.example.org", raising=False
    )

    url = build_reset_url(_request("attacker.example.net"), "CODE1")

    assert url == "https://cards.example.org/password-recovery/submit?code=CODE1"


def test_public_url_is_used_even_when_it_disagrees_with_the_host_header(
    monkeypatch: pytest.MonkeyPatch,
):
    """The whole point: an attacker-controlled Host header must not win."""
    monkeypatch.setattr(
        Config, "PUBLIC_URL", "https://cards.example.org", raising=False
    )

    url = build_reset_url(_request("totally-not-the-real-domain.evil"), "CODE2")

    assert "totally-not-the-real-domain.evil" not in url
    assert url.startswith("https://cards.example.org/")


def test_falls_back_to_the_host_header_when_public_url_is_unset():
    url = build_reset_url(_request("cards.example.org"), "CODE3")

    assert url == "https://cards.example.org/password-recovery/submit?code=CODE3"


def test_returns_none_without_a_host_header_and_no_public_url():
    url = build_reset_url(_request(""), "CODE4")

    assert url is None


def test_public_url_trailing_slash_does_not_produce_a_double_slash(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(
        Config, "PUBLIC_URL", "https://cards.example.org/", raising=False
    )

    url = build_reset_url(_request("irrelevant"), "CODE5")

    assert "//password-recovery" not in url.split("://", 1)[1]
