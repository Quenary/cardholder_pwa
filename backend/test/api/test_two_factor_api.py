"""Two-factor login, enrollment, and admin reset, against a real database."""

import asyncio
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select, update
from starlette.requests import Request

from backend.api.admin_api import admin_reset_two_factor
from backend.api.auth_api import login, login_two_factor
from backend.api.public_api import settings as public_settings
from backend.api.two_factor_api import (
    disable_two_factor,
    enable_two_factor,
    regenerate_recovery_codes,
    setup_two_factor,
)
from backend.api.user_api import update_user
from backend.config import Config
from backend.core.auth_core import (
    create_access_token,
    create_challenge_token,
    get_password_hash,
    hash_refresh_token,
    is_user,
)
from backend.core.two_factor_core import hash_recovery_code, totp_at
from backend.db.models.refresh_token_model import RefreshTokenModel
from backend.db.models.two_factor_recovery_code_model import (
    TwoFactorRecoveryCodeModel,
)
from backend.db.models.user_model import UserModel
from backend.enums.user_role_enum import EUserRole
from backend.helpers.now import now
from backend.schemas.two_factor_schema import (
    TwoFactorPasswordCodeSchema,
    TwoFactorVerifySchema,
)
from backend.schemas.user_schema import UserSchema, UserUpdateSchema
from backend.testing import sqlite_db

PASSWORD = "secret12"
PASSWORD_HASH = get_password_hash(PASSWORD)


@pytest.fixture(autouse=True)
def _no_minimum_delay(monkeypatch):
    async def _sleep(_seconds: float) -> None:
        return None

    monkeypatch.setattr("backend.helpers.delay_to_minimum.asyncio.sleep", _sleep)


@pytest.fixture
def master_key(monkeypatch):
    key = b"m" * 32
    monkeypatch.setattr(Config, "MASTER_KEY", key)
    return key


def _request() -> Request:
    return Request(
        {
            "type": "http",
            "headers": [(b"user-agent", b"pytest")],
            "client": ("127.0.0.1", 1),
        }
    )


def _form(password: str, username: str = "alice") -> OAuth2PasswordRequestForm:
    return OAuth2PasswordRequestForm(username=username, password=password)


