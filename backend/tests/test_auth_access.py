"""Token-service, config and HTTP permission tests; no hosted Auth account required."""
import io
from pathlib import Path
import unittest
from unittest.mock import MagicMock, patch
from uuid import uuid4

import httpx
from fastapi.testclient import TestClient
from app.auth import AuthUnavailable, InvalidToken, PermissionDenied, Principal, SupabaseAuthenticator
from app.config import BACKEND_DIR, Settings
from app.database import MissingStudent, demo_profiles
from app.main import create_app
from inprocess_loop import InProcessEventLoop

STUDENT = "c9a739e1-b21c-4f0e-8903-a5e538c26b78"
TEACHER = "7ce456a0-f465-4fa0-aa7d-5c12b2991049"
PROFILE = demo_profiles()[0]["profile"]
OPTIONS = {"backend_options": {"loop_factory": InProcessEventLoop}}


def secure_settings(**changes):
    values = dict(data_dir=BACKEND_DIR / "data", storage_file=BACKEND_DIR / "var/unused-auth-test.json",
        cors_origins=("http://localhost:5173",), storage_backend="postgres",
        database_url="postgresql://user:SECRET@localhost/test", db_sslmode="require",
        auth_mode="supabase", supabase_url="https://test-project.supabase.co",
        supabase_publishable_key="test-publishable")
    values.update(changes)
    return Settings(**values)


class AuthenticatorTests(unittest.TestCase):
    def setUp(self):
        self.auth = SupabaseAuthenticator(secure_settings())
        self.client_patch = patch("app.auth.httpx.Client")
        self.factory = self.client_patch.start()
        self.client = self.factory.return_value.__enter__.return_value
        self.addCleanup(self.client_patch.stop)

    def response(self, status=200, body=None):
        self.client.get.return_value = httpx.Response(status, json=body if body is not None else {"id": STUDENT})

    def test_verified_user_subject_and_metadata_role_ignored(self):
        self.response(body={"id": STUDENT, "user_metadata": {"role": "teacher"}, "app_metadata": {"role": "teacher"}})
        self.assertEqual(self.auth.verify("opaque-token"), STUDENT)
        self.client.get.assert_called_once_with("https://test-project.supabase.co/auth/v1/user",
            headers={"apikey": "test-publishable", "Authorization": "Bearer opaque-token"})
        self.assertFalse(self.factory.call_args.kwargs["follow_redirects"])

    def test_invalid_and_anonymous_tokens_are_rejected(self):
        for status in (401, 403):
            self.response(status)
            with self.subTest(status=status), self.assertRaises(InvalidToken):
                self.auth.verify("invalid")
        self.response(body={"id": STUDENT, "is_anonymous": True})
        with self.assertRaises(InvalidToken):
            self.auth.verify("anonymous")
        for value in ("", "x" * 16385):
            with self.assertRaises(InvalidToken):
                self.auth.verify(value)

    def test_unavailable_redirect_and_invalid_auth_responses(self):
        for status in (302, 429, 500, 503):
            self.response(status)
            with self.subTest(status=status), self.assertRaises(AuthUnavailable):
                self.auth.verify("token")
        for body in ({}, {"id": "not-a-uuid"}, []):
            self.response(body=body)
            with self.subTest(body=body), self.assertRaises(AuthUnavailable):
                self.auth.verify("token")
        self.client.get.side_effect = httpx.ConnectTimeout("SECRET token/network details")
        with self.assertRaises(AuthUnavailable) as error:
            self.auth.verify("token")
        self.assertNotIn("SECRET", str(error.exception))


