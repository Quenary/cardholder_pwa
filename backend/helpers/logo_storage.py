"""Storage and sanitising of card logos.

Design notes
------------
Uploads are the classic attack surface of a web application, so the uploaded
bytes are never trusted and never served back as-is:

* the file is size-capped before being decoded, and the decoded pixel count is
  capped too. The byte cap alone is not enough: a 2 MiB PNG can hold tens of
  megapixels, and converting that to RGBA would allocate hundreds of MB;
* SVG is accepted, because that is how brands publish their logos, but it is
  rasterised on the way in and never stored: an SVG is XML that can carry
  scripts, so keeping one would break the guarantee below;
* that rasterising happens in a **separate process under a timeout**. Render
  time bears no relation to file size: a 6 KB logo with a stray ``inline-size``
  style was measured taking minutes, which would otherwise pin a CPU and hang
  the whole app for every user;
* it is decoded by Pillow, down-scaled and **re-encoded to WebP**. Re-encoding
  is what makes this safe: any script, EXIF payload or polyglot content in the
  original file is discarded, since only decoded pixels survive;
* the stored name is a random UUID, so nothing user-controlled ever reaches the
  filesystem and path traversal is impossible by construction;
* the served response carries an explicit content type and ``nosniff``.

The image is written to ``Config.LOGO_DIR``, which lives inside the same volume
as the database, so a single backup covers everything.
"""

import multiprocessing
import os
import tempfile
import uuid
from io import BytesIO

from PIL import Image, UnidentifiedImageError
from PIL.Image import DecompressionBombError

from backend.config import Config

# Formats we are willing to decode. Anything else is rejected outright rather
# than handed to Pillow.
ALLOWED_INPUT_FORMATS = {"PNG", "JPEG", "WEBP", "GIF", "BMP"}

_OUTPUT_SUFFIX = ".webp"

# Upper bound on the decoded image, independent of the file size. Well above
# any real logo, far below what would exhaust memory: at 4 bytes per pixel in
# RGBA, 40 megapixels is about 160 MB.
MAX_IMAGE_PIXELS = 40_000_000


class LogoError(ValueError):
    """Raised when an upload cannot be accepted."""


def _looks_like_svg(raw: bytes) -> bool:
    """Detect SVG from the bytes rather than trusting the declared type."""
    head = raw[:1024].lstrip()
    return head.startswith(b"<?xml") or head.startswith(b"<svg") or b"<svg" in head


def _render_svg_to_file(raw: bytes, width: int, path: str) -> None:
    """Render in a child process, so a runaway render can simply be killed."""
    import cairosvg

    cairosvg.svg2png(bytestring=raw, output_width=width, write_to=path)


def _rasterise_svg(raw: bytes) -> bytes:
    """Render an SVG to PNG bytes.

    Vector files are the usual way brands publish logos, so refusing them is a
    real annoyance. They are rendered here and then go through exactly the same
    checks as any other upload, so nothing from the XML reaches storage.

    Two specific hazards are handled: entity declarations, which are the classic
    way to build an XML expansion bomb, are refused outright; and the output
    size is pinned so that a huge declared viewport cannot allocate an enormous
    surface. cairosvg does not fetch external references unless explicitly asked
    to, which is left at its default.
    """
    # Entity declarations are how XML expansion bombs are built, so they are
    # refused. Note this also rejects harmless namespace shorthands emitted by
    # older Illustrator exports, hence the actionable wording: the underlying
    # XML parser refuses them too, so there is nothing to gain by allowing them.
    if b"<!ENTITY" in raw:
        raise LogoError(
            "This SVG declares XML entities, which are not supported. "
            "Re-export it from your editor, or upload a PNG instead."
        )

    fd, path = tempfile.mkstemp(suffix=".png")
    os.close(fd)
    # "spawn" rather than fork: the parent is an async server holding a database
    # pool, and none of that should be inherited just to draw a picture.
    ctx = multiprocessing.get_context("spawn")
    proc = ctx.Process(
        target=_render_svg_to_file,
        args=(raw, Config.LOGO_MAX_DIMENSION, path),
        daemon=True,
    )
    try:
        proc.start()
        proc.join(Config.LOGO_SVG_TIMEOUT_SEC)
        if proc.is_alive():
            proc.terminate()
            proc.join(5)
            if proc.is_alive():
                proc.kill()
            raise LogoError(
                f"SVG took longer than {Config.LOGO_SVG_TIMEOUT_SEC}s to render"
            )
        if proc.exitcode != 0 or not os.path.getsize(path):
            raise LogoError("File is not a readable SVG image")
        with open(path, "rb") as handle:
            return handle.read()
    except LogoError:
        raise
    except OSError as exc:
        raise LogoError("File is not a readable SVG image") from exc
    finally:
        try:
            os.remove(path)
        except OSError:
            pass


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

    if _looks_like_svg(raw):
        raw = _rasterise_svg(raw)

    # Applied around decoding only, and restored afterwards, so the cap cannot
    # leak into other Pillow users in the same process.
    previous_limit = Image.MAX_IMAGE_PIXELS
    Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
    try:
        # formats= makes Pillow refuse anything outside the allow-list at open
        # time, instead of decoding first and checking the format afterwards.
        source = Image.open(BytesIO(raw), formats=sorted(ALLOWED_INPUT_FORMATS))
        source.load()
    except DecompressionBombError as exc:
        # Not an OSError, so it would escape the handler below and surface as a
        # 500 rather than a rejected upload.
        raise LogoError("Image has too many pixels") from exc
    except (UnidentifiedImageError, OSError) as exc:
        raise LogoError("File is not a readable image") from exc
    finally:
        Image.MAX_IMAGE_PIXELS = previous_limit

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
