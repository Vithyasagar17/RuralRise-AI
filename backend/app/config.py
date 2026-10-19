"""Environment configuration; all relative paths resolve under backend/."""
import os
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]


def backend_path(value: str) -> Path:
    path = Path(value).expanduser()
    return path if path.is_absolute() else BACKEND_DIR / path


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    storage_file: Path
    cors_origins: tuple[str, ...]
    storage_backend: str = "json"
    database_url: str = field(default="", repr=False)
    db_sslmode: str = "require"
    db_connect_timeout: int = 5
    db_statement_timeout_ms: int = 10000
    auth_mode: str = "demo"
    supabase_url: str = ""
    supabase_publishable_key: str = field(default="", repr=False)
    auth_timeout_seconds: int = 5
    enable_account_routes: bool = False
    app_env: str = "development"
    enable_learning_routes: bool = False

    def __post_init__(self):
        if self.auth_mode not in {"demo", "supabase"}:
            raise ValueError("AUTH_MODE must be demo or supabase.")
        if self.app_env not in {"development", "production"}:
            raise ValueError("APP_ENV must be development or production.")
        if not 1 <= self.auth_timeout_seconds <= 30:
            raise ValueError("AUTH_TIMEOUT_SECONDS must be between 1 and 30.")
        if self.auth_mode == "supabase":
            try:
                url = urlsplit(self.supabase_url)
                valid_auth_url = (url.scheme == "https" and bool(url.hostname) and
                    not url.username and not url.password and url.path in {"", "/"} and not url.query and not url.fragment)
            except ValueError:
                valid_auth_url = False
            if not valid_auth_url or not self.supabase_publishable_key or self.storage_backend != "postgres":
                raise ValueError("Supabase authentication requires PostgreSQL, an HTTPS SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.")
        if self.enable_account_routes and self.auth_mode != "supabase":
            raise ValueError("ENABLE_ACCOUNT_ROUTES requires AUTH_MODE=supabase.")
        if self.app_env == "production" and self.auth_mode != "supabase":
            raise ValueError("Production requires AUTH_MODE=supabase; demo mode is development only.")
        if self.app_env == "production" and self.db_sslmode == "disable":
            raise ValueError("Production database connections require an encrypted SSL mode.")
        if self.storage_backend not in {"json", "postgres"}:
            raise ValueError("STORAGE_BACKEND must be json or postgres.")
        if self.db_sslmode not in {"disable", "require", "verify-ca", "verify-full"}:
            raise ValueError("DB_SSLMODE must be disable, require, verify-ca, or verify-full.")
        if not 1 <= self.db_connect_timeout <= 60:
            raise ValueError("DB_CONNECT_TIMEOUT must be between 1 and 60 seconds.")
        if not 100 <= self.db_statement_timeout_ms <= 120000:
            raise ValueError("DB_STATEMENT_TIMEOUT_MS must be between 100 and 120000.")
        if self.storage_backend == "postgres":
            try:
                parsed = urlsplit(self.database_url)
                valid = parsed.scheme in {"postgres", "postgresql"} and bool(parsed.hostname) and bool(parsed.path.strip("/"))
            except ValueError:
                valid = False
            if not valid:
                raise ValueError("Postgres mode requires a valid DATABASE_URL with host and database name.")

    @classmethod
    def from_env(cls):
        # Only backend/.env is read. Existing shell variables take precedence.
        # Disable interpolation so passwords containing ${...} stay literal.
        load_dotenv(BACKEND_DIR / ".env", override=False, interpolate=False)
        origins = tuple(x.strip() for x in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",") if x.strip())
        if "*" in origins:
            raise ValueError("Use explicit CORS_ORIGINS, not '*'.")
        return cls(
            backend_path(os.getenv("DATA_DIR", "data")),
            backend_path(os.getenv("STORAGE_FILE", "var/demo-store.json")),
            origins,
            os.getenv("STORAGE_BACKEND", "json").strip().lower(),
            os.getenv("DATABASE_URL", "").strip(),
            os.getenv("DB_SSLMODE", "require").strip().lower(),
            _env_int("DB_CONNECT_TIMEOUT", 5),
            _env_int("DB_STATEMENT_TIMEOUT_MS", 10000),
            os.getenv("AUTH_MODE", "demo").strip().lower(),
            os.getenv("SUPABASE_URL", "").strip().rstrip("/"),
            os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip(),
            _env_int("AUTH_TIMEOUT_SECONDS", 5),
            _env_bool("ENABLE_ACCOUNT_ROUTES", False),
            os.getenv("APP_ENV", "development").strip().lower(),
            _env_bool("ENABLE_LEARNING_ROUTES", False),
        )


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        raise ValueError(f"{name} must be an integer.") from None


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name, str(default)).strip().lower()
    if value not in {"true", "false", "1", "0"}:
        raise ValueError(f"{name} must be true or false.")
    return value in {"true", "1"}
