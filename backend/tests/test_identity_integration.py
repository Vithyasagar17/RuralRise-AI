"""Real PostgreSQL ownership/teacher-access tests, plus mocked provider boundary."""
import concurrent.futures
import os
import unittest
from uuid import uuid4
from fastapi.testclient import TestClient

from app.auth import PermissionDenied
from app.config import BACKEND_DIR, Settings
from app.database import MissingStudent, demo_profiles
from app.main import create_app
from inprocess_loop import InProcessEventLoop

ENABLED = bool(os.getenv("RURALRISE_TEST_DATABASE_URL")) and os.getenv("RURALRISE_ALLOW_DATABASE_TESTS") == "1"
PROFILE = demo_profiles()[0]["profile"]
OPTIONS = {"backend_options": {"loop_factory": InProcessEventLoop}}


@unittest.skipUnless(ENABLED, "Requires an explicitly configured disposable PostgreSQL database")
class IdentityIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app.identity_store import IdentityStore
        from app.postgres_store import PostgresStore
        cls.config = Settings(BACKEND_DIR / "data", BACKEND_DIR / "var/unused-test.json", (),
            storage_backend="postgres", database_url=os.environ["RURALRISE_TEST_DATABASE_URL"],
            db_sslmode=os.getenv("RURALRISE_TEST_DB_SSLMODE", "require"))
        cls.store = PostgresStore(cls.config)
        cls.store.migrate_auth()
        cls.identities = IdentityStore(cls.store)

    def setUp(self):
        self.student1, self.student2, self.teacher1, self.teacher2 = [str(uuid4()) for _ in range(4)]
        self.users = [self.student1, self.student2, self.teacher1, self.teacher2]
        for subject in self.users:
            self.identities.ensure_user(subject)
        self.identities.set_role(self.teacher1, "teacher")
        self.identities.set_role(self.teacher2, "teacher")

    def tearDown(self):
        with self.store.transaction() as cursor:
            cursor.execute("SELECT student_id FROM ruralrise_backend.student_owners WHERE user_id = ANY(%s::uuid[])", (self.users,))
            students = [row["student_id"] for row in cursor.fetchall()]
            cursor.execute("""DELETE FROM ruralrise_backend.teacher_student_assignments
                WHERE teacher_id = ANY(%s::uuid[]) OR student_id = ANY(%s)""", (self.users, students))
            cursor.execute("DELETE FROM ruralrise_backend.student_owners WHERE user_id = ANY(%s::uuid[])", (self.users,))
            cursor.execute("DELETE FROM ruralrise_backend.learning_progress WHERE student_id = ANY(%s)", (students,))
            cursor.execute("DELETE FROM ruralrise_backend.student_profiles WHERE student_id = ANY(%s)", (students,))
            cursor.execute("DELETE FROM ruralrise_backend.app_users WHERE user_id = ANY(%s::uuid[])", (self.users,))

    def save(self, subject=None):
        return self.identities.save_profile(subject or self.student1, PROFILE)

    def secure_app(self):
        from dataclasses import replace
        api = create_app(replace(self.config, auth_mode="supabase", supabase_url="https://test-project.supabase.co",
            supabase_publishable_key="test-publishable", enable_account_routes=True))
        # Real role/ownership SQL; only external hosted Auth response is substituted.
        api.state.authenticator.verify = lambda token: {"student1": self.student1, "student2": self.student2,
                                                        "teacher1": self.teacher1, "teacher2": self.teacher2}[token]
        return api

    def test_auth_migration_idempotency_and_stage2_compatibility(self):
        self.assertEqual(self.store.migrate_auth(), {"migration_version": 2, "applied": False})
        self.assertEqual(self.store.migrate(), {"migration_version": 2, "applied": False})
        self.assertEqual(self.store.check()["migration_version"], 2)

    def test_default_role_is_student_and_inactive_user_stays_blocked(self):
        self.assertEqual(self.identities.ensure_user(self.student1).role, "student")
        with self.store.transaction() as cursor:
            cursor.execute("UPDATE ruralrise_backend.app_users SET is_active = false WHERE user_id = %s", (self.student1,))
        with self.assertRaises(PermissionDenied):
            self.identities.ensure_user(self.student1)

    def test_profile_updates_keep_same_student_id_and_progress(self):
        first = self.save()
        self.identities.save_progress(self.student1, {"student_id": first["student_id"], "course_id": "demo-safety", "completed": True})
        second = self.identities.save_profile(self.student1, {**PROFILE, "name": "Updated demo learner"})
        self.assertEqual(first["student_id"], second["student_id"])
        self.assertEqual(len(self.identities.own_progress(self.student1)), 1)
        self.assertEqual(self.identities.owned_profile(self.student1)["profile"]["name"], "Updated demo learner")

    def test_concurrent_profile_requests_create_one_owned_profile(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda _: self.save(), range(8)))
        self.assertEqual(len({row["student_id"] for row in results}), 1)

    def test_other_student_cannot_update_progress(self):
        target = self.save()["student_id"]
        with self.assertRaises(MissingStudent):
            self.identities.save_progress(self.student2, {"student_id": target, "course_id": "demo-safety", "completed": True})
        self.assertEqual(self.store.get_progress(target), [])

    def test_teacher_only_reads_assigned_students(self):
        first = self.save()
        second = self.save(self.student2)
        self.identities.assign_student(self.teacher1, first["student_id"])
        self.identities.assign_student(self.teacher1, first["student_id"])
        self.assertEqual([r["student_id"] for r in self.identities.assigned_students(self.teacher1)], [first["student_id"]])
        self.assertEqual(self.identities.assigned_students(self.teacher2), [])
        self.assertNotIn(second["student_id"], [r["student_id"] for r in self.identities.assigned_students(self.teacher1)])

    def test_student_cannot_be_assigned_as_teacher(self):
        target = self.save()["student_id"]
        with self.assertRaises(PermissionDenied):
            self.identities.assign_student(self.student2, target)

    def test_role_change_is_seen_without_trusting_old_token_role(self):
        target = self.save()["student_id"]
        self.identities.assign_student(self.teacher1, target)
        self.identities.set_role(self.teacher1, "student")
        self.assertEqual(self.identities.ensure_user(self.teacher1).role, "student")
        self.assertEqual(self.identities.assigned_students(self.teacher1), [])

    def test_teacher_cannot_create_student_profile(self):
        with self.assertRaises(PermissionDenied):
            self.identities.save_profile(self.teacher1, PROFILE)

    def test_disable_enable_and_unassignment_revoke_access(self):
        target = self.save()["student_id"]
        self.identities.assign_student(self.teacher1, target)
        self.identities.unassign_student(self.teacher1, target)
        self.assertEqual(self.identities.assigned_students(self.teacher1), [])
        self.identities.set_active(self.student1, False)
        with self.assertRaises(PermissionDenied):
            self.identities.ensure_user(self.student1)
        self.identities.set_active(self.student1, True)
        self.assertEqual(self.identities.ensure_user(self.student1).role, "student")

    def test_privileged_legacy_link_preserves_id_and_rejects_takeover(self):
        profile = self.store.create_profile(PROFILE)
        target = profile["student_id"]
        self.identities.link_profile(self.student1, target)
        self.identities.link_profile(self.student1, target)
        self.assertEqual(self.identities.owned_profile(self.student1)["student_id"], target)
        with self.assertRaises(PermissionDenied):
            self.identities.link_profile(self.student2, target)
        with self.assertRaises(MissingStudent):
            self.identities.link_profile(self.student2, "demo-student-001")

    def test_private_http_roundtrip_with_real_ownership_sql(self):
        api = self.secure_app()
        with TestClient(api, **OPTIONS) as client:
            student = {"Authorization": "Bearer student1"}
            other = {"Authorization": "Bearer student2"}
            teacher = {"Authorization": "Bearer teacher1"}
            created = client.post("/profile", json=PROFILE, headers=student)
            self.assertEqual(created.status_code, 201)
            target = created.json()["student_id"]
            update = {"student_id": target, "course_id": "demo-safety", "completed": True, "score": 82}
            self.assertEqual(client.post("/progress", json=update, headers=other).status_code, 404)
            self.assertEqual(client.post("/progress", json=update, headers=student).status_code, 200)
            self.assertEqual(client.get("/progress", headers=student).json()["progress"][0]["score"], 82)
            self.assertEqual(client.get("/profile", headers=student).json()["student_id"], target)
            self.assertEqual(client.get("/facilitator/students", headers=student).status_code, 403)
            self.assertEqual(client.get("/facilitator/students", headers=teacher).json(), {"students": []})
            self.identities.assign_student(self.teacher1, target)
            rows = client.get("/facilitator/students", headers=teacher).json()["students"]
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["progress"][0]["score"], 82)
            self.assertEqual(client.get("/account", headers=teacher).json()["role"], "teacher")

    def test_unowned_demo_profiles_are_not_exposed_in_secure_mode(self):
        self.store.seed_demo()
        self.assertEqual(self.identities.assigned_students(self.teacher1), [])
        with self.assertRaises(MissingStudent):
            self.identities.assign_student(self.teacher1, "demo-student-001")

    def test_identity_tables_have_rls_without_public_policies(self):
        with self.store.transaction() as cursor:
            cursor.execute("""SELECT relname, relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'ruralrise_backend' AND c.relname IN
                ('app_users', 'student_owners', 'teacher_student_assignments')""")
            rows = cursor.fetchall()
            self.assertEqual(len(rows), 3)
            self.assertTrue(all(row["relrowsecurity"] for row in rows))
