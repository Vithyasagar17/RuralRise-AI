"""Exercise the optional contract, every pathway, and malformed module bounds."""
from dataclasses import replace
import json
import shutil
from pathlib import Path
import tempfile
import unittest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.config import BACKEND_DIR, Settings
from app.main import create_app
from inprocess_loop import InProcessEventLoop
from test_api import PROFILE, CLIENT_OPTIONS
from test_auth_access import secure_settings, STUDENT
from app.auth import Principal

class LearningRouteTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='.learning-test-', dir=BACKEND_DIR)
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.data = root / 'data'
        shutil.copytree(BACKEND_DIR / 'data', self.data)
        self.settings = Settings(self.data, root / 'state.json', (), enable_learning_routes=True)
        self.client = TestClient(create_app(self.settings), raise_server_exceptions=False, **CLIENT_OPTIONS)
        self.addCleanup(self.client.close)

    def plan(self, career_id='solar-technician', profile=None):
        return self.client.post('/roadmap', json={'profile': profile or PROFILE, 'career_id': career_id})

    def test_disabled_preserves_original_paths_and_courses(self):
        with TestClient(create_app(replace(self.settings, enable_learning_routes=False)), **CLIENT_OPTIONS) as client:
            self.assertEqual(client.post('/roadmap', json={}).status_code, 404)
            self.assertEqual(len(client.get('/courses').json()), 2)
            self.assertEqual(len(client.get('/openapi.json').json()['paths']), 7)

    def test_all_ten_pathways_resolve_to_persistable_courses(self):
        courses = self.client.get('/courses').json()
        self.assertEqual(len(courses), 32)
        ids = {item['id'] for item in courses}
        self.assertTrue(all(set(item) == {'id', 'title', 'skill', 'difficulty', 'lesson', 'practical_task'} for item in courses))
        student = self.client.post('/profile', json=PROFILE).json()['student_id']
        for career in json.loads((self.data / 'careers.json').read_text()):
            response = self.plan(career['career_id'])
            self.assertEqual(response.status_code, 200, response.text)
            plan = response.json()
            self.assertEqual(len(plan['modules']), 3)
            self.assertTrue(all(week['planned_hours'] <= PROFILE['weekly_learning_hours'] for week in plan['weekly_plan']))
            for module in plan['modules']:
                self.assertIn(module['module_id'], ids)
                saved = self.client.post('/progress', json={'student_id': student, 'course_id': module['module_id'], 'completed': True})
                self.assertEqual(saved.status_code, 200, saved.text)
        state = json.loads(self.settings.storage_file.read_text())
        self.assertEqual(len(state['progress']), 30)
        create_app(self.settings)
        self.assertEqual(len(json.loads(self.settings.storage_file.read_text())['progress']), 30)

    def test_profile_changes_weekly_allocation(self):
        fast = self.plan(profile={**PROFILE, 'weekly_learning_hours': 8}).json()
        slow = self.plan(profile={**PROFILE, 'weekly_learning_hours': 1}).json()
        self.assertLess(fast['estimated_learning_time']['estimated_weeks'], slow['estimated_learning_time']['estimated_weeks'])

    def test_unknown_career_and_invalid_body(self):
        self.assertEqual(self.plan('missing-career').status_code, 404)
        self.assertEqual(self.client.post('/roadmap', json={'profile': PROFILE, 'career_id': 'solar-technician', 'role': 'teacher'}).status_code, 422)
        self.assertEqual(self.plan(profile={**PROFILE, 'weekly_learning_hours': True}).status_code, 422)

    def test_invalid_durations_fail_before_engine_and_health_stays_up(self):
        path = self.data / 'career_learning_modules.json'
        original = path.read_text()
        for value in (float('inf'), float('nan'), -1, 0, True, 101):
            data = json.loads(original); data['courses'][0]['estimated_hours'] = value
            path.write_text(json.dumps(data))
            with patch('app.career_engine.generate_learning_roadmap') as engine:
                self.assertEqual(self.plan().status_code, 503)
                engine.assert_not_called()
            self.assertEqual(self.client.get('/health').status_code, 200)

    def test_missing_mapping_and_corrupt_catalog_fail_closed(self):
        path = self.data / 'practice_courses.json'
        data = json.loads(path.read_text()); data.pop(0); path.write_text(json.dumps(data))
        self.assertEqual(self.plan().status_code, 503)
        path.write_text('{')
        self.assertEqual(self.client.get('/courses').status_code, 503)

    def test_secure_route_requires_verified_actor(self):
        with patch('app.main.create_store'), patch('app.identity_store.IdentityStore') as ids:
            ids.return_value.ensure_user.return_value = Principal(STUDENT, 'student')
            app = create_app(secure_settings(enable_learning_routes=True))
            app.state.authenticator = MagicMock()
            app.state.authenticator.verify.return_value = STUDENT
            with TestClient(app, **CLIENT_OPTIONS) as client:
                body = {'profile': PROFILE, 'career_id': 'solar-technician'}
                self.assertEqual(client.post('/roadmap', json=body).status_code, 401)
                self.assertEqual(client.post('/roadmap', json=body, headers={'Authorization': 'Bearer test'}).status_code, 200)

    def test_unexpected_engine_failure_is_sanitized(self):
        with patch('app.career_engine.generate_learning_roadmap', side_effect=RuntimeError('PRIVATE details')):
            response = self.plan()
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('PRIVATE', response.text)
