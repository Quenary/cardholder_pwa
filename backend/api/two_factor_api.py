import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.auth_api import issue_token_pair
from backend.core.auth_core import is_user, lock_user_row, verify_password
from backend.core.secret_box import (
    SecretBoxError,
    decrypt_totp_secret,
    encrypt_totp_secret,
    is_master_key_configured,
)
from backend.core.two_factor_core import (
    TWO_FACTOR_UNAVAILABLE,
    build_otpauth_uri,
    claim_totp_step,
    clear_failures,
    clear_user_two_factor,
    generate_secret,
    lock_second_factor_user,
    record_failure,
    replace_recovery_codes,
    revoke_user_refresh_tokens,
    verify_second_factor,
    verify_totp,
)
from backend.db.models.user_model import UserModel
from backend.db.session import get_async_session
from backend.helpers.delay_to_minimum import delay_to_minimum
from backend.helpers.now import now
from backend.schemas.auth_schema import TokenResponseSchema
from backend.schemas.two_factor_schema import (
    TwoFactorDisableResponseSchema,
    TwoFactorEnableResponseSchema,
    TwoFactorPasswordCodeSchema,
    TwoFactorRecoveryCodesResponseSchema,
    TwoFactorSetupResponseSchema,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["two-factor"])

_NOT_CONFIGURED = (
    "Two-factor authentication is unavailable: MASTER_KEY is not configured"
)
_ALREADY_ENABLED = "Two-factor authentication is already enabled"
_NOT_ENABLED = "Two-factor authentication is not enabled"
_NOT_PENDING = "Two-factor authentication setup is not pending"
_BAD_PASSWORD = "Current password is incorrect"
_BAD_CODE = "Invalid two-factor code"


def _require_configured() -> None:
    if not is_master_key_configured():
        raise HTTPException(status_code=503, detail=_NOT_CONFIGURED)


def _require_password(user: UserModel, password: str) -> None:
    if not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=400, detail=_BAD_PASSWORD)


async def _confirmed(
    session: AsyncSession,
    user: UserModel,
    body: TwoFactorPasswordCodeSchema,
) -> UserModel:
    """Shared checks for disable and recovery-code regeneration.

    Returns the locked row. The caller commits the attempt, and the lock
    stays until that commit.
    """
    if user.two_factor_enabled_at is None:
        raise HTTPException(status_code=400, detail=_NOT_ENABLED)
    _require_password(user, body.password)
    user = await lock_second_factor_user(session, user.id)
    if user.two_factor_enabled_at is None:
        await session.rollback()
        raise HTTPException(status_code=400, detail=_NOT_ENABLED)
    try:
        accepted = await verify_second_factor(session, user, body.code)
    except HTTPException:
        await session.rollback()
        raise
    # record_failure commits, which releases the lock. Rolling back after
    # that would expire the user the caller still holds.
    if not accepted:
        await record_failure(session, user)
        raise HTTPException(status_code=400, detail=_BAD_CODE)
    return user


async def _revoke_and_issue(
    request: Request,
    session: AsyncSession,
    user: UserModel,
) -> TokenResponseSchema:
    """Revoke every existing refresh token, then issue a pair for this session.

    Both writes commit together. A token inserted after the revoke committed
    would never be revoked.
    """
    await lock_user_row(session, user.id)
    await revoke_user_refresh_tokens(session, user.id, commit=False)
    return await issue_token_pair(request, session, user)


@router.post("/user/2fa/setup", response_model=TwoFactorSetupResponseSchema)
@delay_to_minimum(1)
async def setup_two_factor(
    session: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(is_user),
):
    _require_configured()
    if current_user.two_factor_enabled_at is not None:
        raise HTTPException(status_code=409, detail=_ALREADY_ENABLED)
    secret = generate_secret()
    current_user.two_factor_secret = encrypt_totp_secret(secret, current_user.id)
    current_user.two_factor_last_step = None
    await session.commit()
    return TwoFactorSetupResponseSchema(
        secret=secret,
        otpauth_uri=build_otpauth_uri(secret, current_user.username),
    )


@router.post("/user/2fa/enable", response_model=TwoFactorEnableResponseSchema)
@delay_to_minimum(1)
async def enable_two_factor(
    body: TwoFactorPasswordCodeSchema,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(is_user),
):
    _require_configured()
    if current_user.two_factor_enabled_at is not None:
        raise HTTPException(status_code=409, detail=_ALREADY_ENABLED)
    if not current_user.two_factor_secret:
        raise HTTPException(status_code=400, detail=_NOT_PENDING)
    _require_password(current_user, body.password)
    current_user = await lock_second_factor_user(session, current_user.id)
    try:
        if current_user.two_factor_enabled_at is not None:
            raise HTTPException(status_code=409, detail=_ALREADY_ENABLED)
        if not current_user.two_factor_secret:
            raise HTTPException(status_code=400, detail=_NOT_PENDING)
        try:
            secret = decrypt_totp_secret(
                current_user.two_factor_secret, current_user.id
            )
        except SecretBoxError:
            logger.error(
                "Cannot decrypt the pending two-factor secret for user %s",
                current_user.id,
            )
            raise HTTPException(
                status_code=503, detail=TWO_FACTOR_UNAVAILABLE
            ) from None
        step = verify_totp(secret, body.code, current_user.two_factor_last_step, now())
        accepted = step is not None and await claim_totp_step(
            session, current_user.id, step
        )
    except HTTPException:
        await session.rollback()
        raise
    if not accepted:
        await record_failure(session, current_user)
        raise HTTPException(status_code=400, detail=_BAD_CODE)
    current_user.two_factor_enabled_at = now()
    await clear_failures(session, current_user.id)
    codes = await replace_recovery_codes(session, current_user.id)
    tokens = await _revoke_and_issue(request, session, current_user)
    return TwoFactorEnableResponseSchema(recovery_codes=codes, tokens=tokens)


@router.post("/user/2fa/disable", response_model=TwoFactorDisableResponseSchema)
@delay_to_minimum(1)
async def disable_two_factor(
    body: TwoFactorPasswordCodeSchema,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(is_user),
):
    current_user = await _confirmed(session, current_user, body)
    await clear_user_two_factor(session, current_user, commit=False)
    tokens = await issue_token_pair(request, session, current_user)
    return TwoFactorDisableResponseSchema(tokens=tokens)


@router.post(
    "/user/2fa/recovery-codes",
    response_model=TwoFactorRecoveryCodesResponseSchema,
)
@delay_to_minimum(1)
async def regenerate_recovery_codes(
    body: TwoFactorPasswordCodeSchema,
    session: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(is_user),
):
    current_user = await _confirmed(session, current_user, body)
    await clear_failures(session, current_user.id)
    codes = await replace_recovery_codes(session, current_user.id)
    await session.commit()
    return TwoFactorRecoveryCodesResponseSchema(recovery_codes=codes)
