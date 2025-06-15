import subprocess
import uvicorn


def run_migrations():
    print("Running Alembic migrations...")
    result = subprocess.run(["alembic", "upgrade", "head"], check=False)
    if result.returncode != 0:
        print("Alembic migrations failed (continuing anyway)")
    else:
        print("Alembic migrations completed")


if __name__ == "__main__":
    run_migrations()
    uvicorn.run("app.app:app", host="127.0.0.1", port=8000)
