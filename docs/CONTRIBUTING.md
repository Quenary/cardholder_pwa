# Contributing guidelines for Cardholder PWA

Contributions are welcome. Please follow these guidelines to keep the project consistent and maintainable.

## Development

Angular for the frontend, Python (FastAPI and SQLAlchemy) for the backend.

See [backend/README.md](/backend/README.md) and [frontend/README.md](/frontend/README.md) for local setup.

## Commits

- Use the [Conventional Commits](https://www.conventionalcommits.org/) format for all commit messages, e.g. `feat(backend): add password recovery`. Common types: feat, fix, docs, refactor, test, chore. Common scopes: backend, frontend, docs, ci
- Keep commits focused; avoid mixing unrelated changes
- Releases are cut from Conventional Commits on `main`, so the type and scope in the message matter

## Code Changes

- Follow the existing code style and structure
- Prefer clear, readable solutions
- Avoid introducing unnecessary dependencies
- Backend model changes need an Alembic revision (`python -m alembic -c backend/alembic.ini revision --autogenerate -m "comment"`). See [backend/README.md](/backend/README.md)
- If behavior changes, update [README.md](/README.md) (and [docs/ru/README.md](/docs/ru/README.md) when the user-facing docs change)

## Tests

- Add or extend tests for new and changed behavior
- Backend: `uv run pytest`, `uv run ruff check backend`, `uv run mypy backend`
- Frontend: `npm run test:ci`, `npm run lint`, `npm run prettier:check` (from `frontend/`)
- Ensure tests, lint, and typechecks pass before submitting changes

## Pull Requests

- Provide a clear description of what was changed and why
- Reference related issues if applicable
- Keep pull requests focused; avoid mixing unrelated changes

## General

- If a breaking change is required, consider opening an issue and discussing it first
- Security-sensitive reports belong in a private GitHub Security Advisory, not a public issue — see [SECURITY.md](./SECURITY.md)
