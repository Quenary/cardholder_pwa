# AGENTS.md — Backend

FastAPI app for the Cardholder PWA API (users, cards, sharing, settings, password recovery). Python `>=3.13`.

Repo workflow and commits: [docs/CONTRIBUTING.md](../docs/CONTRIBUTING.md). How to run the app: [README.md](README.md).

## Layout

- `app.py` — FastAPI app (`root_path` from `Config.API_PATH`, default `/api`), router includes, `lifespan()`, validation error logging.
- `config.py` — `Config.load()` reads env once (JWT, DB, SMTP, logos, cleanup interval).
- `dev.py` — local entry: Alembic `upgrade head`, then uvicorn with reload.
- `start.py` — production-style entry (used in Docker).
- `db/` — `BaseModel`, async engine, `get_async_session`, `cleanup` loop, SQLAlchemy models under `db/models/`.
- `api/` — one `*_api.py` per area with an `APIRouter` (`auth`, `user`, `card`, `card_share`, `password_recovery`, `public`, `admin`).
- `core/` — `auth_core` (JWT, bcrypt, role dependencies), `user_core`, `smtp_core`.
- `schemas/` — Pydantic request/response models; `validators.py` for shared validation.
- `enums/`, `helpers/` — shared enums and helpers (e.g. logo storage, typed settings).
- `alembic/` — migrations. `env.py` uses `BaseModel.metadata`; model modules are imported via `db/models/__init__.py` for autogenerate.

## Startup

`lifespan` starts a background `cleanup()` task that periodically deletes expired refresh tokens and password-recovery codes. On shutdown the task is cancelled.

`python -m backend.dev` runs migrations then serves the app on port 8000 with reload.

## Request path

Routers are `APIRouter`s; some set a `prefix` (e.g. `/admin`). Handlers take `AsyncSession` from `get_async_session` and the current user from `Depends(is_user)` or role-specific dependencies (`is_user_admin`, `is_user_owner`).

Typical split:

- `api/*_api.py` — routes and HTTP status codes.
- `schemas/*_schema.py` — Pydantic models.
- `db/models/*_model.py` — SQLAlchemy rows (`Mapped`, `mapped_column` on `BaseModel`).
- `core/*_core.py` — auth, mail, and user lifecycle reused by routers.

Convert a row with `Schema.model_validate(row)` or return ORM objects where `response_model` allows it.

## Database

`get_async_session` is the request-scoped session. Background `cleanup` opens `_async_session_maker()` itself.

`Config.DB_URL` may be `sqlite:`, `postgresql+psycopg2:`, or `mysql` / `mysql+pymysql:`. `db/session.py` rewrites those to async drivers (`aiosqlite`, `asyncpg`, `asyncmy`).

A model change needs an Alembic revision:

```bash
python -m alembic -c backend/alembic.ini revision --autogenerate -m "comment"
```

Ensure new models are imported in `db/models/__init__.py` so metadata and autogenerate see them.

Domain data: users and roles, loyalty cards (code + type + optional logo file), card shares, system settings, refresh tokens, password-recovery codes. Card logos are stored on disk (`Config.LOGO_DIR`), not in the DB blob.

## Auth and roles

JWT access tokens (`python-jose`) and refresh tokens in the DB. `OAuth2PasswordBearer` on protected routes. First registered user becomes **owner**; **admin** and **member** roles gate admin UI and destructive actions.

`public_api` exposes version and public settings without auth where appropriate. Password recovery emails require SMTP configuration (`smtp_core`).

## Tests

Tests live under `backend/test/` as `test_*.py`, grouped by `api/`, `core/`, `db/`, `schemas/`, `helpers/`. Async tests use `@pytest.mark.asyncio`. Patch with `pytest-mock` (`mocker.patch`) and `AsyncMock`.

Router tests often call handler functions directly with mocked sessions, or use `TestClient(app)` with `app.dependency_overrides` for `get_async_session` and `is_user`.

Run from the repo root: `python -m pytest` or `uv run pytest`, optionally with a path such as `backend/test/api/test_card_api.py`.

- Local helpers and factories stay in the test file or a nearby module; keep duplication low with parametrize.
- Do not add tests for trivial getters.
- Match ruff and mypy.

## Style

Ruff and mypy are configured in the repo root `pyproject.toml` (Ruff selects E, F, I, B, UP; mypy allows missing imports and unset optionals). Match the surrounding file.

- Prefer `list[str]`, `str | None`, and `Final` over legacy `typing` aliases the codebase has already dropped.
- Log with `logging`; use the module `__name__` logger. Do not add `print` outside `dev.py` / migration tooling.
- Keep a change inside one area and its tests. A new SQLAlchemy model still needs the `db/models/__init__.py` import and a migration.
