import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from backend.core.auth_core import is_user
from backend.db.models.card_model import CardModel
from backend.db.models.card_share_model import CardShareModel
from backend.db.models.user_model import UserModel
from backend.db.session import get_async_session
from backend.schemas.card_schema import CardSchema
from backend.schemas.card_share_schema import (
    ShareAllCardsRequestSchema,
    ShareCardRequestSchema,
    SharedCardItemSchema,
    SharedCardsResponseSchema,
    SharedWithMeItemSchema,
    ShareUserSchema,
    UpdateCardShareRequestSchema,
)

router = APIRouter(prefix="/cards/share", tags=["card-share"])
logger = logging.getLogger(__name__)


async def _get_cards_shared_by_user(
    session: AsyncSession, user_id: int
) -> list[SharedCardItemSchema]:
    stmt = (
        select(CardShareModel)
        .options(
            joinedload(CardShareModel.card),
            joinedload(CardShareModel.shared_with_user),
        )
        .where(CardShareModel.owner_id == user_id)
        .order_by(CardShareModel.created_at.desc())
    )
    res = await session.execute(stmt)
    shares = res.scalars().all()

    cards_map: dict[int, dict] = {}
    for share in shares:
        if not share.card:
            continue
        if share.card_id not in cards_map:
            cards_map[share.card_id] = {
                "card": share.card,
                "shared_with_users": [],
            }
        if share.shared_with_user:
            cards_map[share.card_id]["shared_with_users"].append(
                ShareUserSchema(
                    id=share.shared_with_user.id,
                    username=share.shared_with_user.username,
                )
            )

    return [
        SharedCardItemSchema(
            card=CardSchema.model_validate(item["card"]),
            shared_with_users=item["shared_with_users"],
        )
        for item in cards_map.values()
    ]


async def _get_cards_shared_with_user(
    session: AsyncSession, user_id: int
) -> list[SharedWithMeItemSchema]:
    stmt = (
        select(CardShareModel)
        .options(
            joinedload(CardShareModel.card),
            joinedload(CardShareModel.owner),
        )
        .where(CardShareModel.shared_with_user_id == user_id)
        .order_by(CardShareModel.created_at.desc())
    )
    result = await session.execute(stmt)
    shares = result.scalars().all()
    return [
        SharedWithMeItemSchema(
            card=CardSchema.model_validate(s.card),
            owner=ShareUserSchema(id=s.owner.id, username=s.owner.username),
        )
        for s in shares
        if s.card and s.owner
    ]


