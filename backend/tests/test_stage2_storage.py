"""Configuration/import tests always run; adapter tests require optional driver."""
import hashlib
import io
import json
import os
from datetime import datetime, timezone
from pathlib import Path
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from app.config import BACKEND_DIR, Settings
from app.configure_db import write_database_config
from app.database import JsonStore, MissingStudent, StorageUnavailable, create_store, demo_profiles
from app.db_tools import main as db_main
from app.storage_import import load_snapshot

try:
    import psycopg2
    from app.postgres_store import MIGRATION, MigrationConflict, PostgresStore
except ImportError:
    psycopg2 = None

PROFILE = demo_profiles()[0]["profile"]
NOW = datetime(2026, 10, 18, 10, 0, tzinfo=timezone.utc)


def settings(**changes):
    return Settings(data_dir=BACKEND_DIR / "data", storage_file=BACKEND_DIR / "var/demo-store.json",
                    cors_origins=("http://localhost:5173",), **changes)


class ConfigImportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix=".stage2-test-", dir=BACKEND_DIR)
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "snapshot.json"
        self.state = {"profiles": [{"student_id": "student-1", "profile": PROFILE, "created_at": NOW.isoformat()}],
            "progress": [{"student_id": "student-1", "course_id": "demo-safety", "completed": True,
                          "score": 80, "updated_at": NOW.isoformat()}]}

    def write(self):
        self.path.write_text(json.dumps(self.state), encoding="utf-8")

    def test_json_default_and_secret_not_in_repr(self):
        self.assertIsInstance(create_store(settings()), JsonStore)
        configured = settings(storage_backend="postgres", database_url="postgresql://user:SECRET@localhost/db")
        self.assertNotIn("SECRET", repr(configured))

    def test_invalid_backend_url_ssl_and_timeouts(self):
        for changes in ({"storage_backend": "other"}, {"storage_backend": "postgres"},
                        {"storage_backend": "postgres", "database_url": "https://wrong/db"},
                        {"storage_backend": "postgres", "database_url": "postgresql://localhost"},
                        {"db_sslmode": "prefer"}, {"db_connect_timeout": 0},
                        {"db_statement_timeout_ms": 0}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                settings(**changes)

    def test_env_parsing_and_no_secret_error(self):
        with patch.dict(os.environ, {"STORAGE_BACKEND": "postgres", "DATABASE_URL": "postgresql://u:p@host/db",
                "DB_SSLMODE": "require", "DB_CONNECT_TIMEOUT": "3"}, clear=True), patch("app.config.load_dotenv"):
            self.assertEqual(Settings.from_env().storage_backend, "postgres")
            self.assertEqual(Settings.from_env().db_connect_timeout, 3)
        with patch.dict(os.environ, {"DB_CONNECT_TIMEOUT": "SECRET"}, clear=True), patch("app.config.load_dotenv"):
            with self.assertRaises(ValueError) as error:
                Settings.from_env()
            self.assertNotIn("SECRET", str(error.exception))

    def test_dotenv_literal_values_and_environment_precedence(self):
        (Path(self.temp.name) / ".env").write_text(
            "STORAGE_BACKEND=json\nDATABASE_URL='postgresql://u:${literal}@localhost/db'\nDB_CONNECT_TIMEOUT=7\n")
        with patch("app.config.BACKEND_DIR", Path(self.temp.name)), patch.dict(os.environ, {"DB_CONNECT_TIMEOUT": "4"}, clear=True):
            configured = Settings.from_env()
            self.assertEqual(configured.db_connect_timeout, 4)
            self.assertIn("${literal}", configured.database_url)

    def test_valid_snapshot_preserves_ids_and_source_file(self):
        self.write()
        before = self.path.read_bytes()
        self.assertEqual(load_snapshot(self.path, {"demo-safety"}), self.state)
        self.assertEqual(self.path.read_bytes(), before)

    def test_demo_progress_without_saved_profile_is_importable(self):
        self.state["profiles"] = []
        self.state["progress"][0]["student_id"] = "demo-student-001"
        self.write()
        self.assertEqual(len(load_snapshot(self.path, {"demo-safety"})["progress"]), 1)

    def test_import_unknown_student_course_or_naive_timestamp(self):
        for field, value in (("student_id", "missing"), ("course_id", "missing"), ("updated_at", "2026-10-18T10:00:00")):
            original = self.state["progress"][0][field]
            self.state["progress"][0][field] = value
            self.write()
            with self.subTest(field=field), self.assertRaises(ValueError):
                load_snapshot(self.path, {"demo-safety"})
            self.state["progress"][0][field] = original

    def test_duplicate_keys_reserved_ids_and_corrupt_file(self):
        self.state["progress"].append(dict(self.state["progress"][0]))
        self.write()
        with self.assertRaises(ValueError):
            load_snapshot(self.path, {"demo-safety"})
        self.state["progress"] = []
        self.state["profiles"][0]["student_id"] = "demo-student-001"
        self.write()
        with self.assertRaises(ValueError):
            load_snapshot(self.path, {"demo-safety"})
        self.path.write_text("broken")
        with self.assertRaises(ValueError):
            load_snapshot(self.path, {"demo-safety"})

    def test_import_dry_run_needs_no_database_and_writes_no_store(self):
        self.write()
        output = io.StringIO()
        with patch("app.db_tools.Settings.from_env", return_value=settings()), patch("sys.stdout", output):
            self.assertEqual(db_main(["import-json", "--file", str(self.path), "--dry-run"]), 0)
        self.assertEqual(json.loads(output.getvalue()), {"valid": True, "dry_run": True, "profiles": 1, "progress": 1})

    def test_db_cli_refuses_json_mode_and_sanitizes_bad_input(self):
        with patch("app.db_tools.Settings.from_env", return_value=settings()), patch("sys.stderr", io.StringIO()):
            self.assertEqual(db_main(["migrate"]), 1)
            self.assertEqual(db_main(["import-json", "--file", str(self.path)]), 1)

    def test_configuration_writer_preserves_unrelated_values(self):
        from dotenv import dotenv_values
        env_path = Path(self.temp.name) / ".env"
        env_path.write_text("# Keep teammate settings\nCUSTOM_SETTING=keep\nCORS_ORIGINS=http://localhost:5173\n")
        uri = "postgresql://user:p%40ss%24%7Bliteral%7D@localhost/db"
        write_database_config(uri, path=env_path)
        values = dotenv_values(env_path, interpolate=False)
        self.assertEqual(values["DATABASE_URL"], uri)
        self.assertEqual(values["CUSTOM_SETTING"], "keep")
        self.assertEqual(values["CORS_ORIGINS"], "http://localhost:5173")
        self.assertEqual(values["STORAGE_BACKEND"], "postgres")
        before = env_path.read_bytes()
        with self.assertRaises(ValueError):
            write_database_config("https://invalid/SECRET", path=env_path)
        self.assertEqual(env_path.read_bytes(), before)


@unittest.skipIf(psycopg2 is None, "Install backend/requirements-postgres.txt for adapter tests")
class AdapterTests(unittest.TestCase):
    def setUp(self):
        self.config = settings(storage_backend="postgres", database_url="postgresql://u:SECRET@localhost/db")
        self.store = PostgresStore(self.config)
        self.connection = MagicMock()
        self.cursor = self.connection.cursor.return_value.__enter__.return_value
        self.connection.__exit__.return_value = False
        self.patch = patch("app.postgres_store.psycopg2.connect", return_value=self.connection)
        self.connect = self.patch.start()
        self.addCleanup(self.patch.stop)

    def test_selected_postgres_store_and_no_fallback(self):
        self.assertIsInstance(create_store(self.config), PostgresStore)
        self.connect.side_effect = psycopg2.OperationalError("SECRET database details")
        with self.assertLogs("app.postgres_store", level="ERROR") as logs, self.assertRaises(StorageUnavailable):
            self.store.create_profile(PROFILE)
        self.assertNotIn("SECRET", " ".join(logs.output))

    def test_database_outage_is_503_with_live_health_and_no_json_fallback(self):
        from fastapi.testclient import TestClient
        from app.main import create_app
        from inprocess_loop import InProcessEventLoop
        self.connect.side_effect = psycopg2.OperationalError("SECRET connection failure")
        with patch("app.database.JsonStore") as json_factory:
            with TestClient(create_app(self.config), raise_server_exceptions=False,
                            backend_options={"loop_factory": InProcessEventLoop}) as client:
                self.assertEqual(client.get("/health").status_code, 200)
                response = client.post("/profile", json=PROFILE)
                self.assertEqual(response.status_code, 503)
                self.assertNotIn("SECRET", response.text)
                json_factory.assert_not_called()

    def test_internal_retrieval_validates_profile_and_progress(self):
        self.cursor.fetchone.return_value = {"student_id": "student-1", "profile": PROFILE, "created_at": NOW}
        self.assertEqual(self.store.get_profile("student-1")["profile"], PROFILE)
        self.cursor.fetchall.return_value = [{"student_id": "student-1", "course_id": "demo-safety",
            "completed": False, "score": None, "updated_at": NOW}]
        self.assertIsNone(self.store.get_progress("student-1")[0]["score"])

    def test_create_profile_uses_parameters_and_closes_connection(self):
        profile = {**PROFILE, "name": "O'Neil மாணவி"}
        self.cursor.fetchone.return_value = {"student_id": "student-1", "profile": profile}
        result = self.store.create_profile(profile)
        self.assertEqual(result["profile"], profile)
        query, params = self.cursor.execute.call_args.args
        self.assertIn("%s", query)
        self.assertNotIn("O'Neil", query)
        self.assertEqual(json.loads(params[1])["name"], profile["name"])
        self.connection.close.assert_called_once()
        self.assertIsNone(self.connection.__exit__.call_args.args[0])
        self.assertEqual(self.connect.call_args.kwargs["sslmode"], "require")

    def test_progress_upsert_contract_and_utc_timestamp(self):
        update = {"student_id": "student-1", "course_id": "demo-safety", "completed": True, "score": 80}
        self.cursor.fetchone.side_effect = [{"student_id": "student-1"}, {**update, "updated_at": NOW}]
        result = self.store.save_progress(update)
        self.assertEqual(result, {**update, "updated_at": NOW.isoformat()})
        query, params = self.cursor.execute.call_args.args
        self.assertIn("ON CONFLICT (student_id, course_id) DO UPDATE", query)
        self.assertEqual(params, ("student-1", "demo-safety", True, 80))

    def test_missing_student_rolls_back_and_closes(self):
        self.cursor.fetchone.return_value = None
        with self.assertRaises(MissingStudent):
            self.store.save_progress({"student_id": "missing", "course_id": "demo-safety", "completed": True})
        self.assertIs(self.connection.__exit__.call_args.args[0], MissingStudent)
        self.connection.close.assert_called_once()

    def test_database_exception_is_sanitized_and_transaction_closed(self):
        self.cursor.execute.side_effect = psycopg2.OperationalError("SECRET details")
        with self.assertLogs("app.postgres_store", level="ERROR"), self.assertRaises(StorageUnavailable) as error:
            self.store.get_progress("student-1")
        self.assertEqual(str(error.exception), "")
        self.connection.close.assert_called_once()
        self.assertIs(self.connection.__exit__.call_args.args[0], psycopg2.OperationalError)

    def test_facilitator_reads_only_fictional_ids(self):
        self.cursor.fetchall.return_value = []
        result = self.store.facilitator_students()
        self.assertEqual([x["student_id"] for x in result], ["demo-student-001", "demo-student-002"])
        self.assertEqual(self.cursor.execute.call_args.args[1], (["demo-student-001", "demo-student-002"],))

    def test_seed_demo_is_non_overwriting(self):
        self.cursor.rowcount = 0
        self.assertEqual(self.store.seed_demo(), {"demo_profiles_inserted": 0})
        self.assertIn("DO NOTHING", self.cursor.execute.call_args.args[0])

    def test_migration_apply_idempotency_and_checksum_conflict(self):
        self.cursor.fetchone.side_effect = [{"marker": None}, {"present": False}]
        self.assertEqual(self.store.migrate(), {"migration_version": 1, "applied": True})
        checksum = hashlib.sha256(MIGRATION.read_text(encoding="utf-8").encode()).hexdigest()
        self.cursor.fetchone.side_effect = [{"marker": "schema_migrations"}]
        self.cursor.fetchall.return_value = [{"version": 1, "checksum": checksum}]
        self.assertEqual(self.store.migrate(), {"migration_version": 1, "applied": False})
        self.cursor.fetchone.side_effect = [{"marker": "schema_migrations"}]
        self.cursor.fetchall.return_value = [{"version": 1, "checksum": "different"}]
        with self.assertRaises(MigrationConflict):
            self.store.migrate()

    def test_migration_refuses_untracked_schema(self):
        self.cursor.fetchone.side_effect = [{"marker": None}, {"present": True}]
        with self.assertRaises(MigrationConflict):
            self.store.migrate()
        self.assertFalse(any("CREATE SCHEMA" in call.args[0] for call in self.cursor.execute.call_args_list))

    def test_import_keeps_existing_rows_and_timestamp(self):
        state = {"profiles": [{"student_id": "student-1", "profile": PROFILE, "created_at": NOW.isoformat()}],
            "progress": [{"student_id": "student-1", "course_id": "demo-safety", "completed": True,
                          "score": 80, "updated_at": NOW.isoformat()}]}
        self.cursor.rowcount = 1
        self.assertEqual(self.store.import_snapshot(state),
                         {"profiles_inserted": 1, "progress_inserted": 1, "demo_profiles_inserted": 2})
        self.assertIn("DO NOTHING", self.cursor.execute.call_args.args[0])
        self.assertEqual(self.cursor.execute.call_args.args[1][-1], NOW)


if __name__ == "__main__":
    unittest.main()
