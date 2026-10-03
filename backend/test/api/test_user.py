from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from pytest_mock import MockerFixture

from backend.api.user_api import create_user, update_user
from backend.core.auth_core import get_password_hash, verify_password
from backend.db.models.user_model import UserModel
from backend.enums.user_role_enum import EUserRole
from backend.schemas.user_schema import UserCreateSchema, UserUpdateSchema
from backend.testing import mock_session

CURRENT_PASSWORD = "current1Q"
_CREATE = {
    "username": "user_name",
    "email": "user_email@example.com",
    "password": "123456qQ",
    "confirm_password": "123456qQ",
}
_PROFILE = {"username": "user_name", "email": "user_email@example.com"}
_NEW_PASSWORD = {
    **_PROFILE,
    "current_password": CURRENT_PASSWORD,
    "password": "123456qQ",
    "confirm_password": "123456qQ",
}


def _get_user_create(payload: dict | None = None) -> UserCreateSchema:
    return UserCreateSchema(**(payload or _CREATE))


def _get_user_update(payload: dict | None = None) -> UserUpdateSchema:
    return UserUpdateSchema(**(payload or _PROFILE))


def _get_current_user(email: str = "user_email@example.com") -> UserModel:
    return UserModel(
        id=1,
        username="user_name",
        email=email,
        hashed_password=get_password_hash(CURRENT_PASSWORD),
    )


def _creds_free(mocker: MockerFixture) -> None:
    mocker.patch(
        "backend.api.user_api.is_creds_taken",
        new_callable=AsyncMock,
        return_value=False,
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("existing", "owner"),
    [(None, True), (UserModel(id=1), False)],
)
async def test_the_first_account_is_the_owner(
    mocker: MockerFixture, existing, owner: bool
) -> None:
    session = mock_session(scalar_one_or_none=existing)
    _creds_free(mocker)

    result = await create_user(_get_user_create(), session, True)

    added = session.add.mock_calls[0].args[0]
    assert (result.role_code == EUserRole.OWNER) is owner
    assert (added.role_code == EUserRole.OWNER) is owner


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "call",
    [
        pytest.param(
            lambda session: create_user(_get_user_create(), session, True),
            id="create",
        ),
        pytest.param(
            lambda session: update_user(
                _get_user_update(), session, _get_current_user()
            ),
            id="update",
        ),
    ],
)
async def test_taken_credentials_are_refused(mocker: MockerFixture, call) -> None:
    session = mock_session()
    mocker.patch(
        "backend.api.user_api.is_creds_taken",
        new_callable=AsyncMock,
        return_value=True,
    )

    with pytest.raises(HTTPException) as exc_info:
        await call(session)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Username or email is already taken"


@pytest.mark.asyncio
async def test_profile_updates_without_a_password(mocker: MockerFixture) -> None:
    user = _get_user_update()
    _creds_free(mocker)

    result = await update_user(user, mock_session(), _get_current_user())

    assert result.username == user.username
    assert result.email == user.email


@pytest.mark.asyncio
async def test_password_changes_when_the_current_one_matches(
    mocker: MockerFixture,
) -> None:
    _creds_free(mocker)

    result = await update_user(
        _get_user_update(_NEW_PASSWORD), mock_session(), _get_current_user()
    )

    assert verify_password("123456qQ", result.hashed_password)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {**_PROFILE, "password": "123456qQ", "confirm_password": "123456qQ"},
        {**_NEW_PASSWORD, "current_password": "wrong1Qq"},
    ],
    ids=["missing", "wrong"],
)
async def test_password_change_needs_the_current_password(
    mocker: MockerFixture, payload: dict
) -> None:
    current_user = _get_current_user()
    _creds_free(mocker)

    with pytest.raises(HTTPException) as exc_info:
        await update_user(_get_user_update(payload), mock_session(), current_user)

    assert exc_info.value.status_code == 400
    assert verify_password(CURRENT_PASSWORD, current_user.hashed_password)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("field", "value", "previous"),
    [
        ("email", "new_email@example.com", "user_email@example.com"),
        ("username", "new_user_name", "user_name"),
    ],
)
async def test_identity_change_needs_the_current_password(
    mocker: MockerFixture, field: str, value: str, previous: str
) -> None:
    current_user = _get_current_user()
    _creds_free(mocker)

    with pytest.raises(HTTPException) as exc_info:
        await update_user(
            _get_user_update({**_PROFILE, field: value}),
            mock_session(),
            current_user,
        )

    assert exc_info.value.status_code == 400
    assert getattr(current_user, field) == previous


@pytest.mark.asyncio
async def test_username_changes_with_the_current_password(
    mocker: MockerFixture,
) -> None:
    _creds_free(mocker)

    result = await update_user(
        _get_user_update(
            {
                **_PROFILE,
                "username": "new_user_name",
                "current_password": CURRENT_PASSWORD,
            }
        ),
        mock_session(),
        _get_current_user(),
    )

    assert result.username == "new_user_name"


async def _statements(mocker: MockerFixture, payload: dict) -> list[str]:
    session = mock_session()
    _creds_free(mocker)
    await update_user(_get_user_update(payload), session, _get_current_user())
    return [str(call.args[0]) for call in session.execute.mock_calls if call.args]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("payload", "revokes_codes", "revokes_sessions"),
    [
        (_NEW_PASSWORD, True, True),
        (
            {
                **_PROFILE,
                "email": "new_email@example.com",
                "current_password": CURRENT_PASSWORD,
            },
            True,
            False,
        ),
        (
            {
                **_PROFILE,
                "username": "new_user_name",
                "current_password": CURRENT_PASSWORD,
            },
            False,
            False,
        ),
    ],
    ids=["password", "email", "username"],
)
async def test_recovery_codes_and_sessions_follow_the_change(
    mocker: MockerFixture,
    payload: dict,
    revokes_codes: bool,
    revokes_sessions: bool,
) -> None:
    statements = await _statements(mocker, payload)

    assert (
        any("UPDATE password_recovery_codes" in stmt for stmt in statements)
        is revokes_codes
    )
    assert (
        any("UPDATE refresh_token" in stmt for stmt in statements) is revokes_sessions
    )


@pytest.mark.parametrize("username", ["", "   ", "\t\n"])
def test_username_must_not_be_blank(username: str) -> None:
    with pytest.raises(ValueError, match="must not be empty"):
        _get_user_create({**_CREATE, "username": username})
    with pytest.raises(ValueError, match="must not be empty"):
        _get_user_update({"username": username, "email": "user_email@example.com"})
