from fastapi import HTTPException
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from backend.api.user_api import create_user, update_user
from backend.core.auth_core import verify_password
from backend.db.models.user_model import UserModel
from backend.schemas.user_schema import (
    UserCreateSchema,
    UserUpdateSchema,
)
from backend.enums.user_role_enum import EUserRole


def _get_user_create(
    payload={
        "username": "user_name",
        "email": "user_email@example.com",
        "password": "123456qQ",
        "confirm_password": "123456qQ",
    }
) -> UserCreateSchema:
    return UserCreateSchema(**payload)


def _get_user_update(
    payload={
        "username": "user_name",
        "email": "user_email@example.com",
    }
) -> UserUpdateSchema:
    return UserUpdateSchema(**payload)


@pytest.mark.asyncio
async def test_user_should_create_owner():
    user = _get_user_create()

    session_mock = AsyncMock(spec=AsyncSession)
    session_mock.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=None)
    )
    session_mock.add.return_value = None

    with patch(
        "backend.api.user_api.is_creds_taken",
        new_callable=AsyncMock,
    ) as is_creds_taken_mock:
        is_creds_taken_mock.return_value = False

        result = await create_user(user, session_mock, True)
        assert result.role_code == EUserRole.OWNER
        assert (
            session_mock.add.mock_calls[0].args[0].role_code
            == EUserRole.OWNER
        )


@pytest.mark.asyncio
async def test_user_should_create_member():
    user = _get_user_create()

    session_mock = AsyncMock(spec=AsyncSession)
    session_mock.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value={})
    )
    session_mock.add.return_value = None

    with patch(
        "backend.api.user_api.is_creds_taken",
        new_callable=AsyncMock,
    ) as is_creds_taken_mock:
        is_creds_taken_mock.return_value = False

        result = await create_user(user, session_mock, True)
        assert result.role_code != EUserRole.OWNER
        assert (
            session_mock.add.mock_calls[0].args[0].role_code
            != EUserRole.OWNER
        )


@pytest.mark.asyncio
async def test_user_should_not_create_if_creds_taken():
    user = _get_user_create()

    session_mock = AsyncMock(spec=AsyncSession)

    with patch(
        "backend.api.user_api.is_creds_taken",
        new_callable=AsyncMock,
    ) as is_creds_taken_mock:
        is_creds_taken_mock.return_value = True

        with pytest.raises(HTTPException) as exc_info:
            await create_user(user, session_mock, True)

    assert exc_info.value.status_code == 400
    assert (
        exc_info.value.detail == "Username or email is already taken"
    )


@pytest.mark.asyncio
async def test_user_should_not_update_if_creds_taken():
    user = _get_user_update()
    current_user: UserModel = UserModel(id=1)

    session_mock = AsyncMock(spec=AsyncSession)

    with patch(
        "backend.api.user_api.is_creds_taken",
        new_callable=AsyncMock,
    ) as is_creds_taken_mock:
        is_creds_taken_mock.return_value = True

        with pytest.raises(HTTPException) as exc_info:
            await update_user(user, session_mock, current_user)

    assert exc_info.value.status_code == 400
    assert (
        exc_info.value.detail == "Username or email is already taken"
    )


@pytest.mark.asyncio
async def test_user_should_update_with_no_password():
    user = _get_user_update()
    current_user: UserModel = UserModel(id=1)

    session_mock = AsyncMock(spec=AsyncSession)

    with patch(
        "backend.api.user_api.is_creds_taken",
        new_callable=AsyncMock,
    ) as is_creds_taken_mock:
        is_creds_taken_mock.return_value = False
        result = await update_user(user, session_mock, current_user)

        assert result.username == user.username
        assert result.email == user.email


@pytest.mark.asyncio
async def test_user_should_update_with_password():
    user = _get_user_update(
        {
            "username": "user_name",
            "email": "user_email@example.com",
            "password": "123456qQ",
            "confirm_password": "123456qQ",
        }
    )
    current_user: UserModel = UserModel(id=1)

    session_mock = AsyncMock(spec=AsyncSession)

    with patch(
        "backend.api.user_api.is_creds_taken",
        new_callable=AsyncMock,
    ) as is_creds_taken_mock:
        is_creds_taken_mock.return_value = False
        result = await update_user(user, session_mock, current_user)

        assert result.username == user.username
        assert result.email == user.email
        assert verify_password("123456qQ", result.hashed_password)
