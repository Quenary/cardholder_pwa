from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

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
from backend.db.models.card_model import CardModel
from backend.db.models.user_model import UserModel
from backend.schemas.card_schema import (
    CardCreateSchema,
    CardPatchSchema,
    CardUpdateSchema,
)


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


def _session(scalar_one_or_none=None, all_=None) -> AsyncMock:
    session = AsyncMock(spec=AsyncSession)
    result = MagicMock()
    result.scalar_one_or_none.return_value = scalar_one_or_none
    result.scalars.return_value.all.return_value = all_ or []
    session.execute.return_value = result
    return session


@pytest.mark.asyncio
async def test_get_cards_returns_the_callers_cards() -> None:
    card = _card()
    session = _session(all_=[card])

    cards = await get_cards(session=session, user=_user())

    assert cards == [card]


@pytest.mark.asyncio
async def test_get_card_returns_an_accessible_card() -> None:
    card = _card()
    session = _session(scalar_one_or_none=card)

    assert await get_card(10, session=session, user=_user()) is card


@pytest.mark.asyncio
async def test_get_card_hides_a_card_of_someone_else() -> None:
    session = _session(scalar_one_or_none=None)

    with pytest.raises(HTTPException) as exc_info:
        await get_card(10, session=session, user=_user())

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_create_card_belongs_to_the_caller() -> None:
    session = _session()
    body = CardCreateSchema(code="123", code_type="ean13", name="Shop")

    card = await create_card(body, session=session, user=_user())

    assert card.user_id == 1
    assert card.name == "Shop"
    session.add.assert_called_once()
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_card_applies_the_payload() -> None:
    card = _card()
    session = _session(scalar_one_or_none=card)
    body = CardUpdateSchema(code="999", code_type="ean13", name="Renamed")

    result = await update_card(10, body, session=session, user=_user())

    assert result.name == "Renamed"
    assert result.code == "999"
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_card_refuses_a_card_of_someone_else() -> None:
    session = _session(scalar_one_or_none=None)
    body = CardUpdateSchema(code="999", code_type="ean13", name="Renamed")

    with pytest.raises(HTTPException) as exc_info:
        await update_card(10, body, session=session, user=_user())

    assert exc_info.value.status_code == 404
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_patch_card_only_touches_what_was_sent() -> None:
    card = _card(name="Shop", code="0123456789012")
    session = _session(scalar_one_or_none=card)

    result = await patch_card(
        10, CardPatchSchema(name="Renamed"), session=session, user=_user()
    )

    assert result.name == "Renamed"
    assert result.code == "0123456789012"


@pytest.mark.asyncio
async def test_delete_card_drops_the_logo_after_the_row() -> None:
    card = _card(logo_file="abc.webp")
    session = _session(scalar_one_or_none=card)

    with patch("backend.api.card_api.delete_logo") as delete_logo_mock:
        await delete_card(10, session=session, user=_user())

    session.delete.assert_awaited_once_with(card)
    delete_logo_mock.assert_called_once_with("abc.webp")


@pytest.mark.asyncio
async def test_delete_card_refuses_a_card_of_someone_else() -> None:
    session = _session(scalar_one_or_none=None)

    with pytest.raises(HTTPException) as exc_info:
        await delete_card(10, session=session, user=_user())

    assert exc_info.value.status_code == 404
    session.delete.assert_not_awaited()


@pytest.mark.asyncio
async def test_upload_logo_refuses_an_oversized_file() -> None:
    card = _card()
    session = _session(scalar_one_or_none=card)
    upload = MagicMock(spec=UploadFile)
    upload.read = AsyncMock(side_effect=[b"x" * (3 * 1024 * 1024), b""])

    with pytest.raises(HTTPException) as exc_info:
        await upload_card_logo(10, upload, session=session, user=_user())

    assert exc_info.value.status_code == 413


@pytest.mark.asyncio
async def test_upload_logo_stores_the_returned_name() -> None:
    card = _card(logo_file="old.webp")
    session = _session(scalar_one_or_none=card)
    upload = MagicMock(spec=UploadFile)
    upload.read = AsyncMock(side_effect=[b"bytes", b""])

    with (
        patch("backend.api.card_api.save_logo", return_value="new.webp"),
        patch("backend.api.card_api.delete_logo") as delete_logo_mock,
    ):
        result = await upload_card_logo(10, upload, session=session, user=_user())

    assert result.logo_file == "new.webp"
    # The previous image only goes once the new name is committed.
    delete_logo_mock.assert_called_once_with("old.webp")


@pytest.mark.asyncio
async def test_get_card_logo_404_without_a_logo() -> None:
    session = _session(scalar_one_or_none=_card(logo_file=None))

    with pytest.raises(HTTPException) as exc_info:
        await get_card_logo(10, session=session, user=_user())

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_card_logo_clears_the_reference() -> None:
    card = _card(logo_file="abc.webp")
    session = _session(scalar_one_or_none=card)

    with patch("backend.api.card_api.delete_logo") as delete_logo_mock:
        result = await delete_card_logo(10, session=session, user=_user())

    assert result.logo_file is None
    delete_logo_mock.assert_called_once_with("abc.webp")
