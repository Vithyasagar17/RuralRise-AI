"""Unit tests for RuralRise AI's deterministic recommendation engine.

Run from the repository root with:
    python -m unittest discover -s backend/tests -v
"""

import json
import unittest
from pathlib import Path

from backend.app.career_engine import (
    generate_learning_roadmap,
    load_careers,
    load_courses,
    recommend_careers,
)

ROOT = Path(__file__).resolve().parents[2]
PROFILE_FILE = Path(__file__).with_name("example_profiles.json")


def example_profiles():
    with PROFILE_FILE.open("r", encoding="utf-8") as file:
        return {item["profile_id"]: item for item in json.load(file)["profiles"]}


class CareerEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.careers = load_careers()
        cls.courses = load_courses()
        cls.profiles = example_profiles()

    def test_dataset_has_ten_careers_and_thirty_modules(self):
        self.assertEqual(len(self.careers), 10)
        self.assertEqual(len(self.courses["courses"]), 30)

    def test_practical_technical_profile_includes_solar_pathway(self):
        result = recommend_careers(self.profiles["class10_practical_technical"], self.careers)
        ids = [item["career_id"] for item in result["careers"]]
        self.assertTrue(result["careers"])
        self.assertIn("solar-technician", ids)
        self.assertTrue(all(0 <= item["match_score"] <= 100 for item in result["careers"]))

    def test_electronics_profile_includes_electronics_technician(self):
        result = recommend_careers(self.profiles["class12_electronics"], self.careers)
        self.assertIn("electronics-technician", [item["career_id"] for item in result["careers"]])

    def test_agriculture_profile_includes_agri_tech(self):
        result = recommend_careers(self.profiles["agriculture_sustainability"], self.careers)
        self.assertIn("agriculture-assistant", [item["career_id"] for item in result["careers"]])

    def test_design_profile_includes_graphic_designer(self):
        result = recommend_careers(self.profiles["art_and_design"], self.careers)
        self.assertIn("graphic-designer", [item["career_id"] for item in result["careers"]])

    def test_missing_skill_gaps_are_returned(self):
        result = recommend_careers(self.profiles["class12_electronics"], self.careers)
        electronics = next(item for item in result["careers"] if item["career_id"] == "electronics-technician")
        self.assertIn("safe tool handling", electronics["missing_skills"])
        self.assertIsInstance(electronics["reasons"], list)

    def test_incomplete_profile_does_not_crash_and_is_marked_low_evidence(self):
        result = recommend_careers(self.profiles["incomplete_profile"], self.careers)
        self.assertIsInstance(result["careers"], list)
        if result["careers"]:
            self.assertTrue(all(item["evidence_strength"] == "limited" for item in result["careers"]))
        self.assertTrue(any("one matching-information category" in warning for warning in result["warnings"]))

    def test_empty_profile_requests_more_information(self):
        result = recommend_careers({}, self.careers)
        self.assertEqual(result["careers"], [])
        self.assertIn("Add at least one", " ".join(result["warnings"]))

    def test_malformed_profile_is_handled_gracefully(self):
        result = recommend_careers({"interests": 42, "skills": "basic mathematics", "weekly_learning_hours": -5}, self.careers)
        self.assertIn("careers", result)
        self.assertTrue(result["warnings"])

    def test_roadmap_is_ordered_and_respects_weekly_hours(self):
        profile = self.profiles["class10_practical_technical"]
        career = next(item for item in self.careers if item["career_id"] == "solar-technician")
        roadmap = generate_learning_roadmap(profile, career, self.courses)
        self.assertEqual([m["module_id"] for m in roadmap["modules"]], ["solar-001", "solar-002", "solar-003"])
        self.assertGreater(roadmap["estimated_learning_time"]["total_hours"], 0)
        for week in roadmap["weekly_plan"]:
            self.assertLessEqual(week["planned_hours"], profile["weekly_learning_hours"] + 0.001)
        self.assertEqual(roadmap["career_id"], "solar-technician")

    def test_roadmap_can_resolve_career_by_id(self):
        profile = self.profiles["art_and_design"]
        roadmap = generate_learning_roadmap(profile, "graphic-designer")
        self.assertEqual(roadmap["career_id"], "graphic-designer")
        self.assertTrue(roadmap["modules"])

    def test_roadmap_accepts_the_recommendation_result_object(self):
        profile = self.profiles["class12_electronics"]
        result = recommend_careers(profile, self.careers)
        chosen = result["careers"][0]
        roadmap = generate_learning_roadmap(profile, chosen, self.courses)
        self.assertEqual(roadmap["career_id"], chosen["career_id"])
        self.assertTrue(roadmap["required_skills"])
        self.assertTrue(roadmap["modules"])

    def test_recorded_mandatory_education_prerequisite_is_not_silently_ignored(self):
        profile = {"education_level": "Class 10", "interests": ["coding"], "skills": [], "goals": []}
        career = [{
            "career_id": "test-career",
            "title": "Test Career",
            "interests": ["coding"],
            "relevant_skills": [],
            "required_skills": [],
            "goal_tags": [],
            "learning_preferences": [],
            "education_prerequisites": {
                "minimum_level": "Class 12",
                "mandatory": True,
                "notes": "Test-only requirement."
            },
            "practical_next_steps": [],
            "opportunity_categories": []
        }]
        result = recommend_careers(profile, career)
        self.assertEqual(result["careers"][0]["prerequisite_status"], "not_met")
        self.assertTrue(result["careers"][0]["prerequisites"])

    def test_top_k_must_be_positive_integer(self):
        with self.assertRaises(ValueError):
            recommend_careers(self.profiles["class12_electronics"], self.careers, top_k=0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