class AuthConfigTests(unittest.TestCase):
    def test_secure_mode_requires_valid_provider_and_postgres(self):
        for changes in ({"storage_backend": "json"}, {"supabase_url": "http://unsafe.example"},
                        {"supabase_url": "https://example.com/?redirect=elsewhere"},
                        {"supabase_url": "https://user:password@example.com"},
                        {"supabase_publishable_key": ""}, {"auth_timeout_seconds": 0}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                secure_settings(**changes)

    def test_production_never_allows_demo_mode(self):
        with self.assertRaises(ValueError):
            secure_settings(auth_mode="demo", app_env="production")
        self.assertEqual(secure_settings(app_env="production").auth_mode, "supabase")
        with self.assertRaises(ValueError):
            secure_settings(app_env="production", db_sslmode="disable")
        with self.assertRaises(ValueError):
            secure_settings(auth_mode="demo", enable_account_routes=True)
        self.assertNotIn("test-publishable", repr(secure_settings()))


class SecureHttpTests(unittest.TestCase):
    def setUp(self):
        # Storage mock is deliberate here; real SQL ownership tests are separate.
        self.mock_store = MagicMock()
        self.factory = patch("app.main.create_store", return_value=self.mock_store)
        self.factory.start()
        self.addCleanup(self.factory.stop)
        self.api = create_app(secure_settings(enable_account_routes=True))
        self.ids = MagicMock()
        self.ids.ensure_user.side_effect = lambda subject: Principal(subject, "teacher" if subject == TEACHER else "student")
        self.ids.save_profile.return_value = {"student_id": "owned-student", "profile": PROFILE}
        self.ids.owned_profile.return_value = {"student_id": "owned-student", "profile": PROFILE}
        self.ids.own_progress.return_value = []
        self.ids.assigned_students.return_value = []
        self.api.state.identities = self.ids
        self.api.state.authenticator.verify = MagicMock(side_effect=lambda token: TEACHER if token == "teacher-token" else STUDENT)
        self.client = TestClient(self.api, raise_server_exceptions=False, **OPTIONS)
        self.addCleanup(self.client.close)
        self.headers = {"Authorization": "Bearer student-token"}
        self.teacher_headers = {"Authorization": "Bearer teacher-token"}

    def test_public_routes_remain_public(self):
        for path in ("/health", "/courses", "/opportunities"):
            self.assertEqual(self.client.get(path).status_code, 200)
        self.api.state.authenticator.verify.assert_not_called()

    def test_missing_and_wrong_scheme_are_401(self):
        for headers in ({}, {"Authorization": "Basic abc"}):
            response = self.client.post("/profile", json=PROFILE, headers=headers)
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.headers["WWW-Authenticate"], "Bearer")
        self.assertEqual(self.client.get("/facilitator/students").status_code, 401)

    def test_invalid_token_and_provider_outage(self):
        for failure, status in ((InvalidToken, 401), (AuthUnavailable, 503)):
            self.api.state.authenticator.verify.side_effect = failure
            self.assertEqual(self.client.post("/profile", json=PROFILE, headers=self.headers).status_code, status)
        self.ids.save_profile.assert_not_called()

    def test_profile_uses_verified_subject_and_same_response_contract(self):
        response = self.client.post("/profile", json=PROFILE, headers=self.headers)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(set(response.json()), {"student_id", "profile"})
        self.ids.save_profile.assert_called_once_with(STUDENT, PROFILE)
        self.mock_store.create_profile.assert_not_called()

    def test_students_cannot_read_facilitator_or_self_promote(self):
        self.assertEqual(self.client.get("/facilitator/students", headers=self.headers).status_code, 403)
        response = self.client.post("/profile", json={**PROFILE, "role": "teacher"}, headers=self.headers)
        self.assertEqual(response.status_code, 422)
        self.ids.assigned_students.assert_not_called()

    def test_teachers_only_receive_assigned_students_and_cannot_write_student_progress(self):
        self.assertEqual(self.client.get("/facilitator/students", headers=self.teacher_headers).json(), {"students": []})
        self.ids.assigned_students.assert_called_once_with(TEACHER)
        response = self.client.post("/progress", headers=self.teacher_headers,
            json={"student_id": "other-student", "course_id": "demo-safety", "completed": True})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.client.post("/profile", json=PROFILE, headers=self.teacher_headers).status_code, 403)

    def test_forged_student_id_is_404_without_fallback(self):
        self.ids.save_progress.side_effect = MissingStudent
        response = self.client.post("/progress", headers=self.headers,
            json={"student_id": "other-student", "course_id": "demo-safety", "completed": True})
        self.assertEqual(response.status_code, 404)
        self.ids.save_progress.assert_called_once()
        self.mock_store.save_progress.assert_not_called()

    def test_optional_account_read_routes_and_owner_only_reads(self):
        self.assertEqual(self.client.get("/account", headers=self.headers).json(), {"user_id": STUDENT, "role": "student"})
        self.assertEqual(self.client.get("/profile", headers=self.headers).status_code, 200)
        self.assertEqual(self.client.get("/progress", headers=self.headers).json(), {"progress": []})
        self.assertEqual(self.client.get("/profile", headers=self.teacher_headers).status_code, 403)
        self.ids.owned_profile.side_effect = MissingStudent
        self.assertEqual(self.client.get("/profile", headers=self.headers).status_code, 404)

    def test_account_routes_are_absent_until_reviewed_flag_enabled(self):
        api = create_app(secure_settings())
        with TestClient(api, **OPTIONS) as client:
            paths = client.get("/openapi.json").json()["paths"]
            self.assertNotIn("/account", paths)
            self.assertEqual(set(paths["/profile"]), {"post"})
            self.assertEqual(set(paths["/progress"]), {"post"})

    def test_authorization_header_cors_preflight(self):
        response = self.client.options("/progress", headers={"Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "Authorization,Content-Type"})
        self.assertEqual(response.status_code, 200)
