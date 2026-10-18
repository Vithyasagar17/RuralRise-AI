"""Actual Member 2/API compatibility and malformed provider-result regressions."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from app.config import BACKEND_DIR, Settings
from app.database import demo_profiles
from app.main import create_app
from app.recommendation_adapter import PUBLIC_FIELDS, public_recommendations
from inprocess_loop import InProcessEventLoop

HERE = Path(__file__).resolve().parent
PROFILE = demo_profiles()[0]['profile']


class Member2BoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='.member2-api-', dir=BACKEND_DIR)
        self.addCleanup(self.temporary.cleanup)
        self.client = TestClient(create_app(Settings(BACKEND_DIR/'data', Path(self.temporary.name)/'store.json', ())),
            backend_options={'loop_factory': InProcessEventLoop})
        self.addCleanup(self.client.close)

    def test_four_real_profiles_match_the_supplied_expected_rankings(self):
        profiles = json.loads((HERE/'example_profiles.json').read_text(encoding='utf-8'))['profiles']
        expected = {row['profile_id']: row for row in json.loads(
            (HERE/'expected_profile_results.json').read_text(encoding='utf-8'))['results']}
        for profile in profiles[:4]:
            with self.subTest(profile=profile['profile_id']):
                body = {key:value for key,value in profile.items() if key != 'profile_id'}
                response = self.client.post('/recommendations', json=body)
                self.assertEqual(response.status_code, 200)
                rows = response.json()['careers']
                recorded = expected[profile['profile_id']]['recommendations']
                self.assertEqual([(r['career_id'],r['match_score']) for r in rows],
                                 [(r['career_id'],r['match_score']) for r in recorded])
                for row in rows:
                    self.assertEqual(set(row), set(PUBLIC_FIELDS))

    def test_rich_envelope_projects_only_public_fields(self):
        row = dict(career_id='test-career', title='Test Career', match_score=77,
            reasons=['One reason'], missing_skills=[], next_steps=['One step'],
            evidence_strength='PRIVATE-INTERNAL-DIAGNOSTIC')
        with patch('app.career_engine.recommend_careers', return_value={
            'careers':[row], 'score_note':'Fit indicator', 'warnings':['PRIVATE-WARNING'], 'message':'Internal'}):
            response = self.client.post('/recommendations', json=PROFILE)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), {'careers'})
        self.assertEqual(set(response.json()['careers'][0]), set(PUBLIC_FIELDS))
        self.assertNotIn('PRIVATE', response.text)

    def test_legacy_list_still_works_with_the_same_public_model(self):
        row = dict(career_id='test-career', title='Test Career', match_score=1,
            reasons=[], missing_skills=[], next_steps=[])
        self.assertEqual(public_recommendations([row]).model_dump(), {'careers':[row]})

    def test_malformed_envelopes_records_and_scores_are_unavailable(self):
        valid = dict(career_id='test-career', title='Test Career', match_score=1,
            reasons=[], missing_skills=[], next_steps=[])
        malformed = [None, 'invalid', {'careers':[]}, {'careers':{},'score_note':'x'},
            {'careers':[None],'score_note':'x'}, {'careers':[{}],'score_note':'x'},
            {'careers':[{**valid,'match_score':101}],'score_note':'x'},
            {'careers':[{**valid,'match_score':True}],'score_note':'x'},
            {'careers':[{**valid,'reasons':'PRIVATE-RAW-ERROR'}],'score_note':'x'}]
        for result in malformed:
            with self.subTest(result=result), patch('app.career_engine.recommend_careers', return_value=result):
                response = self.client.post('/recommendations', json=PROFILE)
                self.assertEqual(response.status_code, 503)
                self.assertNotIn('PRIVATE', response.text)

    def test_valid_nonmatching_profile_returns_an_honest_empty_list(self):
        body = {**PROFILE, 'interests':['unmatched-example-term'], 'skills':[], 'goals':[],
                'preferred_learning':'unmatched-learning-mode'}
        response = self.client.post('/recommendations', json=body)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'careers':[]})

    def test_http_keeps_strict_profile_rules_despite_lenient_internal_engine(self):
        for changes in ({'interests':[]}, {'name':None}, {'skills':'math'}, {'weekly_learning_hours':2.5},
                        {'profile_id':'internal-sample-only'}):
            with self.subTest(changes=changes):
                self.assertEqual(self.client.post('/recommendations',json={**PROFILE,**changes}).status_code,422)

    def test_all_starter_career_module_references_resolve(self):
        careers = json.loads((BACKEND_DIR/'data/careers.json').read_text(encoding='utf-8'))
        modules = json.loads((BACKEND_DIR/'data/career_learning_modules.json').read_text(encoding='utf-8'))['courses']
        by_id = {m['module_id']:m for m in modules}
        self.assertEqual(len(by_id), len(modules))
        for career in careers:
            self.assertEqual(career['id'], career['career_id'])
            for module_id in career['learning_modules']:
                self.assertIn(module_id, by_id)
                self.assertIn(career['career_id'], by_id[module_id]['career_ids'])
