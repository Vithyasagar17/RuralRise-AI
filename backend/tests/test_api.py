"""Run from repository root: python -m unittest discover -s backend/tests -v"""
import concurrent.futures
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from app.config import BACKEND_DIR, Settings
from app.database import JsonStore, StorageUnavailable
from app.main import create_app
from inprocess_loop import InProcessEventLoop

CLIENT_OPTIONS = {"backend_options": {"loop_factory": InProcessEventLoop}}

PROFILE = {
    "name": "Demo Student", "education_level": "Class 12", "location": "Tamil Nadu",
    "language": "Tamil", "interests": ["electronics", "hands-on work"],
    "skills": ["basic mathematics"], "preferred_learning": "practical",
    "weekly_learning_hours": 5, "goals": ["find vocational training"],
}


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix=".test-", dir=BACKEND_DIR)
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.data = root / "data"
        shutil.copytree(BACKEND_DIR / "data", self.data)
        self.settings = Settings(self.data, root / "store.json", ("http://localhost:5173",))
        self.app = create_app(self.settings)
        self.client = TestClient(self.app, raise_server_exceptions=False, **CLIENT_OPTIONS)
        self.addCleanup(self.client.close)

    def progress(self, **overrides):
        return {"student_id": "demo-student-001", "course_id": "demo-safety",
                "completed": True, "score": 80, **overrides}

    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_all_seven_paths_present(self):
        spec = self.client.get("/openapi.json").json()
        self.assertEqual(set(spec["paths"]), {"/health", "/profile", "/recommendations", "/courses",
                                              "/opportunities", "/progress", "/facilitator/students"})

    def test_profile_contract_and_disk_persistence(self):
        response = self.client.post("/profile", json=PROFILE)
        self.assertEqual(response.status_code, 201)
        result = response.json()
        self.assertEqual(set(result), {"student_id", "profile"})
        self.assertEqual(result["profile"], PROFILE)
        state = json.loads(self.settings.storage_file.read_text())
        self.assertEqual(state["profiles"][0]["student_id"], result["student_id"])

    def test_profile_validation(self):
        for changes in ({"name": " "}, {"weekly_learning_hours": 0}, {"weekly_learning_hours": 169},
                        {"weekly_learning_hours": "5"}, {"weekly_learning_hours": True},
                        {"interests": []}, {"skills": [""]}, {"name": "a" * 201},
                        {"unexpected": "x"}):
            with self.subTest(changes=changes):
                self.assertEqual(self.client.post("/profile", json={**PROFILE, **changes}).status_code, 422)
        self.assertEqual(self.client.post("/profile", json={}).status_code, 422)

    def test_optional_profile_fields(self):
        profile = {k: v for k, v in PROFILE.items() if k not in {"skills", "goals"}}
        result = self.client.post("/profile", json=profile)
        self.assertEqual(result.status_code, 201)
        self.assertEqual(result.json()["profile"]["skills"], [])

    def test_invalid_json_and_no_raw_error_values(self):
        for path in ("/profile", "/recommendations", "/progress"):
            response = self.client.post(path, content='{broken "SECRET-VALUE"',
                                        headers={"Content-Type": "application/json"})
            self.assertEqual(response.status_code, 422)
            self.assertNotIn("SECRET-VALUE", response.text)
        response = self.client.post("/profile", json={**PROFILE, "weekly_learning_hours": "SECRET-VALUE"})
        self.assertNotIn("SECRET-VALUE", response.text)

    def test_recommendation_contract(self):
        response = self.client.post("/recommendations", json=PROFILE)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), {"careers"})
        self.assertEqual(len(response.json()["careers"]), 3)
        for item in response.json()["careers"]:
            self.assertEqual(set(item), {"career_id", "title", "match_score", "reasons", "missing_skills", "next_steps"})
            self.assertGreaterEqual(item["match_score"], 0)
            self.assertLessEqual(item["match_score"], 100)
            self.assertTrue(item["reasons"])
            self.assertFalse(any("temporary backend mock" in reason.lower() for reason in item["reasons"]))
        self.assertTrue(any(item["match_score"] > 0 for item in response.json()["careers"]))

    def test_career_adapter_receives_original_profile_and_catalog(self):
        with patch("app.career_engine.recommend_careers", return_value=[]) as adapter:
            self.assertEqual(self.client.post("/recommendations", json=PROFILE).json(), {"careers": []})
            self.assertEqual(adapter.call_args.args[0], PROFILE)
            self.assertEqual(adapter.call_args.args[1][0]["id"], "solar-technician")

    def test_broken_career_adapter(self):
        for result in ([{"title": "invalid"}], {"careers": []}):
            with patch("app.career_engine.recommend_careers", return_value=result):
                self.assertEqual(self.client.post("/recommendations", json=PROFILE).status_code, 503)
        with patch("app.career_engine.recommend_careers", side_effect=RuntimeError("secret")):
            response = self.client.post("/recommendations", json=PROFILE)
            self.assertEqual(response.status_code, 503)
            self.assertNotIn("secret", response.text)

    def test_courses(self):
        response = self.client.get("/courses")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([x["id"] for x in response.json()], ["demo-safety", "demo-planning"])

    def test_opportunity_filtering(self):
        ids = lambda response: [x["id"] for x in response.json()]
        everything = self.client.get("/opportunities")
        self.assertEqual(everything.status_code, 200)
        self.assertEqual(len(everything.json()), 6)

        # category filter ignores letter case
        self.assertEqual(len(self.client.get("/opportunities", params={"category": "TRAINING"}).json()), 3)
        self.assertEqual(ids(self.client.get("/opportunities", params={"category": "apprenticeship"})), ["naps2-001"])
        self.assertEqual(len(self.client.get("/opportunities", params={"category": "scholarship"}).json()), 2)

        # education level filter ignores letter case
        class10 = self.client.get("/opportunities", params={"education_level": "class 10"})
        self.assertCountEqual(ids(class10), ["tn-iti-001", "naps2-001", "pudhumai-penn-001"])

        # combined filters
        filters = {"category": "TRAINING", "education_level": "class 12", "location": "Tamil Nadu", "search": "trade"}
        response = self.client.get("/opportunities", params=filters)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ids(response), ["tn-iti-001"])

        # search and no-match cases
        self.assertEqual(ids(self.client.get("/opportunities", params={"search": "stipend"})), ["naps2-001"])
        self.assertEqual(self.client.get("/opportunities", params={"location": "Kerala"}).json(), [])
        self.assertEqual(self.client.get("/opportunities", params={"search": ""}).status_code, 422)

    def test_unknown_eligibility_is_not_global(self):
        # DDU-GKY and RSETI have no class tags, so a class filter must not return them
        response = self.client.get("/opportunities", params={"education_level": "Class 12"})
        found = [x["id"] for x in response.json()]
        self.assertCountEqual(found, ["tn-iti-001", "naps2-001", "pudhumai-penn-001", "tamil-pudhalvan-001"])
        self.assertNotIn("ddu-gky-001", found)
        self.assertNotIn("rseti-001", found)

        # without a class filter they are still listed
        training = [x["id"] for x in self.client.get("/opportunities", params={"category": "training"}).json()]
        self.assertIn("ddu-gky-001", training)
        self.assertIn("rseti-001", training)

        # unverified records keep last_verified empty
        by_id = {x["id"]: x for x in self.client.get("/opportunities").json()}
        self.assertIsNone(by_id["tn-iti-001"]["last_verified"])
        self.assertIsNone(by_id["tamil-pudhalvan-001"]["last_verified"])
        self.assertEqual(by_id["naps2-001"]["last_verified"], "2026-10-18")

    def test_broken_opportunity_adapter(self):
        with patch("app.opportunity_engine.filter_opportunities", return_value=[{"id": "broken"}]):
            self.assertEqual(self.client.get("/opportunities").status_code, 503)

    def test_progress_is_upserted_and_survives_app_restart(self):
        for score in (50, 90):
            response = self.client.post("/progress", json=self.progress(score=score))
            self.assertEqual(response.status_code, 200)
        with TestClient(create_app(self.settings), **CLIENT_OPTIONS) as restarted:
            students = restarted.get("/facilitator/students").json()["students"]
        saved = students[0]["progress"]
        self.assertEqual(len(saved), 1)
        self.assertEqual(saved[0]["score"], 90)
        self.assertEqual(saved[0]["completed"], True)
        self.assertTrue(saved[0]["updated_at"].endswith("+00:00"))

    def test_new_profile_can_store_progress_but_is_not_in_facilitator(self):
        student_id = self.client.post("/profile", json=PROFILE).json()["student_id"]
        self.assertEqual(self.client.post("/progress", json=self.progress(student_id=student_id)).status_code, 200)
        ids = [x["student_id"] for x in self.client.get("/facilitator/students").json()["students"]]
        self.assertNotIn(student_id, ids)
        self.assertEqual(ids, ["demo-student-001", "demo-student-002"])

    def test_progress_validation_and_missing_ids(self):
        for changes in ({"score": -1}, {"score": 101}, {"completed": "yes"}, {"student_id": "../bad"},
                        {"course_id": ""}, {"extra": 1}):
            with self.subTest(changes=changes):
                self.assertEqual(self.client.post("/progress", json=self.progress(**changes)).status_code, 422)
        for changes in ({"student_id": "unknown"}, {"course_id": "unknown"}):
            self.assertEqual(self.client.post("/progress", json=self.progress(**changes)).status_code, 404)
        self.assertEqual(self.client.post("/progress", json=self.progress(score=None)).status_code, 200)

    def test_catalog_failures_leave_health_up(self):
        cases = [("careers.json", "/recommendations"), ("courses.json", "/courses"),
                 ("opportunities.json", "/opportunities")]
        for name, endpoint in cases:
            original = (self.data / name).read_text()
            for bad in (None, "{broken", "{}", '[{"invalid":true}]'):
                with self.subTest(name=name, bad=bad):
                    if bad is None:
                        (self.data / name).unlink()
                    else:
                        (self.data / name).write_text(bad)
                    response = (self.client.post(endpoint, json=PROFILE) if endpoint == "/recommendations"
                                else self.client.get(endpoint))
                    self.assertEqual(response.status_code, 503)
                    self.assertEqual(self.client.get("/health").status_code, 200)
                    (self.data / name).write_text(original)

    def test_duplicate_dataset_ids_rejected(self):
        entries = json.loads((self.data / "courses.json").read_text())
        (self.data / "courses.json").write_text(json.dumps([entries[0], entries[0]]))
        self.assertEqual(self.client.get("/courses").status_code, 503)

    def test_corrupt_store_not_overwritten(self):
        for corrupt in ("{broken", '{"profiles": {}}', '{"unrecognised": 1}'):
            self.settings.storage_file.write_text(corrupt)
            self.assertEqual(self.client.post("/profile", json=PROFILE).status_code, 503)
            self.assertEqual(self.client.get("/facilitator/students").status_code, 503)
            self.assertEqual(self.settings.storage_file.read_text(), corrupt)

    def test_disk_error(self):
        with patch("app.database.os.replace", side_effect=PermissionError("private-path")):
            response = self.client.post("/profile", json=PROFILE)
            self.assertEqual(response.status_code, 503)
            self.assertNotIn("private-path", response.text)

    def test_concurrent_json_writes(self):
        store = JsonStore(self.settings.storage_file)
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda _: store.create_profile(PROFILE), range(20)))
        self.assertEqual(len({x["student_id"] for x in results}), 20)
        self.assertEqual(len(json.loads(self.settings.storage_file.read_text())["profiles"]), 20)

    def test_cors_preflight(self):
        headers = {"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST",
                   "Access-Control-Request-Headers": "Content-Type"}
        response = self.client.options("/profile", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:5173")
        response = self.client.options("/profile", headers={**headers, "Origin": "https://untrusted.example"})
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("access-control-allow-origin", response.headers)

    def test_configuration_paths_and_explicit_origins(self):
        with patch.dict("os.environ", {"DATA_DIR": "data", "STORAGE_FILE": "var/test.json",
                                      "CORS_ORIGINS": "http://localhost:5173"}):
            settings = Settings.from_env()
            self.assertEqual(settings.data_dir, BACKEND_DIR / "data")
            self.assertEqual(settings.storage_file, BACKEND_DIR / "var/test.json")
        with patch.dict("os.environ", {"CORS_ORIGINS": "*"}):
            with self.assertRaises(ValueError):
                Settings.from_env()

    def test_unexpected_backend_failure(self):
        with patch.object(self.app.state.store, "create_profile", side_effect=RuntimeError("private-details")):
            response = self.client.post("/profile", json=PROFILE)
            self.assertEqual(response.status_code, 500)
            self.assertNotIn("private-details", response.text)


if __name__ == "__main__":
    unittest.main()
