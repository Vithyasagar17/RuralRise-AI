"""Cross-platform deployment entrypoint. Configure APP_ENV/PORT/HOST explicitly."""
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))


def main():
    from app.config import Settings
    settings = Settings.from_env()
    try:
        port = int(os.getenv("PORT", "8000"))
        if not 1 <= port <= 65535:
            raise ValueError
    except ValueError:
        print("PORT must be an integer from 1 to 65535.", file=sys.stderr)
        return 1
    if settings.app_env == "production":
        from app.postgres_store import PostgresStore
        try:
            if PostgresStore(settings).check()["migration_version"] != 2:
                raise ValueError
        except Exception:
            print("Production database is not ready; run migrate-auth and check using the intended environment.", file=sys.stderr)
            return 1
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0" if settings.app_env == "production" else "127.0.0.1")
    uvicorn.run("app.main:app", host=host, port=port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
