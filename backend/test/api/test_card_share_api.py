from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.card_share_api import (
    delete_card_share,
    get_available_users,
    share_card,
)
from backend.db.models.card_share_model import CardShareModel
from backend.db.models.user_model import UserModel
from backend.schemas.card_share_schema import ShareCardRequestSchema


@pytest.mark.asyncio
async def test_get_available_users():
    current_user = UserModel(id=1, username="alice")
    other_user = UserModel(id=2, username="bob")

    session_mock = AsyncMock(spec=AsyncSession)
    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = [other_user]
    session_mock.execute.return_value = result_mock
    session_mock.scalar.return_value = 1

    page = await get_available_users(session=session_mock, user=current_user)
    assert len(page.items) == 1
    assert page.items[0].id == 2
    assert page.items[0].username == "bob"
    assert page.total == 1
    assert page.offset == 0


@pytest.mark.asyncio
async def test_get_available_users_reports_the_asked_page():
    current_user = UserModel(id=1, username="alice")

    session_mock = AsyncMock(spec=AsyncSession)
    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = []
    session_mock.execute.return_value = result_mock
    session_mock.scalar.return_value = 120

    page = await get_available_users(
        limit=25, offset=100, session=session_mock, user=current_user
    )
    assert page.items == []
    assert page.total == 120
    assert page.limit == 25
    assert page.offset == 100


@pytest.mark.asyncio
async def test_share_card_not_found():
    current_user = UserModel(id=1, username="alice")
    session_mock = AsyncMock(spec=AsyncSession)
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    session_mock.execute.return_value = result_mock

    req = ShareCardRequestSchema(card_id=99, user_ids=[2])
    with pytest.raises(HTTPException) as exc_info:
        await share_card(body=req, session=session_mock, user=current_user)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_card_share_success():
    current_user = UserModel(id=1, username="alice")
    session_mock = AsyncMock(spec=AsyncSession)
    res_mock = MagicMock()
    share1 = CardShareModel(id=1, card_id=10, owner_id=1, shared_with_user_id=2)
    res_mock.scalars.return_value.all.return_value = [share1]
    session_mock.execute.return_value = res_mock

    res = await delete_card_share(card_id=10, session=session_mock, user=current_user)
    assert res["detail"] == "Card shares deleted successfully"
    session_mock.delete.assert_awaited_once_with(share1)
    session_mock.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_card_share_not_found():
    current_user = UserModel(id=1, username="alice")
    session_mock = AsyncMock(spec=AsyncSession)
    res_mock = MagicMock()
    res_mock.scalars.return_value.all.return_value = []
    session_mock.execute.return_value = res_mock

    with pytest.raises(HTTPException) as exc:
        await delete_card_share(card_id=999, session=session_mock, user=current_user)
    assert exc.value.status_code == 404
