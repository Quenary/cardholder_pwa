from fastapi import APIRouter, Depends
from app.schemas import Version
import tomllib
import os
from app.core.smtp import EmailSender
import app.core.auth as auth

router = APIRouter(tags=["system"], prefix="/system")


# rename to system, add token verification, add smtp status request
@router.get("/version", response_model=Version)
def get_version():
    image_version = os.getenv("VERSION") or None
    toml_path = os.path.join(os.path.dirname(__file__), "..", "..", "pyproject.toml")
    with open(toml_path, "rb") as f:
        toml_data = tomllib.load(f)
        app_version = toml_data["project"]["version"]
    return {"app_version": app_version, "image_version": image_version}


@router.get("/smtp/status", response_model=bool)
def get_smtp_status():
    return EmailSender.status()


@router.post("/smtp/test")
def send_test_email(current_user=Depends(auth.get_current_user)):
    EmailSender.send_email(
        current_user.email,
        "Test email from Cardholder PWA",
        "This is body of the test email.\nGood day!\n",
    )
