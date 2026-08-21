from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from backend.config import Config
from backend.core.auth_core import is_user
from backend.db.models.card_model import CardModel
from backend.db.models.user_model import UserModel
from backend.db.session import get_async_session
from backend.helpers.logo_storage import (
    LogoError,
    delete_logo,
    logo_path,
    save_logo,
)
from backend.schemas.card_schema import (
    CardCreateSchema,
    CardPatchSchema,
    CardSchema,
    CardUpdateSchema,
)

router = APIRouter(tags=["card"])


@router.get("/cards", response_model=list[CardSchema])
async def get_cards(
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    stmt = select(CardModel).where(CardModel.user_id == user.id)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/cards/{card_id}", response_model=CardSchema)
async def get_card(
    card_id: int,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    stmt = (
        select(CardModel)
        .where(CardModel.id == card_id, CardModel.user_id == user.id)
        .limit(1)
    )
    result = await session.execute(stmt)
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@router.post("/cards", response_model=CardSchema, status_code=201)
async def create_card(
    card: CardCreateSchema,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    new_card = CardModel(**card.model_dump(), user_id=user.id)
    session.add(new_card)
    await session.commit()
    await session.refresh(new_card)
    return new_card


@router.put("/cards/{card_id}", response_model=CardSchema)
async def update_card(
    card_id: int,
    updated: CardUpdateSchema,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    stmt = (
        select(CardModel)
        .where(CardModel.id == card_id, CardModel.user_id == user.id)
        .limit(1)
    )
    result = await session.execute(stmt)
    card = result.scalar_one_or_none()

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    for key, value in updated.model_dump(exclude_unset=True).items():
        if getattr(card, key) != value:
            setattr(card, key, value)
    await session.commit()
    await session.refresh(card)
    return card


@router.delete("/cards/{card_id}")
async def delete_card(
    card_id: int,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    stmt = (
        select(CardModel)
        .where(CardModel.id == card_id, CardModel.user_id == user.id)
        .limit(1)
    )
    result = await session.execute(stmt)
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    orphan_logo = card.logo_file
    await session.delete(card)
    await session.commit()
    # Drop the image only once the row is gone, to avoid losing a file
    # if the transaction fails.
    delete_logo(orphan_logo)
    return {"detail": "Card deleted"}


@router.patch("/cards/{card_id}")
async def patch_card(
    card_id: int,
    body: CardPatchSchema,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    stmt = (
        select(CardModel)
        .where(CardModel.id == card_id, CardModel.user_id == user.id)
        .limit(1)
    )
    result = await session.execute(stmt)
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        if getattr(card, key) != value:
            setattr(card, key, value)
    await session.commit()
    await session.refresh(card)
    return card


async def _get_own_card(
    card_id: int, session: AsyncSession, user: UserModel
) -> CardModel:
    """Fetch a card belonging to the caller, or raise 404.

    Returning 404 (rather than 403) for someone else's card avoids confirming
    that the id exists at all.
    """
    stmt = (
        select(CardModel)
        .where(CardModel.id == card_id, CardModel.user_id == user.id)
        .limit(1)
    )
    result = await session.execute(stmt)
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


async def _read_capped(file: UploadFile) -> bytes:
    """Read an upload, giving up as soon as it exceeds the allowed size.

    Reading in chunks matters: a plain ``await file.read()`` would pull a body
    of any size into memory before the limit could reject it.
    """
    limit = Config.LOGO_MAX_UPLOAD_BYTES
    chunks: list[bytes] = []
    total = 0
    while chunk := await file.read(64 * 1024):
        total += len(chunk)
        if total > limit:
            raise HTTPException(
                status_code=413,
                detail=f"File is larger than {limit // 1024} KB",
            )
        chunks.append(chunk)
    return b"".join(chunks)


@router.post("/cards/{card_id}/logo", response_model=CardSchema)
async def upload_card_logo(
    card_id: int,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Attach a logo to a card.

    The image is re-encoded to WebP before storage, so the bytes that end up on
    disk are generated by us and never the uploaded file itself.
    """
    card = await _get_own_card(card_id, session, user)
    raw = await _read_capped(file)
    try:
        # Decoding and re-encoding are CPU-bound: kept off the event loop so a
        # slow image cannot stall every other request being served.
        file_name = await run_in_threadpool(save_logo, raw)
    except LogoError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    previous = card.logo_file
    card.logo_file = file_name
    await session.commit()
    await session.refresh(card)
    # Only drop the old file once the new reference is safely committed.
    delete_logo(previous)
    return card


@router.get("/cards/{card_id}/logo")
async def get_card_logo(
    card_id: int,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Serve the logo of a card owned by the caller."""
    card = await _get_own_card(card_id, session, user)
    path = logo_path(card.logo_file) if card.logo_file else None
    if not path:
        raise HTTPException(status_code=404, detail="Card has no logo")
    return FileResponse(
        path,
        media_type="image/webp",
        headers={
            # The URL of a logo does not change when the image behind it does,
            # so a max-age would keep serving the previous picture after a
            # replacement. no-cache still allows a revalidated 304 via the
            # ETag FileResponse already sends.
            "Cache-Control": "private, no-cache",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete("/cards/{card_id}/logo", response_model=CardSchema)
async def delete_card_logo(
    card_id: int,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Remove the logo of a card."""
    card = await _get_own_card(card_id, session, user)
    previous = card.logo_file
    card.logo_file = None
    await session.commit()
    await session.refresh(card)
    delete_logo(previous)
    return card