@router.get("", response_model=SharedCardsResponseSchema)
async def get_shared_cards(
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Retrieve cards shared by the caller and cards shared with the caller."""
    you_share = await _get_cards_shared_by_user(session, user.id)
    shared_with_you = await _get_cards_shared_with_user(session, user.id)
    return SharedCardsResponseSchema(
        you_share=you_share,
        shared_with_you=shared_with_you,
    )


@router.get("/users", response_model=list[ShareUserSchema])
async def get_available_users(
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Retrieve other active users for sharing cards."""
    stmt = (
        select(UserModel)
        .where(UserModel.id != user.id)
        .order_by(UserModel.username.asc())
    )
    result = await session.execute(stmt)
    users = result.scalars().all()
    return [ShareUserSchema(id=u.id, username=u.username) for u in users]


@router.get("/with-me", response_model=list[SharedWithMeItemSchema])
async def get_cards_shared_with_me(
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Retrieve only the cards shared with the caller (for the main cards view)."""
    return await _get_cards_shared_with_user(session, user.id)


@router.post("", response_model=SharedCardItemSchema, status_code=201)
async def share_card(
    body: ShareCardRequestSchema,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Share a single card with selected users (replaces previous shares for this card)."""
    stmt = (
        select(CardModel)
        .where(CardModel.id == body.card_id, CardModel.user_id == user.id)
        .limit(1)
    )
    result = await session.execute(stmt)
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    target_user_ids = [uid for uid in set(body.user_ids) if uid != user.id]

    await session.execute(
        delete(CardShareModel).where(
            CardShareModel.card_id == card.id,
            CardShareModel.owner_id == user.id,
        )
    )

    shared_users: list[ShareUserSchema] = []
    if target_user_ids:
        users_stmt = select(UserModel).where(UserModel.id.in_(target_user_ids))
        users_res = await session.execute(users_stmt)
        valid_users = users_res.scalars().all()
        for u in valid_users:
            session.add(
                CardShareModel(
                    card_id=card.id,
                    owner_id=user.id,
                    shared_with_user_id=u.id,
                )
            )
            shared_users.append(ShareUserSchema(id=u.id, username=u.username))

    await session.commit()
    await session.refresh(card)
    return SharedCardItemSchema(
        card=CardSchema.model_validate(card), shared_with_users=shared_users
    )


@router.put("/{card_id}", response_model=SharedCardItemSchema)
async def update_card_share(
    card_id: int,
    body: UpdateCardShareRequestSchema,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Update user shares for a specific card."""
    stmt = (
        select(CardModel)
        .where(CardModel.id == card_id, CardModel.user_id == user.id)
        .limit(1)
    )
    result = await session.execute(stmt)
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    target_user_ids = [uid for uid in set(body.user_ids) if uid != user.id]

    await session.execute(
        delete(CardShareModel).where(
            CardShareModel.card_id == card.id,
            CardShareModel.owner_id == user.id,
        )
    )

    shared_users: list[ShareUserSchema] = []
    if target_user_ids:
        users_stmt = select(UserModel).where(UserModel.id.in_(target_user_ids))
        users_res = await session.execute(users_stmt)
        valid_users = users_res.scalars().all()
        for u in valid_users:
            session.add(
                CardShareModel(
                    card_id=card.id,
                    owner_id=user.id,
                    shared_with_user_id=u.id,
                )
            )
            shared_users.append(ShareUserSchema(id=u.id, username=u.username))

    await session.commit()
    await session.refresh(card)
    return SharedCardItemSchema(
        card=CardSchema.model_validate(card), shared_with_users=shared_users
    )


@router.post("/all")
async def share_all_cards(
    body: ShareAllCardsRequestSchema,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Share all user cards with selected users (completely overwrites existing shares)."""
    # Delete all previous shares created by this user
    await session.execute(
        delete(CardShareModel).where(CardShareModel.owner_id == user.id)
    )

    target_user_ids = [uid for uid in set(body.user_ids) if uid != user.id]
    if target_user_ids:
        cards_stmt = select(CardModel.id).where(CardModel.user_id == user.id)
        cards_res = await session.execute(cards_stmt)
        card_ids = cards_res.scalars().all()

        users_stmt = select(UserModel.id).where(UserModel.id.in_(target_user_ids))
        users_res = await session.execute(users_stmt)
        valid_uids = users_res.scalars().all()

        for cid in card_ids:
            for uid in valid_uids:
                session.add(
                    CardShareModel(
                        card_id=cid,
                        owner_id=user.id,
                        shared_with_user_id=uid,
                    )
                )

    await session.commit()
    return {"detail": "All cards shared successfully"}


@router.delete("/with-me/{card_id}")
async def delete_card_shared_with_me(
    card_id: int,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Remove a card share for the current user (stop receiving this shared card)."""
    stmt = (
        select(CardShareModel)
        .where(
            CardShareModel.card_id == card_id,
            CardShareModel.shared_with_user_id == user.id,
        )
        .limit(1)
    )
    result = await session.execute(stmt)
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Card share not found")
    await session.delete(share)
    await session.commit()
    return {"detail": "Shared card removed successfully"}


@router.delete("/{card_id}")
async def delete_card_share(
    card_id: int,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Delete all shares for a specific card owned by the caller."""
    stmt = select(CardShareModel).where(
        CardShareModel.card_id == card_id,
        CardShareModel.owner_id == user.id,
    )
    result = await session.execute(stmt)
    shares = result.scalars().all()
    if not shares:
        raise HTTPException(status_code=404, detail="Card share not found")
    for share in shares:
        await session.delete(share)
    await session.commit()
    return {"detail": "Card shares deleted successfully"}
