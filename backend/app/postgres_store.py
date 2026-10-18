"""PostgreSQL implementation of the existing storage interface. No public API additions.

One short-lived connection per operation, committed/rolled back and always closed.
Table names are fixed; all user values are parameters. No JSON fallback on failures.
"""
import hashlib
import json
import logging
from contextlib import contextmanager
from datetime import timezone
from pathlib import Path
from uuid import uuid4

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    raise RuntimeError("Install backend/requirements-postgres.txt to use PostgreSQL storage.") from None

from pydantic import ValidationError
from .database import MissingStudent, StorageUnavailable, demo_profiles
from .schemas import ProfileResponse, ProgressRecord, ProgressUpdate, StoredStudent, StudentProfile
from .storage_import import timestamp

logger = logging.getLogger(__name__)
MIGRATION = Path(__file__).resolve().parents[2] / "database" / "migrations" / "001_backend_storage.sql"
AUTH_MIGRATION = MIGRATION.with_name("002_identity_access.sql")


class MigrationConflict(Exception):
    """Existing schema/checksum differs from this release; requires human review."""


def _progress(row):
    record = dict(row)
    record["updated_at"] = record["updated_at"].astimezone(timezone.utc).isoformat()
    return ProgressRecord.model_validate(record).model_dump()


class PostgresStore:
    def __init__(self, settings):
        self.settings = settings

    @contextmanager
    def transaction(self):
        conn = None
        try:
            conn = psycopg2.connect(self.settings.database_url,
                connect_timeout=self.settings.db_connect_timeout,
                sslmode=self.settings.db_sslmode, application_name="ruralrise-backend",
                cursor_factory=RealDictCursor)
            with conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT set_config('statement_timeout', %s, true), set_config('lock_timeout', '5000', true)",
                                   (str(self.settings.db_statement_timeout_ms),))
                    yield cursor
        except (psycopg2.Error, ValidationError, ValueError, TypeError, KeyError) as exc:
            # Never print DSNs, SQL parameters, profile contents or driver messages.
            logger.error("PostgreSQL storage unavailable: %s", type(exc).__name__)
            raise StorageUnavailable from None
        finally:
            if conn is not None:
                conn.close()

    def create_profile(self, profile):
        valid = StudentProfile.model_validate(profile).model_dump()
        with self.transaction() as cursor:
            cursor.execute("""INSERT INTO ruralrise_backend.student_profiles (student_id, profile)
                VALUES (%s, %s::jsonb) RETURNING student_id, profile""",
                (str(uuid4()), json.dumps(valid, ensure_ascii=False, allow_nan=False)))
            response = ProfileResponse.model_validate(dict(cursor.fetchone())).model_dump()
        return response

    def get_profile(self, student_id):
        """Internal verification interface; no new unauthenticated HTTP endpoint."""
        with self.transaction() as cursor:
            cursor.execute("""SELECT student_id, profile, created_at
                FROM ruralrise_backend.student_profiles WHERE student_id = %s""", (student_id,))
            row = cursor.fetchone()
            if row is None:
                raise MissingStudent
            record = dict(row)
            record["created_at"] = record["created_at"].astimezone(timezone.utc).isoformat()
            response = StoredStudent.model_validate(record).model_dump()
        return response

    def save_progress(self, update):
        valid = ProgressUpdate.model_validate(update).model_dump()
        with self.transaction() as cursor:
            cursor.execute("""SELECT student_id FROM ruralrise_backend.student_profiles
                WHERE student_id = %s FOR KEY SHARE""", (valid["student_id"],))
            if cursor.fetchone() is None:
                raise MissingStudent
            cursor.execute("""INSERT INTO ruralrise_backend.learning_progress
                (student_id, course_id, completed, score) VALUES (%s, %s, %s, %s)
                ON CONFLICT (student_id, course_id) DO UPDATE SET
                completed = EXCLUDED.completed, score = EXCLUDED.score, updated_at = clock_timestamp()
                RETURNING student_id, course_id, completed, score, updated_at""",
                (valid["student_id"], valid["course_id"], valid["completed"], valid["score"]))
            response = _progress(cursor.fetchone())
        return response

    def get_progress(self, student_id):
        """Internal verification method; course validity is enforced by HTTP/import callers."""
        with self.transaction() as cursor:
            cursor.execute("""SELECT student_id, course_id, completed, score, updated_at
                FROM ruralrise_backend.learning_progress WHERE student_id = %s ORDER BY course_id""",
                (student_id,))
            response = [_progress(row) for row in cursor.fetchall()]
        return response

    def facilitator_students(self):
        demo = demo_profiles()
        with self.transaction() as cursor:
            cursor.execute("""SELECT student_id, course_id, completed, score, updated_at
                FROM ruralrise_backend.learning_progress WHERE student_id = ANY(%s) ORDER BY course_id""",
                ([item["student_id"] for item in demo],))
            records = [_progress(row) for row in cursor.fetchall()]
        return [{**item, "progress": [r for r in records if r["student_id"] == item["student_id"]]}
                for item in demo]

    def _seed_demo(self, cursor):
        inserted = 0
        for item in demo_profiles():
            cursor.execute("""INSERT INTO ruralrise_backend.student_profiles (student_id, profile, is_demo)
                VALUES (%s, %s::jsonb, true) ON CONFLICT (student_id) DO NOTHING""",
                (item["student_id"], json.dumps(item["profile"], ensure_ascii=False)))
            inserted += cursor.rowcount
        return inserted

    def seed_demo(self):
        with self.transaction() as cursor:
            inserted = self._seed_demo(cursor)
        return {"demo_profiles_inserted": inserted}

    def migrate(self):
        content = MIGRATION.read_text(encoding="utf-8")
        checksum = hashlib.sha256(content.encode()).hexdigest()
        with self.transaction() as cursor:
            # Serializes this migration even when two setup processes start together.
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", (642771001,))
            cursor.execute("SELECT to_regclass('ruralrise_backend.schema_migrations') AS marker")
            if cursor.fetchone()["marker"] is not None:
                cursor.execute("SELECT version, checksum FROM ruralrise_backend.schema_migrations ORDER BY version")
                versions = [dict(row) for row in cursor.fetchall()]
                expected = [{"version": 1, "checksum": checksum}]
                if len(versions) == 2:
                    expected.append({"version": 2, "checksum": hashlib.sha256(
                        AUTH_MIGRATION.read_text(encoding="utf-8").encode()).hexdigest()})
                if versions != expected:
                    raise MigrationConflict("Existing migration metadata differs; review before continuing.")
                return {"migration_version": versions[-1]["version"], "applied": False}
            cursor.execute("SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'ruralrise_backend') AS present")
            if cursor.fetchone()["present"]:
                raise MigrationConflict("Untracked ruralrise_backend schema exists; it was not modified.")
            cursor.execute(content)
            cursor.execute("INSERT INTO ruralrise_backend.schema_migrations (version, checksum) VALUES (%s, %s)",
                           (1, checksum))
        return {"migration_version": 1, "applied": True}

    def migrate_auth(self):
        self.migrate()
        content = AUTH_MIGRATION.read_text(encoding="utf-8")
        checksum = hashlib.sha256(content.encode()).hexdigest()
        with self.transaction() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", (642771001,))
            cursor.execute("SELECT checksum FROM ruralrise_backend.schema_migrations WHERE version = 2")
            existing = cursor.fetchone()
            if existing:
                if existing["checksum"] != checksum:
                    raise MigrationConflict("Authentication migration checksum differs.")
                return {"migration_version": 2, "applied": False}
            cursor.execute(content)
            cursor.execute("INSERT INTO ruralrise_backend.schema_migrations (version, checksum) VALUES (%s, %s)",
                           (2, checksum))
        return {"migration_version": 2, "applied": True}

    def check(self):
        with self.transaction() as cursor:
            cursor.execute("SELECT version FROM ruralrise_backend.schema_migrations ORDER BY version")
            versions = [row["version"] for row in cursor.fetchall()]
            if versions not in ([1], [1, 2]):
                raise MigrationConflict("Migration version is not supported by this backend.")
            cursor.execute("""SELECT (SELECT count(*) FROM ruralrise_backend.student_profiles) AS profiles,
                (SELECT count(*) FROM ruralrise_backend.learning_progress) AS progress""")
            counts = dict(cursor.fetchone())
        return {"backend": "postgres", "schema": "ruralrise_backend", "migration_version": versions[-1], **counts}

    def import_snapshot(self, state):
        """Caller must use load_snapshot first. One transaction; existing database rows win."""
        counts = {"profiles_inserted": 0, "progress_inserted": 0}
        with self.transaction() as cursor:
            counts["demo_profiles_inserted"] = self._seed_demo(cursor)
            for item in state["profiles"]:
                cursor.execute("""INSERT INTO ruralrise_backend.student_profiles (student_id, profile, created_at)
                    VALUES (%s, %s::jsonb, %s) ON CONFLICT (student_id) DO NOTHING""",
                    (item["student_id"], json.dumps(item["profile"], ensure_ascii=False), timestamp(item["created_at"])))
                counts["profiles_inserted"] += cursor.rowcount
            for item in state["progress"]:
                cursor.execute("""INSERT INTO ruralrise_backend.learning_progress
                    (student_id, course_id, completed, score, updated_at) VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (student_id, course_id) DO NOTHING""",
                    (item["student_id"], item["course_id"], item["completed"], item["score"], timestamp(item["updated_at"])))
                counts["progress_inserted"] += cursor.rowcount
        return counts
