"""TOTP (RFC 6238) and one-time recovery codes.

SHA1, 6 digits, 30 second step, window of one step either side. The step
that was accepted is stored and never accepted again. Recovery codes are
50 bits of Crockford Base32, stored as an HMAC under MASTER_KEY so a
database dump alone cannot be brute-forced.
"""

import base64
import hashlib
import hmac
import logging
import re
import secrets
import struct
from datetime import UTC, datetime, timedelta
from typing import NoReturn, cast
from urllib.parse import quote

from fastapi import HTTPException
from sqlalchemy import CursorResult, case, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.auth_core import lock_user_row, read_user_for_session
from backend.core.secret_box import (
    SecretBoxError,
    decrypt_totp_secret,
    derive_key,
    is_master_key_configured,
)
from backend.db.models.refresh_token_model import RefreshTokenModel
from backend.db.models.two_factor_recovery_code_model import (
    TwoFactorRecoveryCodeModel,
)
from backend.db.models.user_model import UserModel
from backend.helpers.now import now

logger = logging.getLogger(__name__)

_PERIOD = 30
_DIGITS = 6
_RECOVERY_COUNT = 10
_RECOVERY_BITS = 50
_CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
_LOCKOUT_AFTER = 5
_LOCKOUT_MINUTES = 15
_RECOVERY_PURPOSE = b"cardholder:recovery-code:v1"
TWO_FACTOR_UNAVAILABLE = (
    "Two-factor authentication is temporarily unavailable, contact the administrator"
)
_TOTP_CODE = re.compile(r"^\d{6}$")


def generate_secret() -> str:
    """20 random bytes, Base32, no padding."""
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def _secret_bytes(secret: str) -> bytes:
    padded = secret.upper() + ("=" * ((-len(secret)) % 8))
    return base64.b32decode(padded, casefold=True)


def totp_at(secret: str, step: int) -> str:
    """RFC 4226 HOTP with SHA1, rendered as 6 digits, at one time step."""
    digest = hmac.new(
        _secret_bytes(secret), struct.pack(">Q", step), hashlib.sha1
    ).digest()
    offset = digest[-1] & 0x0F
    binary = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return f"{binary % 10**_DIGITS:0{_DIGITS}d}"


def _as_utc(moment: datetime) -> datetime:
    # helpers.now() is naive UTC. A naive value must not be read as local time.
    if moment.tzinfo is None:
        return moment.replace(tzinfo=UTC)
    return moment


def verify_totp(
    secret: str,
    code: str,
    last_step: int | None,
    moment: datetime,
) -> int | None:
    """Return the matched time step, or None.

    Spaces are removed first. Anything that is not 6 digits is rejected.
    Steps at or before ``last_step`` are skipped, which is what stops a
    code from being replayed inside the window.
    """
    compact = code.replace(" ", "")
    if _TOTP_CODE.fullmatch(compact) is None:
        return None
    current = int(_as_utc(moment).timestamp()) // _PERIOD
    for step in (current - 1, current, current + 1):
        if step < 0:
            continue
        if last_step is not None and step <= last_step:
            continue
        if hmac.compare_digest(totp_at(secret, step), compact):
            return step
    return None


def build_otpauth_uri(secret: str, username: str) -> str:
    issuer = "Cardholder"
    label = f"{quote(issuer, safe='')}:{quote(username, safe='')}"
    query = (
        f"secret={quote(secret, safe='')}"
        f"&issuer={quote(issuer, safe='')}"
        f"&algorithm=SHA1&digits={_DIGITS}&period={_PERIOD}"
    )
    return f"otpauth://totp/{label}?{query}"


def generate_recovery_codes() -> list[str]:
    """10 codes, ``XXXXX-XXXXX``, 50 bits each, Crockford Base32."""
    codes: list[str] = []
    for _ in range(_RECOVERY_COUNT):
        value = secrets.randbits(_RECOVERY_BITS)
        chars = [
            (_CROCKFORD[(value >> (5 * shift)) & 31]) for shift in range(9, -1, -1)
        ]
        raw = "".join(chars)
        codes.append(f"{raw[:5]}-{raw[5:]}")
    return codes