def _code(secret: str, moment: datetime | None = None, offset: int = 0) -> str:
    """Code at ``moment``. ``offset`` steps past it, still inside the ±1 window.

    Enrollment claims the current step, so the next check in the same
    half-minute has to use the following step or it is a replay.
    """
    moment = moment or datetime.now(UTC)
    return totp_at(secret, int(moment.timestamp()) // 30 + offset)


async def _count_refresh(db) -> int:
    return await db.scalar(select(func.count()).select_from(RefreshTokenModel))


async def _user(db, **extra) -> UserModel:
    user = UserModel(
        username=extra.pop("username", "alice"),
        email=extra.pop("email", "alice@example.com"),
        hashed_password=extra.pop("hashed_password", PASSWORD_HASH),
        role_code=extra.pop("role_code", EUserRole.MEMBER),
        **extra,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _enroll(db) -> tuple[UserModel, str, list[str]]:
    user = await _user(db)
    setup = await setup_two_factor(session=db, current_user=user)
    enabled = await enable_two_factor(
        TwoFactorPasswordCodeSchema(password=PASSWORD, code=_code(setup.secret)),
        _request(),
        db,
        user,
    )
    await db.refresh(user)
    return user, setup.secret, enabled.recovery_codes


@pytest.mark.asyncio
async def test_login_without_two_factor_issues_tokens(db, master_key) -> None:
    await _user(db)

    response = await login(_request(), _form(PASSWORD), db)

    assert response.refresh_token
    assert await _count_refresh(db) == 1


@pytest.mark.asyncio
async def test_login_with_two_factor_returns_a_challenge_and_no_refresh_token(
    db, master_key
) -> None:
    await _enroll(db)
    before = await _count_refresh(db)

    response = await login(_request(), _form(PASSWORD), db)

    assert response.two_factor_required is True
    assert response.challenge_token
    assert await _count_refresh(db) == before


@pytest.mark.asyncio
async def test_login_does_not_trust_a_stale_two_factor_flag(db, master_key, mocker):
    """The password check returns the user loaded before it. Enabling 2FA in
    that window has to be visible before a refresh token is inserted."""
    user = await _user(db)
    await db.execute(
        update(UserModel)
        .where(UserModel.id == user.id)
        .values(two_factor_enabled_at=now())
    )
    await db.commit()
    user.two_factor_enabled_at = None
    mocker.patch("backend.api.auth_api.authenticate_user", return_value=user)

    response = await login(_request(), _form(PASSWORD), db)

    assert response.two_factor_required is True
    assert await _count_refresh(db) == 0


@pytest.mark.asyncio
async def test_wrong_password_is_still_a_401(db, master_key) -> None:
    await _enroll(db)
    before = await _count_refresh(db)

    with pytest.raises(HTTPException) as exc_info:
        await login(_request(), _form("nope-nope"), db)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Incorrect username or password"
    assert await _count_refresh(db) == before


@pytest.mark.asyncio
async def test_missing_master_key_still_challenges_a_two_factor_user(
    db, master_key, monkeypatch
) -> None:
    await _enroll(db)
    monkeypatch.setattr(Config, "MASTER_KEY", None)

    response = await login(_request(), _form(PASSWORD), db)

    assert response.two_factor_required is True
    assert await _count_refresh(db) == 1


@pytest.mark.asyncio
async def test_token_types_are_enforced(db) -> None:
    user = await _user(db)
    access, _ = create_access_token({"sub": str(user.id)})
    payload = jwt.decode(
        access, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITHM]
    )
    assert payload["typ"] == "access"
    assert (await is_user(access, db)).id == user.id

    bare = jwt.encode(
        {"sub": str(user.id), "exp": now() + timedelta(minutes=5)},
        Config.JWT_SECRET_KEY,
        algorithm=Config.JWT_ALGORITHM,
    )
    with pytest.raises(HTTPException) as bare_exc:
        await is_user(bare, db)
    assert bare_exc.value.status_code == 401
    assert bare_exc.value.detail == "Invalid token"

    challenge, _ = create_challenge_token(user.id)
    with pytest.raises(HTTPException) as challenge_exc:
        await is_user(challenge, db)
    assert challenge_exc.value.status_code == 401

    with pytest.raises(HTTPException) as access_exc:
        await login_two_factor(
            _request(),
            TwoFactorVerifySchema(challenge_token=access, code="000000"),
            db,
        )
    assert access_exc.value.status_code == 401
    assert access_exc.value.detail == "Invalid or expired two-factor challenge"


@pytest.mark.asyncio
async def test_valid_totp_issues_tokens_and_replay_does_not(db, master_key) -> None:
    user, secret, _codes = await _enroll(db)
    challenge = (await login(_request(), _form(PASSWORD), db)).challenge_token
    before = await _count_refresh(db)
    code = _code(secret, offset=1)

    tokens = await login_two_factor(
        _request(),
        TwoFactorVerifySchema(challenge_token=challenge, code=code),
        db,
    )

    assert tokens.access_token
    assert await _count_refresh(db) == before + 1

    again = (await login(_request(), _form(PASSWORD), db)).challenge_token
    with pytest.raises(HTTPException) as exc_info:
        await login_two_factor(
            _request(),
            TwoFactorVerifySchema(challenge_token=again, code=code),
            db,
        )
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid two-factor code"


@pytest.mark.asyncio
async def test_expired_challenge_is_rejected(db, master_key) -> None:
    user, _secret, _codes = await _enroll(db)
    expired = jwt.encode(
        {
            "sub": str(user.id),
            "typ": "2fa_challenge",
            "exp": now() - timedelta(minutes=1),
        },
        Config.JWT_SECRET_KEY,
        algorithm=Config.JWT_ALGORITHM,
    )
    with pytest.raises(HTTPException) as exc_info:
        await login_two_factor(
            _request(),
            TwoFactorVerifySchema(challenge_token=expired, code="000000"),
            db,
        )
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid or expired two-factor challenge"


@pytest.mark.asyncio
async def test_recovery_code_works_once(db, master_key) -> None:
    _user_row, _secret, codes = await _enroll(db)
    challenge = (await login(_request(), _form(PASSWORD), db)).challenge_token

    await login_two_factor(
        _request(),
        TwoFactorVerifySchema(challenge_token=challenge, code=codes[0]),
        db,
    )
    again = (await login(_request(), _form(PASSWORD), db)).challenge_token
    with pytest.raises(HTTPException) as exc_info:
        await login_two_factor(
            _request(),
            TwoFactorVerifySchema(challenge_token=again, code=codes[0]),
            db,
        )
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_lockout_then_expiry(db, master_key, monkeypatch) -> None:
    _user_row, secret, _codes = await _enroll(db)
    challenge = (await login(_request(), _form(PASSWORD), db)).challenge_token
    body = TwoFactorVerifySchema(challenge_token=challenge, code="000000")
    for _ in range(5):
        with pytest.raises(HTTPException) as exc_info:
            await login_two_factor(_request(), body, db)
        assert exc_info.value.status_code == 401

    with pytest.raises(HTTPException) as locked:
        await login_two_factor(
            _request(),
            TwoFactorVerifySchema(challenge_token=challenge, code=_code(secret)),
            db,
        )
    assert locked.value.status_code == 429

    frozen = now() + timedelta(minutes=16)
    monkeypatch.setattr("backend.core.two_factor_core.now", lambda: frozen)
    tokens = await login_two_factor(
        _request(),
        TwoFactorVerifySchema(
            challenge_token=challenge,
            code=_code(secret, frozen.replace(tzinfo=UTC)),
        ),
        db,
    )
    assert tokens.access_token


@pytest.mark.asyncio
async def test_a_parallel_attempt_waits_behind_the_lockout(
    tmp_path, master_key, monkeypatch
) -> None:
    """The second code cannot be checked until the first attempt has committed.

    Both used to read the counter, pass the lock check, and try a code.
    The first one here sits inside verification while it still holds the
    user row, so the other attempt must wait instead of joining it.
    """
    in_verify = 0
    release = asyncio.Event()

    async def hold_the_lock(_session, _user, _code) -> bool:
        nonlocal in_verify
        in_verify += 1
        if in_verify == 1:
            await release.wait()
        return False

    monkeypatch.setattr("backend.api.auth_api.verify_second_factor", hold_the_lock)

    async with sqlite_db(tmp_path / "lock.db") as maker:
        async with maker() as db:
            _user_row, _secret, _codes = await _enroll(db)
            await db.execute(
                update(UserModel)
                .where(UserModel.id == _user_row.id)
                .values(two_factor_failed_attempts=4)
            )
            await db.commit()
            challenge = (await login(_request(), _form(PASSWORD), db)).challenge_token

        body = TwoFactorVerifySchema(challenge_token=challenge, code="000000")

        async def attempt() -> None:
            async with maker() as session:
                await login_two_factor(_request(), body, session)

        first = asyncio.create_task(attempt())
        second = asyncio.create_task(attempt())
        try:
            try:
                await asyncio.wait_for(asyncio.shield(first), timeout=0.5)
            except TimeoutError:
                pass
            assert in_verify == 1
            await asyncio.sleep(0.05)
            assert in_verify == 1
            release.set()
            results = await asyncio.gather(first, second, return_exceptions=True)
        finally:
            release.set()
            pending = [task for task in (first, second) if not task.done()]
            for task in pending:
                task.cancel()
            if pending:
                await asyncio.gather(first, second, return_exceptions=True)

    statuses = sorted(
        result.status_code for result in results if isinstance(result, HTTPException)
    )
    assert statuses == [401, 429]
    assert in_verify == 1


@pytest.mark.asyncio
@pytest.mark.parametrize("break_key", [None, b"z" * 32])
async def test_unusable_master_key_is_a_503_and_issues_no_tokens(
    db, master_key, monkeypatch, break_key
) -> None:
    await _enroll(db)
    monkeypatch.setattr(Config, "MASTER_KEY", break_key)
    challenge = (await login(_request(), _form(PASSWORD), db)).challenge_token
    before = await _count_refresh(db)

    with pytest.raises(HTTPException) as exc_info:
        await login_two_factor(
            _request(),
            TwoFactorVerifySchema(challenge_token=challenge, code="000000"),
            db,
        )

    assert exc_info.value.status_code == 503
    assert "temporarily unavailable" in exc_info.value.detail
    assert await _count_refresh(db) == before


@pytest.mark.asyncio
async def test_setup_requires_the_master_key(db, monkeypatch) -> None:
    monkeypatch.setattr(Config, "MASTER_KEY", None)
    user = await _user(db)
    with pytest.raises(HTTPException) as exc_info:
        await setup_two_factor(session=db, current_user=user)
    assert exc_info.value.status_code == 503
    assert "MASTER_KEY is not configured" in exc_info.value.detail


@pytest.mark.asyncio
async def test_enable_stores_ciphertext_codes_and_rotates_sessions(
    db, master_key
) -> None:
    user = await _user(db)
    old = RefreshTokenModel(
        token=hash_refresh_token("old-session"),
        user_id=user.id,
        expires_at=now() + timedelta(days=1),
    )
    db.add(old)
    await db.commit()
    setup = await setup_two_factor(session=db, current_user=user)
    await db.refresh(user)
    assert user.two_factor_secret != setup.secret
    assert user.two_factor_secret.startswith("v1:")

    enabled = await enable_two_factor(
        TwoFactorPasswordCodeSchema(password=PASSWORD, code=_code(setup.secret)),
        _request(),
        db,
        user,
    )

    await db.refresh(user)
    await db.refresh(old)
    assert user.two_factor_enabled_at is not None
    assert len(enabled.recovery_codes) == 10
    assert enabled.tokens is not None
    assert enabled.tokens.refresh_token != "old-session"
    assert old.revoked is True
    stored = set(
        (
            await db.execute(
                select(TwoFactorRecoveryCodeModel.code_hash).where(
                    TwoFactorRecoveryCodeModel.user_id == user.id
                )
            )
        ).scalars()
    )
    assert len(stored) == 10
    for code in enabled.recovery_codes:
        assert code not in stored
        assert hash_recovery_code(code) in stored
    dumped = UserSchema.model_validate(user).model_dump()
    assert dumped["two_factor_enabled"] is True
    assert "two_factor_secret" not in dumped


@pytest.mark.asyncio
async def test_enable_rejects_a_wrong_password_a_wrong_code_and_a_second_enable(
    db, master_key
) -> None:
    user = await _user(db)
    setup = await setup_two_factor(session=db, current_user=user)

    with pytest.raises(HTTPException) as password_exc:
        await enable_two_factor(
            TwoFactorPasswordCodeSchema(
                password="wrong-pass", code=_code(setup.secret)
            ),
            _request(),
            db,
            user,
        )
    assert password_exc.value.status_code == 400
    assert password_exc.value.detail == "Current password is incorrect"

    with pytest.raises(HTTPException) as code_exc:
        await enable_two_factor(
            TwoFactorPasswordCodeSchema(password=PASSWORD, code="000000"),
            _request(),
            db,
            user,
        )
    assert code_exc.value.status_code == 400
    assert code_exc.value.detail == "Invalid two-factor code"

    await enable_two_factor(
        TwoFactorPasswordCodeSchema(password=PASSWORD, code=_code(setup.secret)),
        _request(),
        db,
        user,
    )
    with pytest.raises(HTTPException) as enabled_exc:
        await enable_two_factor(
            TwoFactorPasswordCodeSchema(password=PASSWORD, code=_code(setup.secret)),
            _request(),
            db,
            user,
        )
    assert enabled_exc.value.status_code == 409


@pytest.mark.asyncio
async def test_disable_accepts_totp_or_a_recovery_code(db, master_key) -> None:
    user, secret, codes = await _enroll(db)
    disabled = await disable_two_factor(
        TwoFactorPasswordCodeSchema(password=PASSWORD, code=_code(secret, offset=1)),
        _request(),
        db,
        user,
    )
    await db.refresh(user)
    assert user.two_factor_enabled_at is None
    assert user.two_factor_secret is None
    assert disabled.tokens is not None
    left = await db.scalar(
        select(func.count())
        .select_from(TwoFactorRecoveryCodeModel)
        .where(TwoFactorRecoveryCodeModel.user_id == user.id)
    )
    assert left == 0

    other, _secret, other_codes = await _enroll_named(db, "bob", "bob@example.com")
    await disable_two_factor(
        TwoFactorPasswordCodeSchema(password=PASSWORD, code=other_codes[0]),
        _request(),
        db,
        other,
    )
    await db.refresh(other)
    assert other.two_factor_enabled_at is None


async def _enroll_named(db, username: str, email: str):
    user = await _user(db, username=username, email=email)
    setup = await setup_two_factor(session=db, current_user=user)
    enabled = await enable_two_factor(
        TwoFactorPasswordCodeSchema(password=PASSWORD, code=_code(setup.secret)),
        _request(),
        db,
        user,
    )
    await db.refresh(user)
    return user, setup.secret, enabled.recovery_codes


@pytest.mark.asyncio
async def test_disable_rejects_a_wrong_password_and_a_wrong_code(
    db, master_key
) -> None:
    user, _secret, _codes = await _enroll(db)
    with pytest.raises(HTTPException) as password_exc:
        await disable_two_factor(
            TwoFactorPasswordCodeSchema(password="wrong-pass", code="000000"),
            _request(),
            db,
            user,
        )
    assert password_exc.value.status_code == 400
    assert password_exc.value.detail == "Current password is incorrect"

    with pytest.raises(HTTPException) as code_exc:
        await disable_two_factor(
            TwoFactorPasswordCodeSchema(password=PASSWORD, code="000000"),
            _request(),
            db,
            user,
        )
    assert code_exc.value.status_code == 400
    assert code_exc.value.detail == "Invalid two-factor code"


@pytest.mark.asyncio
async def test_regenerate_replaces_the_old_codes(db, master_key) -> None:
    user, secret, codes = await _enroll(db)
    fresh = await regenerate_recovery_codes(
        TwoFactorPasswordCodeSchema(password=PASSWORD, code=codes[0]),
        db,
        user,
    )
    assert fresh.recovery_codes != codes
    stored = set(
        (
            await db.execute(
                select(TwoFactorRecoveryCodeModel.code_hash).where(
                    TwoFactorRecoveryCodeModel.user_id == user.id
                )
            )
        ).scalars()
    )
    assert hash_recovery_code(codes[1]) not in stored
    assert hash_recovery_code(fresh.recovery_codes[0]) in stored

    with pytest.raises(HTTPException) as exc_info:
        await regenerate_recovery_codes(
            TwoFactorPasswordCodeSchema(password=PASSWORD, code=codes[1]),
            db,
            user,
        )
    assert exc_info.value.status_code == 400
    # A current TOTP still works, and does not revoke the session.
    before = await _count_refresh(db)
    await regenerate_recovery_codes(
        TwoFactorPasswordCodeSchema(password=PASSWORD, code=_code(secret, offset=1)),
        db,
        user,
    )
    assert await _count_refresh(db) == before


@pytest.mark.asyncio
async def test_regenerate_clears_the_failure_counter(db, master_key) -> None:
    user, _secret, codes = await _enroll(db)
    user.two_factor_failed_attempts = 4
    await db.commit()

    await regenerate_recovery_codes(
        TwoFactorPasswordCodeSchema(password=PASSWORD, code=codes[0]),
        db,
        user,
    )

    await db.refresh(user)
    assert user.two_factor_failed_attempts == 0
    assert user.two_factor_locked_until is None


@pytest.mark.asyncio
async def test_password_change_does_not_disable_two_factor(db, master_key) -> None:
    user, _secret, _codes = await _enroll(db)
    await update_user(
        UserUpdateSchema(
            username=user.username,
            email=user.email,
            current_password=PASSWORD,
            password="Secret123",
            confirm_password="Secret123",
        ),
        db,
        user,
    )
    await db.refresh(user)
    assert user.two_factor_enabled_at is not None
    assert user.two_factor_secret


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("actor_role", "target_role", "same", "status"),
    [
        (EUserRole.OWNER, EUserRole.MEMBER, False, None),
        (EUserRole.ADMIN, EUserRole.ADMIN, False, 403),
        (EUserRole.ADMIN, EUserRole.OWNER, False, 403),
        (EUserRole.ADMIN, EUserRole.MEMBER, True, 403),
    ],
)
async def test_admin_reset_permission_matrix(
    db, actor_role, target_role, same, status
) -> None:
    actor = await _user(
        db,
        username="actor",
        email="actor@example.com",
        role_code=actor_role,
        two_factor_enabled_at=now(),
        two_factor_secret="v1:unused",
    )
    target = actor
    if not same:
        target = await _user(
            db,
            username="target",
            email="target@example.com",
            role_code=target_role,
            two_factor_enabled_at=now(),
            two_factor_secret="v1:unused",
        )
        db.add(
            TwoFactorRecoveryCodeModel(user_id=target.id, code_hash="v1:" + "cd" * 32)
        )
        db.add(
            RefreshTokenModel(
                token=hash_refresh_token(f"rt-{target.id}"),
                user_id=target.id,
                expires_at=now() + timedelta(days=1),
            )
        )
        await db.commit()

    if status is not None:
        with pytest.raises(HTTPException) as exc_info:
            await admin_reset_two_factor(target.id, db, actor)
        assert exc_info.value.status_code == status
        return

    await admin_reset_two_factor(target.id, db, actor)
    await db.refresh(target)
    assert target.two_factor_secret is None
    assert target.two_factor_enabled_at is None
    left = await db.scalar(
        select(func.count())
        .select_from(TwoFactorRecoveryCodeModel)
        .where(TwoFactorRecoveryCodeModel.user_id == target.id)
    )
    assert left == 0
    revoked = await db.scalar(
        select(RefreshTokenModel.revoked).where(RefreshTokenModel.user_id == target.id)
    )
    assert revoked is True


