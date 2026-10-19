"""Run with backend on PYTHONPATH: python -m app.db_tools COMMAND.

Setup commands mutate only an explicitly configured database. No DDL on API startup.
"""
import argparse
import json
from pathlib import Path
import sys

from .config import Settings
from .database import StorageUnavailable
from .schemas import Course
from .storage_import import load_snapshot
from .learning_service import extend_courses


def main(argv=None):
    parser = argparse.ArgumentParser(description="RuralRise Stage 2 database setup")
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("migrate", "migrate-auth", "check", "seed-demo"):
        sub.add_parser(name)
    role = sub.add_parser("set-role")
    role.add_argument("--user-id", required=True)
    role.add_argument("--role", choices=("student", "teacher"), required=True)
    assignment = sub.add_parser("assign-student")
    assignment.add_argument("--teacher-id", required=True)
    assignment.add_argument("--student-id", required=True)
    unassignment = sub.add_parser("unassign-student")
    unassignment.add_argument("--teacher-id", required=True)
    unassignment.add_argument("--student-id", required=True)
    for command in ("enable-user", "disable-user"):
        user = sub.add_parser(command)
        user.add_argument("--user-id", required=True)
    link = sub.add_parser("link-profile")
    link.add_argument("--user-id", required=True)
    link.add_argument("--student-id", required=True)
    importer = sub.add_parser("import-json")
    importer.add_argument("--file", type=Path)
    importer.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)
    try:
        settings = Settings.from_env()
        state = None
        if args.command == "import-json":
            raw = json.loads((settings.data_dir / "courses.json").read_text(encoding="utf-8"))
            original = [Course.model_validate(item).model_dump() for item in raw]
            course_ids = {item['id'] for item in extend_courses(settings, original)}
            state = load_snapshot(args.file or settings.storage_file, course_ids)
            if args.dry_run:
                print(json.dumps({"valid": True, "dry_run": True,
                                  "profiles": len(state["profiles"]), "progress": len(state["progress"])}))
                return 0
        if settings.storage_backend != "postgres":
            raise ValueError("Set STORAGE_BACKEND=postgres and DATABASE_URL before running this command.")
        from .postgres_store import PostgresStore, MigrationConflict
        store = PostgresStore(settings)
        if args.command == "migrate":
            result = store.migrate()
        elif args.command == "migrate-auth":
            result = store.migrate_auth()
        elif args.command in {"set-role", "assign-student", "unassign-student", "enable-user", "disable-user", "link-profile"}:
            from .identity_store import IdentityStore
            identities = IdentityStore(store)
            if args.command == "set-role":
                result = identities.set_role(args.user_id, args.role)
            elif args.command == "assign-student":
                result = identities.assign_student(args.teacher_id, args.student_id)
            elif args.command == "unassign-student":
                result = identities.unassign_student(args.teacher_id, args.student_id)
            elif args.command == "link-profile":
                result = identities.link_profile(args.user_id, args.student_id)
            else:
                result = identities.set_active(args.user_id, args.command == "enable-user")
        elif args.command == "check":
            result = store.check()
        elif args.command == "seed-demo":
            result = store.seed_demo()
        else:
            result = store.import_snapshot(state)
        print(json.dumps(result))
        return 0
    except StorageUnavailable:
        print("Database unavailable. Check connection, SSL, migration, and database permissions. No JSON fallback was used.", file=sys.stderr)
    except (ValueError, OSError):
        print("Configuration or input invalid. Check backend/.env, input JSON, IDs, timestamps, and course catalog.", file=sys.stderr)
    except (ImportError, RuntimeError):
        print("PostgreSQL driver missing. Install backend/requirements-postgres.txt.", file=sys.stderr)
    except Exception as exc:
        # MigrationConflict and unexpected errors are intentionally not printed with input/DSN details.
        print(f"Database setup stopped ({type(exc).__name__}). Review existing schema/migration and setup instructions.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
