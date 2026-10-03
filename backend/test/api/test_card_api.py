from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException, UploadFile
from fastapi.testclient import TestClient
from pytest_mock import MockerFixture

from backend.api.card_api import (
    create_card,
    delete_card,
    delete_card_logo,
    get_card,
    get_card_logo,
    get_cards,
    patch_card,
    update_card,
    upload_card_logo,
)
from backend.app import app
from backend.core.auth_core import is_user
from backend.db.models.card_model import CardModel
from backend.db.models.user_model import UserModel
from backend.db.session import get_async_session
from backend.schemas.card_schema import (
    CardCreateSchema,
    CardPatchSchema,
    CardUpdateSchema,
)
from backend.testing import mock_session


def _user() -> UserModel:
    return UserModel(id=1, username="alice")


def _card(**overrides) -> CardModel:
    values = {
        "id": 10,
        "code": "0123456789012",
        "code_type": "ean13",
        "name": "Shop",
        "user_id": 1,
        "logo_file": None,
    }
    values.update(overrides)
    return CardModel(**values)


@pytest.mark.asyncio
async def test_get_cards_returns_the_callers_cards() -> None:
    card = _card()
    session = mock_session(all_=[card])

    cards = await get_cards(session=session, user=_user())

    assert cards == [card]


@pytest.mark.asyncio
async def test_get_card_returns_an_accessible_card() -> None:
    card = _card()
    session = mock_session(scalar_one_or_none=card)

    assert await get_card(10, session=session, user=_user()) is card


@pytest.mark.asyncio
async def test_create_card_belongs_to_the_caller() -> None:
    session = mock_session()
    body = CardCreateSchema(code="123", code_type="ean13", name="Shop")

    card = await create_card(body, session=session, user=_user())

    assert card.user_id == 1
    assert card.name == "Shop"
    session.add.assert_called_once()
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_card_applies_the_payload() -> None:
    card = _card()
    session = mock_session(scalar_one_or_none=card)
    body = CardUpdateSchema(code="999", code_type="ean13", name="Renamed")

    result = await update_card(10, body, session=session, user=_user())

    assert result.name == "Renamed"
    assert result.code == "999"
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_patch_card_only_touches_what_was_sent() -> None:
    card = _card(name="Shop", code="0123456789012")
    session = mock_session(scalar_one_or_none=card)

    result = await patch_card(
        10, CardPatchSchema(name="Renamed"), session=session, user=_user()
    )

    assert result.name == "Renamed"
    assert result.code == "0123456789012"


@pytest.mark.asyncio
async def test_delete_card_drops_the_logo_after_the_row(mocker: MockerFixture) -> None:
    card = _card(logo_file="abc.webp")
    session = mock_session(scalar_one_or_none=card)
    delete_logo_mock = mocker.patch("backend.api.card_api.delete_logo")

    await delete_card(10, session=session, user=_user())

    session.delete.assert_awaited_once_with(card)
    delete_logo_mock.assert_called_once_with("abc.webp")


@pytest.mark.asyncio
async def test_upload_logo_refuses_an_oversized_file() -> None:
    card = _card()
    session = mock_session(scalar_one_or_none=card)
    upload = MagicMock(spec=UploadFile)
    upload.read = AsyncMock(side_effect=[b"x" * (3 * 1024 * 1024), b""])

    with pytest.raises(HTTPException) as exc_info:
        await upload_card_logo(10, upload, session=session, user=_user())

    assert exc_info.value.status_code == 413


@pytest.mark.asyncio
async def test_upload_logo_stores_the_returned_name(mocker: MockerFixture) -> None:
    card = _card(logo_file="old.webp")
    session = mock_session(scalar_one_or_none=card)
    upload = MagicMock(spec=UploadFile)
    upload.read = AsyncMock(side_effect=[b"bytes", b""])
    mocker.patch("backend.api.card_api.save_logo", return_value="new.webp")
    delete_logo_mock = mocker.patch("backend.api.card_api.delete_logo")

    result = await upload_card_logo(10, upload, session=session, user=_user())

    assert result.logo_file == "new.webp"
    # The previous image only goes once the new name is committed.
    delete_logo_mock.assert_called_once_with("old.webp")


@pytest.mark.asyncio
async def test_get_card_logo_404_without_a_logo() -> None:
    session = mock_session(scalar_one_or_none=_card(logo_file=None))

    with pytest.raises(HTTPException) as exc_info:
        await get_card_logo(10, session=session, user=_user())

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_card_logo_clears_the_reference(mocker: MockerFixture) -> None:
    card = _card(logo_file="abc.webp")
    session = mock_session(scalar_one_or_none=card)
    delete_logo_mock = mocker.patch("backend.api.card_api.delete_logo")

    result = await delete_card_logo(10, session=session, user=_user())

    assert result.logo_file is None
    delete_logo_mock.assert_called_once_with("abc.webp")


_UPDATE = CardUpdateSchema(code="999", code_type="ean13", name="Renamed")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "call",
    [
        pytest.param(
            lambda session: get_card(10, session=session, user=_user()), id="get"
        ),
        pytest.param(
            lambda session: update_card(10, _UPDATE, session=session, user=_user()),
            id="update",
        ),
        pytest.param(
            lambda session: delete_card(10, session=session, user=_user()), id="delete"
        ),
    ],
)
async def test_a_card_of_someone_else_is_not_found(call) -> None:
    session = mock_session()

    with pytest.raises(HTTPException) as exc_info:
        await call(session)

    assert exc_info.value.status_code == 404
    session.commit.assert_not_awaited()
    session.delete.assert_not_awaited()


def test_patch_card_answers_with_the_public_card_shape() -> None:
    """PATCH used to have no response_model, so FastAPI serialised the ORM row
    as-is: the internal logo file name and the owner id went out, and
    has_logo, which every other card endpoint sends, did not."""
    card = _card(logo_file="abc.webp")
    card.is_favorite = False
    card.used_at = None
    card.created_at = card.updated_at = datetime(2026, 1, 1)
    session = mock_session(scalar_one_or_none=card)

    async def _get_session():
        yield session

    app.dependency_overrides[get_async_session] = _get_session
    app.dependency_overrides[is_user] = _user
    response = TestClient(app).patch("/cards/10", json={"is_favorite": True})

    assert response.status_code == 200
    body = response.json()
    assert body["is_favorite"] is True
    assert body["has_logo"] is True
    assert "logo_file" not in body
    assert "user_id" not in body