@pytest.mark.asyncio
async def test_admin_reset_missing_user_is_404(db) -> None:
    actor = await _user(db, role_code=EUserRole.OWNER)
    with pytest.raises(HTTPException) as exc_info:
        await admin_reset_two_factor(999, db, actor)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_admin_reset_works_without_a_master_key(db, monkeypatch) -> None:
    monkeypatch.setattr(Config, "MASTER_KEY", None)
    actor = await _user(
        db, username="owner", email="owner@example.com", role_code=EUserRole.OWNER
    )
    target = await _user(
        db,
        two_factor_enabled_at=now(),
        two_factor_secret="v1:cannot-decrypt",
    )
    await admin_reset_two_factor(target.id, db, actor)
    await db.refresh(target)
    assert target.two_factor_enabled_at is None
    assert target.two_factor_secret is None


@pytest.mark.asyncio
@pytest.mark.parametrize("configured", [False, True])
async def test_public_settings_expose_two_factor_availability(
    db, monkeypatch, configured: bool
) -> None:
    monkeypatch.setattr(Config, "MASTER_KEY", b"m" * 32 if configured else None)
    rows = await public_settings(db)
    found = {row["key"]: row["value"] for row in rows}
    assert found["TWO_FACTOR_AVAILABLE"] is configured
