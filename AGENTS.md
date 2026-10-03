# AGENTS.md — Guidelines for AI Agents

For general contributing workflow and commit standards, see [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md). Package guides: [backend/AGENTS.md](backend/AGENTS.md), [frontend/AGENTS.md](frontend/AGENTS.md).

## 1. Architecture Overview

- **`backend/`** (FastAPI + SQLAlchemy 2.0 async + SQLite/PostgreSQL/MySQL):
  - `backend/app.py`: FastAPI entrypoint, `lifespan()` startup and shutdown.
  - `backend/config.py`: `Config.load()` reads env once.
  - `backend/dev.py`: local entry — Alembic `upgrade head`, then uvicorn with reload.
  - `backend/api/`: HTTP routers (`auth`, `user`, `card`, `card_share`, `password_recovery`, `public`, `admin`).
  - `backend/core/`: Auth, user helpers, SMTP (`auth_core`, `user_core`, `smtp_core`).
  - `backend/db/`: `BaseModel`, async engine, `get_async_session`, models, periodic `cleanup`.
  - `backend/schemas/`, `backend/enums/`, `backend/helpers/`: Pydantic models, enums, shared helpers.
  - `backend/alembic/`: database migrations.
  - `backend/test/`: API and core unit tests.
- **`frontend/`**: Angular PWA (loyalty/discount cards, scanner, sharing, admin).
- **`docs/`**: User and contributor documentation (multiple locales under `docs/*/README.md`).

## 2. Dev & Validation Commands

### Local Dev

```bash
python -m backend.dev
npm --prefix frontend run start
```

VS Code default build task (`Ctrl+Shift+B`) runs backend then frontend (see `.vscode/tasks.json`).

### Pre-commit Quality Checks

```bash
# Python lint & format
uv run ruff check backend
uv run ruff format backend

# Python type checking
uv run mypy backend

# Python unit tests
python -m pytest
# Single test file:
python -m pytest backend/test/api/test_card_api.py

# Frontend checks (from repo root)
npm --prefix frontend run lint
npm --prefix frontend run prettier:check
npm --prefix frontend run test:ci
```

Python deps: `uv sync --locked` from the repo root. Frontend deps: `npm ci` in `frontend/`.
