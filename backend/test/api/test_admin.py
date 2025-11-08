from fastapi import HTTPException
import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from typing import cast, Any
from backend.api.admin import admin_delete_user
from backend.db.models import User
from backend.enums import EUserRole


@pytest.mark.asyncio
async def test_admin__should_delete_user():
    admin = User(id=1, role_code=EUserRole.ADMIN)
    user_to_delete = User(id=2, role_code=EUserRole.MEMBER)

    session_mock = AsyncMock(spec=AsyncSession)
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = user_to_delete
    session_mock.execute.return_value = result_mock

    result = await admin_delete_user(
        user_id=2, session=session_mock, admin=cast(Any, admin)
    )
    assert result == {"detail": "User and all related data deleted"}


@pytest.mark.asyncio
async def test_admin__should_not_delete_self():
    admin = User(id=1, role_code=EUserRole.ADMIN)

    session_mock = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await admin_delete_user(user_id=1, session=session_mock, admin=admin)

    assert exc_info.value.status_code == 403
    assert "cannot delete his own account" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_admin__user_not_found():
    admin = User(id=1, role_code=EUserRole.ADMIN)

    session_mock = AsyncMock(spec=AsyncSession)
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    session_mock.execute.return_value = result_mock

    with pytest.raises(HTTPException) as exc_info:
        await admin_delete_user(user_id=999, session=session_mock, admin=admin)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_admin__should_not_delete_other_admin():
    admin = User(id=1, role_code=EUserRole.ADMIN)
    another_admin = User(id=2, role_code=EUserRole.ADMIN)

    session_mock = AsyncMock(spec=AsyncSession)
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = another_admin
    session_mock.execute.return_value = result_mock

    with pytest.raises(HTTPException) as exc_info:
        await admin_delete_user(user_id=2, session=session_mock, admin=admin)

    assert exc_info.value.status_code == 403
    assert "Admin cannot delete admin" in str(exc_info.value.detail)
