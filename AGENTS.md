# AGENTS.md — Guidelines for AI Agents

This guide is the source of general rules for AI agents in this repository. Package guides add rules on top of it and do not repeat it.

## 1. Language

- Think and plan in English.
- Reply to the user in the language the user is using.

## 2. Read before editing

Before proposing a plan or editing code, read every document below that applies to the task.

- Repo workflow, commits, checks, documentation style — [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- Backend — [backend/AGENTS.md](backend/AGENTS.md)
- Frontend — [frontend/AGENTS.md](frontend/AGENTS.md)
- Security — [docs/SECURITY.md](docs/SECURITY.md)
- Feature behavior — the matching file in `docs/` (`SHARED_CARDS.md` and the others)

When a change makes an existing document false, update that document in the same change. Do not add documentation for behavior the current text does not state. A non-obvious constraint stays in a code comment. Follow [Documentation](docs/CONTRIBUTING.md#documentation).

## 3. Architecture Overview

- **`backend/`** (FastAPI + SQLAlchemy 2.0 async + SQLite/PostgreSQL/MySQL):
  - `backend/app.py`: FastAPI entrypoint, `lifespan()` startup and shutdown.
  - `backend/config.py`: `Config.load()` reads env once.
  - `backend/dev.py`: local entry — Alembic `upgrade head`, then uvicorn with reload.
  - `backend/api/`: HTTP routers (`auth`, `user`, `two_factor`, `card`, `card_share`, `password_recovery`, `public`, `admin`).
  - `backend/core/`: Auth, user helpers, SMTP, two-factor (`auth_core`, `user_core`, `smtp_core`, `two_factor_core`, `secret_box`).
  - `backend/db/`: `BaseModel`, async engine, `get_async_session`, models, periodic `cleanup`.
  - `backend/schemas/`, `backend/enums/`, `backend/helpers/`: Pydantic models, enums, shared helpers.
  - `backend/alembic/`: database migrations.
  - `backend/test/`: API and core unit tests.
- **`frontend/`**: Angular PWA (loyalty/discount cards, scanner, sharing, admin).
- **`docs/`**: User and contributor documentation (multiple locales under `docs/*/README.md`).

## 4. Code principles

Apply a principle only when it makes this change simpler. Do not reshape the code just to satisfy it.

- **SOLID, KISS, DRY, YAGNI.** Follow the design already in the touched code. Prefer a clear, small change over a new abstraction, a copied variant, or behavior the task does not need.
- **Scope.** Make the smallest change that fully solves the problem. Do not refactor unrelated code. Keep the existing architecture unless there is a strong reason to change it.
- **Helpers.** Move a function into its own file or a shared helper only when more than one class or module uses it. Otherwise keep it as a private method of the class that needs it.
- **No leftovers.** Delete the old implementation, unused helpers, dead code, aliases, and re-exports. Keep a name only when a public contract must stay stable, such as an API field the frontend already reads.
- **Comments.** Only for non-obvious intent or constraints. Do not use deprecated APIs.

## 5. Tests

- Cover the important behavior of the change. A test must lock that behavior, not only call the code. Parameterize cases that differ by inputs and expected results instead of duplicating the test.
- A bug fix gets the smallest failing test first when that is practical.
- Do not add tests for trivial getters.
- How a package sets up its tests is in that package's guide.

## 6. Checks

After substantive edits, run the checks for the touched packages. Commit messages follow Conventional Commits (see [Commits](docs/CONTRIBUTING.md#commits)).

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

No AI attribution anywhere: commit messages, PR titles, and descriptions must not contain `Co-authored-by` trailers, `@cursor` or other agent mentions, or "Generated with …" lines, and an AI tool is never listed as an author. The agent is an assistant; the human author is responsible for the change.
