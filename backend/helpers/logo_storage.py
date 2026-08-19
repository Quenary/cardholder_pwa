"""Storage and sanitising of card logos.

Design notes
------------
Uploads are the classic attack surface of a web application, so the uploaded
bytes are never trusted and never served back as-is:

* the file is size-capped **before** being decoded, to rule out decompression
  bombs;
* it is decoded by Pillow, down-scaled and **re-encoded to WebP**. Re-encoding
  is what makes this safe: any script, EXIF payload or polyglot content in the
  original file is discarded, since only decoded pixels survive;
* the stored name is a random UUID, so nothing user-controlled ever reaches the
  filesystem and path traversal is impossible by construction;
* the served response carries an explicit content type and ``nosniff``.

The image is written to ``Config.LOGO_DIR``, which lives inside the same volume
as the database, so a single backup covers everything.
"""

import os
import uuid
from io import BytesIO

from PIL import Image, UnidentifiedImageError

from backend.config import Config

# Formats we are willing to decode. Anything else is rejected outright rather
# than handed to Pillow.
ALLOWED_INPUT_FORMATS = {"PNG", "JPEG", "WEBP", "GIF", "BMP"}

_OUTPUT_SUFFIX = ".webp"


class LogoError(ValueError):
    """Raised when an upload cannot be accepted."""


def _logo_dir() -> str:
    os.makedirs(Config.LOGO_DIR, exist_ok=True)
    return Config.LOGO_DIR


def save_logo(raw: bytes) -> str:
    """Validate, normalise and store an image. Returns the stored file name."""
    if not raw:
        raise LogoError("Empty file")
    if len(raw) > Config.LOGO_MAX_UPLOAD_BYTES:
        limit_kb = Config.LOGO_MAX_UPLOAD_BYTES // 1024
        raise LogoError(f"File is larger than {limit_kb} KB")

    try:
        source = Image.open(BytesIO(raw))
        source.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise LogoError("File is not a readable image") from exc

    if source.format not in ALLOWED_INPUT_FORMATS:
        raise LogoError(f"Unsupported image format: {source.format}")

    # Flatten to RGBA: keeps transparency for logos, drops animation frames
    # and any exotic mode that would complicate encoding.
    image = source.convert("RGBA")

    max_dim = Config.LOGO_MAX_DIMENSION
    if image.width > max_dim or image.height > max_dim:
        image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

    file_name = f"{uuid.uuid4().hex}{_OUTPUT_SUFFIX}"
    path = os.path.join(_logo_dir(), file_name)
    image.save(path, format="WEBP", quality=85, method=4)
    return file_name


def logo_path(file_name: str) -> str | None:
    """Absolute path of a stored logo, or None when it is missing.

    The name is re-validated even though it comes from our own database: it is
    the last line of defence should a row ever be tampered with.
    """
    if not file_name or "/" in file_name or "\\" in file_name or ".." in file_name:
        return None
    path = os.path.join(_logo_dir(), file_name)
    return path if os.path.isfile(path) else None


def delete_logo(file_name: str | None) -> None:
    """Remove a stored logo, ignoring the case where it is already gone."""
    if not file_name:
        return
    path = logo_path(file_name)
    if path:
        try:
            os.remove(path)
        except OSError:
            # A missing or unreadable file must not break the request: the
            # database reference is dropped either way.
            pass
