# Contributing guidelines for Cardholder PWA

Contributions are welcome. Please follow these guidelines to keep the project consistent and maintainable.

## Development

Angular for the frontend, Python (FastAPI and SQLAlchemy) for the backend.

See [backend/README.md](/backend/README.md) and [frontend/README.md](/frontend/README.md) for local setup. From the repo root:

```bash
uv run python -m backend.dev
npm --prefix frontend run start
```

## Commits

- Use the [Conventional Commits](https://www.conventionalcommits.org/) format for all commit messages, e.g. `feat(backend): add password recovery`. Common types: feat, fix, docs, refactor, test, chore. Common scopes: backend, frontend, docs, ci
- Keep commits focused; avoid mixing unrelated changes
- Releases are cut from Conventional Commits on `main`, so the type and scope in the message matter

AI tools may assist, but the human author is responsible for every change. Commit messages, PR titles, and descriptions contain no `Co-authored-by` trailers, agent mentions (such as `@cursor`), or "Generated with …" lines, and AI tools are not listed as authors.

[`.pre-commit-config.yaml`](/.pre-commit-config.yaml) runs `ruff check --fix`, `ruff format`, `mypy`, and frontend `lint-staged` on commit.

## Code Changes

- Follow the existing code style and structure
- Prefer clear, readable solutions
- Apply SOLID, KISS, DRY, and YAGNI only when they simplify the change
- Avoid introducing unnecessary dependencies
- Python uses modern type syntax. The frontend adds no new `any`. Details are in [backend/AGENTS.md](/backend/AGENTS.md) and [frontend/AGENTS.md](/frontend/AGENTS.md)
- Backend model changes need an Alembic revision (`python -m alembic -c backend/alembic.ini revision --autogenerate -m "comment"`). See [backend/README.md](/backend/README.md)

## Tests

- Every feature and bug fix comes with automated tests that lock the important behavior, not only call the code
- Parameterize cases that differ only by inputs and expected results
- Update existing tests when changing existing behavior
- Ensure tests, lint, and typechecks pass before submitting changes

```bash
uv run ruff check backend
uv run ruff format backend
uv run mypy backend
uv run pytest
uv run pytest backend/test/api/test_card_api.py

npm --prefix frontend run lint
npm --prefix frontend run prettier:check
npm --prefix frontend run test:ci
```

## Pull Requests

- Provide a clear description of what was changed and why
- Reference related issues if applicable (`Closes #123`)
- Keep pull requests focused on a single responsibility
- Titles and descriptions follow the AI attribution rule from [Commits](#commits)
- When behavior or configuration changes, update the documentation (see [Documentation](#documentation))

## General

- If a breaking change is required, consider opening an issue and discussing it first
- Security-sensitive reports belong in a private GitHub Security Advisory, not a public issue — see [SECURITY.md](./SECURITY.md)

## Documentation

Update the matching documentation in the same change when behavior, configuration, architecture, or contracts change. General docs live in `docs/`. Package docs live beside the code (`backend/README.md`, `frontend/README.md`). The root `README.md` is the product overview.

Codes, encryption, account roles, two-factor authentication, and shared cards are described in [CODES.md](./CODES.md), [ENCRYPTION.md](./ENCRYPTION.md), [ROLES.md](./ROLES.md), [TWO_FACTOR.md](./TWO_FACTOR.md), and [SHARED_CARDS.md](./SHARED_CARDS.md). Link to those pages instead of copying them here.

- **Compact and readable.** Short sections, lists and tables instead of long prose. Extend an existing doc rather than adding a new one, and remove text that the change made stale.
- **Behavior, rules, and flow.** Describe what the feature does, the rules and permissions, and how the parts interact. API request and response schemas, error codes, timeouts, magic numbers, and algorithm internals stay in the code, the Pydantic schemas in `backend/schemas/`, and the OpenAPI docs (`/docs`).
- **Technical voice.** Third person, present tense: "The app supports…", "The server stores…". No direct address and no marketing wording.
- **Diagrams.** Flows, state decisions, and component relations use Mermaid (`flowchart`, `sequenceDiagram`). Each diagram stays small and parses.
- **Language and format.** Contributor docs are in English. File, class, and setting names are in backticks. Relative links and anchors stay valid.
- **User-facing docs.** When the product overview changes, update the root `README.md` and every locale under `docs/{de,es,fr,it,ru}/README.md`.
