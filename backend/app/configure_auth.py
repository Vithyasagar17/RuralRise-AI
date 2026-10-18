"""Local hidden-input Auth configuration, to use after team interface review."""
from dataclasses import replace
from getpass import getpass
from dotenv import set_key
from .config import BACKEND_DIR, Settings


def main():
    try:
        current = Settings.from_env()
        url = input("Supabase project URL (https://...): ").strip().rstrip("/")
        key = getpass("Supabase publishable key (hidden): ").strip()
        # Validate first; requires the real PostgreSQL connection to be configured.
        replace(current, auth_mode="supabase", supabase_url=url, supabase_publishable_key=key,
                enable_account_routes=False)
        for name, value in (("AUTH_MODE", "supabase"), ("SUPABASE_URL", url),
                            ("SUPABASE_PUBLISHABLE_KEY", key), ("ENABLE_ACCOUNT_ROUTES", "false")):
            set_key(str(BACKEND_DIR / ".env"), name, value, quote_mode="always")
        print("Auth settings saved. Run migrate-auth before starting secure mode. Optional read routes remain disabled pending team review.")
        return 0
    except (ValueError, OSError):
        print("Auth configuration incomplete. Configure PostgreSQL first and check the HTTPS project URL/publishable key.")
        return 1
    except (KeyboardInterrupt, EOFError):
        print("\nConfiguration cancelled.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
