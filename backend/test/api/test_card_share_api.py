from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.card_share_api import (
    delete_card_share,
    delete_card_shared_with_me,
    get_available_users,
    get_cards_shared_with_me,
    get_shared_cards,
    share_all_cards,
    share_card,
    update_card_share,
)
from backend.db.models.card_model import CardModel
from backend.db.models.card_share_model import CardShareModel
from backend.db.models.user_model import UserModel
from backend.schemas.card_share_schema import (
    ShareAllCardsRequestSchema,
    ShareCardRequestSchema,
    UpdateCardShareRequestSchema,
)


@pytest.mark.asyncio
async def test_get_available_users():
    current_user = UserModel(id=1, username="alice")
    other_user = UserModel(id=2, username="bob")

    session_mock = AsyncMock(spec=AsyncSession)
    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = [other_user]
    session_mock.execute.return_value = result_mock

    users = await get_available_users(session=session_mock, user=current_user)
    assert len(users) == 1
    assert users[0].id == 2
    assert users[0].username == "bob"


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
async def test_share_card_success():
    current_user = UserModel(id=1, username="alice")
    card = CardModel(
        id=10,
        code="12345",
        code_type="ean13",
        name="Test Card",
        user_id=1,
        created_at=MagicMock(),
        updated_at=MagicMock(),
    )
    user2 = UserModel(id=2, username="bob")

    session_mock = AsyncMock(spec=AsyncSession)

    card_res = MagicMock()
    card_res.scalar_one_or_none.return_value = card

    users_res = MagicMock()
    users_res.scalars.return_value.all.return_value = [user2]

    session_mock.execute.side_effect = [card_res, MagicMock(), users_res]

    req = ShareCardRequestSchema(
        card_id=10, user_ids=[2, 1]
    )  # 1 is self, should be ignored
    res = await share_card(body=req, session=session_mock, user=current_user)

    assert res.card.id == 10
    assert len(res.shared_with_users) == 1
    assert res.shared_with_users[0].id == 2
    assert session_mock.add.called
    assert session_mock.commit.called


@pytest.mark.asyncio
async def test_update_card_share_success():
    current_user = UserModel(id=1, username="alice")
    card = CardModel(
        id=10,
        code="12345",
        code_type="ean13",
        name="Test Card",
        user_id=1,
        created_at=MagicMock(),
        updated_at=MagicMock(),
    )
    user3 = UserModel(id=3, username="charlie")

    session_mock = AsyncMock(spec=AsyncSession)

    card_res = MagicMock()
    card_res.scalar_one_or_none.return_value = card

    users_res = MagicMock()
    users_res.scalars.return_value.all.return_value = [user3]

    session_mock.execute.side_effect = [card_res, MagicMock(), users_res]

    req = UpdateCardShareRequestSchema(user_ids=[3])
    res = await update_card_share(
        card_id=10, body=req, session=session_mock, user=current_user
    )

    assert res.card.id == 10
    assert len(res.shared_with_users) == 1
    assert res.shared_with_users[0].id == 3
    assert session_mock.commit.called


@pytest.mark.asyncio
async def test_share_all_cards():
    current_user = UserModel(id=1, username="alice")
    session_mock = AsyncMock(spec=AsyncSession)

    del_res = MagicMock()
    cards_res = MagicMock()
    cards_res.scalars.return_value.all.return_value = [10, 11]

    users_res = MagicMock()
    users_res.scalars.return_value.all.return_value = [2]

    session_mock.execute.side_effect = [del_res, cards_res, users_res]

    req = ShareAllCardsRequestSchema(user_ids=[2])
    res = await share_all_cards(body=req, session=session_mock, user=current_user)

    assert res["detail"] == "All cards shared successfully"
    assert session_mock.add.call_count == 2
    assert session_mock.commit.called


@pytest.mark.asyncio
async def test_get_shared_cards():
    current_user = UserModel(id=1, username="alice")
    card = CardModel(
        id=10,
        code="12345",
        code_type="ean13",
        name="Card 1",
        user_id=1,
        created_at=MagicMock(),
        updated_at=MagicMock(),
    )
    user2 = UserModel(id=2, username="bob")
    share = CardShareModel(
        id=1,
        card_id=10,
        owner_id=1,
        shared_with_user_id=2,
    )
    share.card = card
    share.shared_with_user = user2

    session_mock = AsyncMock(spec=AsyncSession)

    res_you_share = MagicMock()
    res_you_share.scalars.return_value.all.return_value = [share]

    res_with_me = MagicMock()
    res_with_me.scalars.return_value.all.return_value = []

    session_mock.execute.side_effect = [res_you_share, res_with_me]

    res = await get_shared_cards(session=session_mock, user=current_user)
    assert len(res.you_share) == 1
    assert res.you_share[0].card.name == "Card 1"
    assert res.you_share[0].shared_with_users[0].username == "bob"
    assert len(res.shared_with_you) == 0


@pytest.mark.asyncio
async def test_get_cards_shared_with_me():
    current_user = UserModel(id=2, username="bob")
    card = CardModel(
        id=10,
        code="12345",
        code_type="ean13",
        name="Card 1",
        user_id=1,
        created_at=MagicMock(),
        updated_at=MagicMock(),
    )
    owner = UserModel(id=1, username="alice")
    share = CardShareModel(
        id=1,
        card_id=10,
        owner_id=1,
        shared_with_user_id=2,
    )
    share.card = card
    share.owner = owner

    session_mock = AsyncMock(spec=AsyncSession)
    res_mock = MagicMock()
    res_mock.scalars.return_value.all.return_value = [share]
    session_mock.execute.return_value = res_mock

    res = await get_cards_shared_with_me(session=session_mock, user=current_user)
    assert len(res) == 1
    assert res[0].card.id == 10
    assert res[0].owner.username == "alice"


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


@pytest.mark.asyncio
async def test_delete_card_shared_with_me_success():
    current_user = UserModel(id=2, username="bob")
    session_mock = AsyncMock(spec=AsyncSession)
    res_mock = MagicMock()
    share1 = CardShareModel(id=1, card_id=10, owner_id=1, shared_with_user_id=2)
    res_mock.scalar_one_or_none.return_value = share1
    session_mock.execute.return_value = res_mock

    res = await delete_card_shared_with_me(
        card_id=10, session=session_mock, user=current_user
    )
    assert res["detail"] == "Shared card removed successfully"
    session_mock.delete.assert_awaited_once_with(share1)
    session_mock.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_card_shared_with_me_not_found():
    current_user = UserModel(id=2, username="bob")
    session_mock = AsyncMock(spec=AsyncSession)
    res_mock = MagicMock()
    res_mock.scalar_one_or_none.return_value = None
    session_mock.execute.return_value = res_mock

    with pytest.raises(HTTPException) as exc:
        await delete_card_shared_with_me(
            card_id=999, session=session_mock, user=current_user
        )
    assert exc.value.status_code == 404
