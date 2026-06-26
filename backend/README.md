# Cardholder PWA Backend

This repository uses [uv package manager](https://docs.astral.sh/uv/getting-started/installation/#standalone-installer)

- Install uv
- Create venv with `uv venv`
- Activate venv with `source .venv/bin/activate` or `.venv/scripts/activate`
- Install all deps with `uv sync --locked`
- Install pre-commit hooks `pre-commit install`
- In the root of the workspace, create an .env file with at least these variables
    ```bash
    DB_URL=sqlite+aiosqlite:///./cardholder_pwa.db
    ```
- Run the app
  - Whole app with Ctrl + Shift + B (VS Code default task)
  - Backend with `python -m backend.dev`

### Tests, lint, typechecks

- `python -m pytest` or `python -m pytest -k "for_specific_test"`
- `uv run ruff check backend`
- `uv run mypy backend`

### Migrations

Do not forget to create new migrations on models change with `python -m alembic -c backend/alembic.ini revision --autogenerate -m "comment"`

### Useful things

- Clear python cache with `find . | grep -E "(/**pycache**$|\.pyc$|\.pyo$)" | xargs rm -rf`