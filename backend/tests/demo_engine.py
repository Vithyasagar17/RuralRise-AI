"""Print a small deterministic recommendation and roadmap demo.

From the repository root, run:
    python -m backend.tests.demo_engine
"""

import json
from pathlib import Path

from backend.app.career_engine import (
    generate_learning_roadmap,
    load_careers,
    load_courses,
    recommend_careers,
)

HERE = Path(__file__).resolve().parent
with (HERE / "example_profiles.json").open("r", encoding="utf-8") as file:
    profiles = json.load(file)["profiles"]

careers = load_careers()
courses = load_courses()
profile = next(item for item in profiles if item["profile_id"] == "class10_practical_technical")
result = recommend_careers(profile, careers, top_k=3)
print("TOP CAREER RECOMMENDATIONS")
print(json.dumps(result, ensure_ascii=False, indent=2))

if result["careers"]:
    chosen = result["careers"][0]
    roadmap = generate_learning_roadmap(profile, chosen["career_id"], courses)
    print("\nLEARNING ROADMAP FOR TOP MATCH")
    print(json.dumps(roadmap, ensure_ascii=False, indent=2))
