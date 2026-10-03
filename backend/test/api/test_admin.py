import pytest
from fastapi import HTTPException

from backend.api.admin_api import admin_delete_user
from backend.db.models.user_model import UserModel
from backend.enums.user_role_enum import EUserRole
from backend.testing import mock_session


def _admin() -> UserModel:
    return UserModel(id=1, role_code=EUserRole.ADMIN)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("found", "status", "detail"),
    [
        (UserModel(id=2, role_code=EUserRole.MEMBER), None, None),
        (None, 404, None),
        (UserModel(id=2, role_code=EUserRole.ADMIN), 403, "Admin cannot delete admin"),
    ],
)
async def test_delete_user(found, status, detail) -> None:
    session = mock_session(scalar_one_or_none=found)

    if status is None:
        result = await admin_delete_user(user_id=2, session=session, admin=_admin())
        assert result == {"detail": "User and all related data deleted"}
        return

    with pytest.raises(HTTPException) as exc_info:
        await admin_delete_user(user_id=2, session=session, admin=_admin())

    assert exc_info.value.status_code == status
    if detail is not None:
        assert detail in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_an_admin_cannot_delete_themselves() -> None:
    session = mock_session()

    with pytest.raises(HTTPException) as exc_info:
        await admin_delete_user(user_id=1, session=session, admin=_admin())

    assert exc_info.value.status_code == 403
    assert "cannot delete his own account" in str(exc_info.value.detail)
    session.execute.assert_not_called()