def normalize_recovery_code(code: str) -> str:
    """Upper-case, drop dashes and whitespace, map O/I/L to digits."""
    cleaned = "".join(code.split()).replace("-", "").upper()
    return cleaned.translate(str.maketrans("OIL", "011"))


def hash_recovery_code(code: str) -> str:
    """Keyed HMAC. A different MASTER_KEY produces a different hash."""
    digest = hmac.new(
        derive_key(_RECOVERY_PURPOSE),
        normalize_recovery_code(code).encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"v1:{digest}"


def assert_not_locked(user: UserModel) -> None:
    locked_until = user.two_factor_locked_until
    if locked_until is not None and locked_until > now():
        logger.error("User %s is locked out of two-factor authentication", user.id)
        raise HTTPException(
            status_code=429, detail="Too many failed two-factor attempts"
        )


async def lock_second_factor_user(session: AsyncSession, user_id: int) -> UserModel:
    """Lock the user and return the row this attempt has to use.

    The lock is held until the caller commits, so a parallel attempt cannot
    read the counter, try a code, and only then find out about the lockout.
    A lockout rolls the lock back before the 429: the response is delayed,
    and that wait must not keep the row.
    """
    user = await read_user_for_session(session, user_id)
    try:
        assert_not_locked(user)
    except HTTPException:
        await session.rollback()
        raise
    return user


async def record_failure(session: AsyncSession, user: UserModel) -> None:
    """Count one failed code. The fifth one locks the account for 15 minutes.

    Commits. This is the end of a failed attempt, and the caller is holding
    the user lock: the counter has to land before the response delay, which
    would otherwise keep that lock for the whole wait.
    """
    threshold = UserModel.two_factor_failed_attempts + 1
    locked_until = now() + timedelta(minutes=_LOCKOUT_MINUTES)
    await session.execute(
        update(UserModel)
        .where(UserModel.id == user.id)
        .values(
            two_factor_failed_attempts=case(
                (threshold >= _LOCKOUT_AFTER, 0),
                else_=threshold,
            ),
            two_factor_locked_until=case(
                (threshold >= _LOCKOUT_AFTER, locked_until),
                else_=UserModel.two_factor_locked_until,
            ),
        )
    )
    await session.commit()
    await session.refresh(user)
    if (
        user.two_factor_failed_attempts == 0
        and user.two_factor_locked_until is not None
        and user.two_factor_locked_until > now()
    ):
        logger.error(
            "User %s is locked out of two-factor authentication after %s failures",
            user.id,
            _LOCKOUT_AFTER,
        )


async def clear_failures(session: AsyncSession, user_id: int) -> None:
    await session.execute(
        update(UserModel)
        .where(UserModel.id == user_id)
        .values(two_factor_failed_attempts=0, two_factor_locked_until=None)
    )


async def claim_totp_step(session: AsyncSession, user_id: int, step: int) -> bool:
    """Record the step only if it is newer than the one already stored.

    Does not commit. The caller holds the user lock and commits this together
    with the rest of the attempt.
    """
    result = await session.execute(
        update(UserModel)
        .where(
            UserModel.id == user_id,
            (UserModel.two_factor_last_step.is_(None))
            | (UserModel.two_factor_last_step < step),
        )
        .values(two_factor_last_step=step)
    )
    return cast(CursorResult, result).rowcount == 1


async def consume_recovery_code(session: AsyncSession, user_id: int, code: str) -> bool:
    """Mark one unused code used. Does not commit; the caller holds the lock."""
    result = await session.execute(
        update(TwoFactorRecoveryCodeModel)
        .where(
            TwoFactorRecoveryCodeModel.user_id == user_id,
            TwoFactorRecoveryCodeModel.code_hash == hash_recovery_code(code),
            TwoFactorRecoveryCodeModel.used_at.is_(None),
        )
        .values(used_at=now())
    )
    return cast(CursorResult, result).rowcount == 1


def _unavailable(user_id: int, reason: str) -> NoReturn:
    logger.error(
        "Two-factor authentication unavailable for user %s: %s", user_id, reason
    )
    raise HTTPException(status_code=503, detail=TWO_FACTOR_UNAVAILABLE)


async def verify_second_factor(
    session: AsyncSession, user: UserModel, code: str
) -> bool:
    """A 6-digit code is TOTP. Anything else is a recovery code.

    Does not commit. The caller holds the user lock from
    ``lock_second_factor_user`` and commits a success with the rest of the
    attempt. Missing or unusable MASTER_KEY is a 503, never a skipped factor
    and never a wrong-code response: a wrong key must not burn the lockout.
    """
    if not is_master_key_configured():
        _unavailable(user.id, "MASTER_KEY is not configured")
    if not user.two_factor_secret:
        _unavailable(user.id, "no secret is stored")
    try:
        secret = decrypt_totp_secret(user.two_factor_secret, user.id)
    except SecretBoxError:
        _unavailable(user.id, "the secret could not be decrypted")

    compact = code.replace(" ", "")
    if _TOTP_CODE.fullmatch(compact):
        step = verify_totp(secret, compact, user.two_factor_last_step, now())
        if step is None:
            return False
        return await claim_totp_step(session, user.id, step)
    try:
        return await consume_recovery_code(session, user.id, code)
    except SecretBoxError:
        _unavailable(user.id, "recovery codes could not be checked")


async def replace_recovery_codes(session: AsyncSession, user_id: int) -> list[str]:
    await session.execute(
        delete(TwoFactorRecoveryCodeModel).where(
            TwoFactorRecoveryCodeModel.user_id == user_id
        )
    )
    codes = generate_recovery_codes()
    for code in codes:
        session.add(
            TwoFactorRecoveryCodeModel(
                user_id=user_id,
                code_hash=hash_recovery_code(code),
            )
        )
    return codes


async def revoke_user_refresh_tokens(
    session: AsyncSession, user_id: int, *, commit: bool = True
) -> None:
    """Mark every refresh token revoked.

    Pass ``commit=False`` when the caller inserts the replacement token in
    this same transaction. Committing the revoke first lets that insert land
    after the revoke and survive it. The caller has to hold ``lock_user_row``
    until the commit.
    """
    await session.execute(
        update(RefreshTokenModel)
        .where(RefreshTokenModel.user_id == user_id)
        .values(revoked=True)
    )
    if commit:
        await session.commit()


async def clear_user_two_factor(
    session: AsyncSession, user: UserModel, *, commit: bool = True
) -> None:
    """Drop 2FA state and recovery codes, and revoke refresh tokens.

    Does not need MASTER_KEY: it only clears columns and rows. The user row
    stays locked until the commit, so a refresh cannot insert a token in
    between. Pass ``commit=False`` when this session still has to insert the
    replacement token.
    """
    await lock_user_row(session, user.id)
    user.two_factor_secret = None
    user.two_factor_enabled_at = None
    user.two_factor_last_step = None
    user.two_factor_failed_attempts = 0
    user.two_factor_locked_until = None
    await session.execute(
        delete(TwoFactorRecoveryCodeModel).where(
            TwoFactorRecoveryCodeModel.user_id == user.id
        )
    )
    await revoke_user_refresh_tokens(session, user.id, commit=False)
    if commit:
        await session.commit()


async def warn_if_two_factor_key_unusable() -> None:
    """Log when enabled users cannot be verified with the current key.

    Startup continues either way. An admin reset does not need the key.
    """
    from sqlalchemy import select

    from backend.db.session import _async_session_maker

    try:
        async with _async_session_maker() as session:
            result = await session.execute(
                select(UserModel)
                .where(UserModel.two_factor_enabled_at.is_not(None))
                .limit(1)
            )
            user = result.scalar_one_or_none()
    except Exception:
        logger.exception("Could not check two-factor secrets at startup")
        return
    if user is None:
        return
    if not is_master_key_configured():
        logger.error(
            "MASTER_KEY is not configured but at least one user has "
            "two-factor authentication enabled"
        )
        return
    try:
        decrypt_totp_secret(user.two_factor_secret or "", user.id)
    except SecretBoxError:
        logger.error(
            "MASTER_KEY does not match stored two-factor secrets; an admin "
            "must reset two-factor authentication for affected users"
        )
