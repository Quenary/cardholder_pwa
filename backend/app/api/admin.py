from fastapi import APIRouter, Depends, HTTPException
import app.schemas as schemas, app.enums as enums
from app.db import models
from app.core import auth
from sqlalchemy.orm import Session
from app.db import get_db
from app.core.user import delete_user

router = APIRouter(tags=["admin"], prefix="/admin")


@router.get("/users", response_model=list[schemas.User])
def get_users_list(
    db: Session = Depends(get_db), admin: models.User = Depends(auth.is_user_admin)
):
    return db.query(models.User).all()


@router.delete("/users/{user_id}")
def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.is_user_admin),
):
    if user_id == admin.id:
        raise HTTPException(
            403, "Admin cannot delete his own account with this function."
        )

    user = db.query(models.User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    return delete_user(db, user)


@router.get("/settings", response_model=schemas.GetSettingsRequest)
def get_system_settings(
    db: Session = Depends(get_db), admin: models.User = Depends(auth.is_user_admin)
):
    settings = db.query(models.Setting).all()
    result = []
    for s in settings:
        val = s.value
        try:
            if s.value_type == enums.ESettingType.BOOL:
                val = val.lower() == "true"
            elif s.value_type == enums.ESettingType.FLOAT:
                val = float(val)
            elif s.value_type == enums.ESettingType.INT:
                val = int(val)
        except Exception:
            pass

        result.append(
            {
                "key": s.key,
                "value": val,
                "value_type": s.value_type,
                "updated_at": s.updated_at.isoformat(),
            }
        )

    return result


@router.patch("/settings")
def change_system_settings(
    request: list[schemas.PatchSettingsRequestItem],
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.is_user_admin),
):
    for s in request:
        setting = db.query(models.Setting).filter_by(key=s.key).first()
        if not setting:
            raise HTTPException(status_code=404, detail=f"Setting '{s.key}' not found")
        if setting.value_type != type(s.value).__name__:
            raise HTTPException(
                400, f"Invalid type of '{s.key}', expected '{setting.value_type}'"
            )

        setting.value = str(s.value)

    db.commit()
    return {"status": "updated", "count": len(request)}
