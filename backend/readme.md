# Frontend part of cardholder_pwa

### Preparations

It is recommended to use python virtual environment `pip install python3-venv`.
You may also need following packages `pip3 install python-is-python3 python3-dev`.

### Run the app

- Run install.sh script to prepare python environment or do it manually
- In the root of the workspace, create an .env file with at least these variables

```bash
DB_URL=sqlite+aiosqlite:///./cardholder_pwa.db
```

- Run the app with `python -m backend.dev` or `python -m backend.start`

### Migrations

Do not forget to create new migrations on models change with `alembic revision --autogenerate -m "some column add to some table"`
