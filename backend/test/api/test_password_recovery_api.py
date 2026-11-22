"""Tests for the password-reset link builder and the recovery code store.

The link builder decides where the link inside a password reset email points
to. Every case here exists because trusting the wrong input would let an
attacker redirect that link.

The stored code is a sha256 of the value emailed to the user. A copy of the
database must not be a working reset link.
"""

import secrets
from datetime import timedelta
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from starlette.requests import Request

from backend.api.password_recovery_api import build_reset_url
from backend.api.password_recovery_api import code as request_code
from backend.api.password_recovery_api import password as submit_recovery
from backend.config import Config
from backend.core.auth_core import verify_password
from backend.core.hash_core import hash_token
from backend.db.models.password_recovery_code_model import PasswordRecoveryCodeModel
from backend.db.models.user_model import UserModel
from backend.helpers.now import now
from backend.schemas.password_recovery_schema import (
    PasswordRecoveryCodeRequestSchema,
    PasswordRecoverySubmitSchema,
)
from backend.testing import mock_session

_NEW_PASSWORD = "Aa1xxxxx"


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


def _code_session(user):
    # First lookup finds the user (or not), the second finds no recent code.
    return mock_session(
        results=[
            MagicMock(scalar_one_or_none=MagicMock(return_value=user)),
            MagicMock(scalar_one_or_none=MagicMock(return_value=None)),
        ]
    )


@pytest.mark.asyncio
async def test_code_answers_the_same_when_the_email_cannot_be_sent():
    """An error from the mail server only a known address can reach would let
    anyone test which emails have an account."""
    from unittest.mock import patch

    from fastapi import HTTPException

    from backend.api.password_recovery_api import code
    from backend.schemas.password_recovery_schema import (
        PasswordRecoveryCodeRequestSchema,
    )

    body = PasswordRecoveryCodeRequestSchema(email="a@example.com")
    request = _request("example.org")

    unknown = await code(request, body, _code_session(None))

    known_session = _code_session(MagicMock(id=1))
    with patch(
        "backend.api.password_recovery_api.EmailSender.send_password_reset_email",
        side_effect=HTTPException(500, "Failed to send email"),
    ):
        known = await code(request, body, known_session)

    assert known == unknown == {}
    # Nobody received the code, so none is kept.
    known_session.add.assert_not_called()


async def _user(db, email: str = "a@example.com") -> UserModel:
    user = UserModel(username="ada", email=email, hashed_password="old-hash")
    db.add(user)
    await db.commit()
    return user


def _submit(plaintext: str) -> PasswordRecoverySubmitSchema:
    return PasswordRecoverySubmitSchema(
        code=plaintext,
        password=_NEW_PASSWORD,
        confirm_password=_NEW_PASSWORD,
    )


async def _emailed_code(db, mocker, user: UserModel) -> str:
    sent: dict[str, str] = {}

    def capture(_to: str, plaintext: str, _url: str | None) -> None:
        sent["code"] = plaintext

    mocker.patch(
        "backend.api.password_recovery_api.EmailSender.send_password_reset_email",
        side_effect=capture,
    )
    body = PasswordRecoveryCodeRequestSchema(email=user.email)
    await request_code(_request("example.org"), body, db)
    return sent["code"]


@pytest.mark.asyncio
async def test_the_database_holds_the_hash_of_the_emailed_code(db, mocker) -> None:
    user = await _user(db)

    plaintext = await _emailed_code(db, mocker, user)

    stored = (await db.execute(select(PasswordRecoveryCodeModel.code))).scalar_one()
    assert stored == hash_token(plaintext)
    assert stored != plaintext
    assert len(plaintext) == len(secrets.token_urlsafe(32))


@pytest.mark.asyncio
async def test_submit_accepts_the_emailed_code_and_refuses_the_stored_hash(
    db, mocker
) -> None:
    user = await _user(db)
    plaintext = await _emailed_code(db, mocker, user)
    stored = (await db.execute(select(PasswordRecoveryCodeModel.code))).scalar_one()

    with pytest.raises(HTTPException) as rejected:
        await submit_recovery(_submit(stored), db)
    assert rejected.value.status_code == 401
    await db.refresh(user)
    assert user.hashed_password == "old-hash"

    assert await submit_recovery(_submit(plaintext), db) == {}
    await db.refresh(user)
    assert verify_password(_NEW_PASSWORD, user.hashed_password)

    with pytest.raises(HTTPException) as reused:
        await submit_recovery(_submit(plaintext), db)
    assert reused.value.status_code == 401


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("revoked", "lifetime_min"),
    [(False, -1), (True, 15)],
    ids=["expired", "revoked"],
)
async def test_expired_and_revoked_codes_are_refused(
    db, revoked: bool, lifetime_min: int
) -> None:
    user = await _user(db)
    plaintext = "emailed-code"
    db.add(
        PasswordRecoveryCodeModel(
            code=hash_token(plaintext),
            user_id=user.id,
            expires_at=now() + timedelta(minutes=lifetime_min),
            revoked=revoked,
        )
    )
    await db.commit()

    with pytest.raises(HTTPException) as rejected:
        await submit_recovery(_submit(plaintext), db)
    assert rejected.value.status_code == 401


@pytest.mark.asyncio
async def test_a_second_request_inside_a_minute_sends_nothing(db, mocker) -> None:
    user = await _user(db)
    send = mocker.patch(
        "backend.api.password_recovery_api.EmailSender.send_password_reset_email"
    )
    body = PasswordRecoveryCodeRequestSchema(email=user.email)
    request = _request("example.org")

    assert await request_code(request, body, db) == {}
    assert await request_code(request, body, db) == {}

    assert send.call_count == 1
    stored = (await db.execute(select(PasswordRecoveryCodeModel))).scalars().all()
    assert len(stored) == 1
