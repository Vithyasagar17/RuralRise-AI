"""Local, hidden-input setup wizard. Writes backend/.env, never prints credentials."""
from getpass import getpass
from pathlib import Path
from urllib.parse import quote

from dotenv import set_key
from .config import BACKEND_DIR, Settings


def write_database_config(url: str, sslmode: str = "require", path: Path | None = None):
    # Validate before changing any file. Existing unrelated .env entries are preserved.
    Settings(BACKEND_DIR / "data", BACKEND_DIR / "var/demo-store.json", (),
             storage_backend="postgres", database_url=url, db_sslmode=sslmode)
    target = path or BACKEND_DIR / ".env"
    target.parent.mkdir(parents=True, exist_ok=True)
    for key, value in (("STORAGE_BACKEND", "postgres"), ("DATABASE_URL", url),
                       ("DB_SSLMODE", sslmode), ("DB_CONNECT_TIMEOUT", "5"),
                       ("DB_STATEMENT_TIMEOUT_MS", "10000")):
        set_key(str(target), key, value, quote_mode="always")


def main():
    try:
        print("Configure the local backend/.env. Nothing is sent to an external service.")
        print("Paste the actual PostgreSQL URI from your provider's Connect dialog. Input is hidden.")
        uri = getpass("PostgreSQL connection URI: ").strip()
        if "[YOUR-PASSWORD]" in uri:
            password = getpass("Database password (hidden; encoded automatically): ")
            uri = uri.replace("[YOUR-PASSWORD]", quote(password, safe=""))
        mode = input("SSL mode [require] (use disable only for local PostgreSQL): ").strip() or "require"
        write_database_config(uri, mode)
        print("Database configuration saved to backend/.env. Restart the terminal/server if older shell settings override it.")
        return 0
    except (ValueError, OSError):
        print("Configuration was not completed. Check the URI, SSL mode, and file permissions. Credentials were not displayed.")
        return 1
    except (KeyboardInterrupt, EOFError):
        print("\nConfiguration cancelled.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
