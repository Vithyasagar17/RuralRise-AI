# Member 2 AI Engine — Integration Note for the Stage 2 Backend

This component has been merged into the Member 3 Stage 2 backend package. The shared `/recommendations` endpoint keeps its existing six-field `CareerRecommendation` response shape. The internal engine returns a richer result envelope; `backend/app/main.py` deliberately projects each record to the existing API contract. No new HTTP route has been added for roadmaps, because the existing Stage 2 API contract specifies seven routes only. Member 3 should agree a roadmap endpoint/request schema with the team before exposing it.

Dataset compatibility: `backend/data/careers.json` is a top-level array because Member 3's `read_catalog()` requires an array with `id` and `title`. Each record has matching `id` and `career_id` values. The existing `backend/data/courses.json` has been preserved unchanged because `GET /courses` and progress tracking require its strict six-field schema and existing demo course IDs. The AI roadmap modules live in the new `backend/data/career_learning_modules.json`.

The source package includes standalone recommendation and roadmap functions; only recommendations are currently exposed via HTTP. All career and roadmap data remains starter prototype content and requires content verification by Member 4.

---

# RuralRise AI: AI engine integration guide

## 1. What is included

This component provides a deterministic career recommender and a learning-roadmap builder. It belongs in the shared repository; it is not a second backend and it does not start an HTTP server by itself.

Files in this handoff:

- `backend/app/career_engine.py` — public Python functions and JSON loaders.
- `backend/data/careers.json` — ten starter career records and rule tags.
- `backend/data/career_learning_modules.json` — thirty internal prototype learning modules.
- `backend/tests/test_career_engine.py` — unit tests built with `unittest`.
- `backend/tests/example_profiles.json` — five reusable sample student profiles.
- `backend/tests/expected_profile_results.json` — observed top-three outputs from this version for the five sample profiles.
- `backend/tests/demo_engine.py` — prints a recommendation result and the chosen career's roadmap.
- `backend/tests/demo_output.json` — machine-readable example result and roadmap output for this merged dataset.
- `docs/scoring-algorithm.md` — score formula and limitations.

`backend/app/__init__.py` is intentionally empty. If the shared repository already has one, preserve the team's file instead of blindly replacing it.

## 2. Runtime and dependencies

- Python 3.10 or newer is required because the source uses modern Python type-hint syntax.
- The engine and tests use only the Python standard library. There is no mandatory `pip install` step for this component.
- FastAPI/Pydantic/Uvicorn are owned by Member 3's backend. The engine returns plain dictionaries and lists that can be returned from a FastAPI endpoint or validated with the team's Pydantic schemas.
- No environment variables, API key, database, GPU, LLM, or network access is required.

From the shared repository root, check Python with `python --version`. On Windows, if `python` is not recognised, try `py --version` and use `py` instead of `python` in the commands below.

## 3. Files and repository placement

Copy/merge files into the matching paths, never into a nested duplicate such as `ruralrise-ai/ruralrise-ai/backend/...`:

```text
ruralrise-ai/
├── backend/
│   ├── app/
│   │   ├── __init__.py                 # included; preserve an existing team version
│   │   └── career_engine.py            # add this module
│   ├── data/
│   │   ├── careers.json                # top-level career array; coordinate content with Member 4
│   │   ├── courses.json                # Member 3's API/progress catalog; preserved unchanged
│   │   └── career_learning_modules.json # richer modules used by the roadmap generator
│   └── tests/
│       ├── test_career_engine.py       # add this test module
│       ├── example_profiles.json       # add sample data
│       └── demo_engine.py              # add demo script
└── docs/
    ├── scoring-algorithm.md            # add this document
    └── ai-engine-integration.md        # add this document
```

This tree describes the component deliverables, not proof that every folder exists in the team's remote repository. Check `git status` and existing files before copying. Career and course data may be jointly owned with Member 4; resolve those files with Member 4 instead of overwriting the team's latest content.

## 4. Run the tests

Open PowerShell in the **repository root** (the folder containing `backend/`). First check the Python version. The standalone engine suite contains 14 tests. To run the entire merged backend suite, set the backend import path first, then run discovery:

```powershell
$env:PYTHONPATH = (Resolve-Path 'backend').Path
python -m unittest discover -s backend/tests -v
```

For the combined package as built, 74 tests were discovered: 52 passed and 22 were skipped because real PostgreSQL credentials or optional PostgreSQL test dependencies were not configured. See `docs/member2-integration-test-results.txt`. Rerun tests after merging with the team's live repository.

Run the demo from the repository root:

```powershell
python -m backend.tests.demo_engine
```

It prints the top career recommendations for the Class 10 technical sample profile, followed by a roadmap for the top match. Output order and scores are deterministic for an unchanged dataset and input. The stored `backend/tests/expected_profile_results.json` shows the observed top-three results for all five sample profiles when this package was built; rerun the command and tests after editing the career/course data.

There is no web URL to open when running the component alone: it is a Python module. Member 3's FastAPI service is responsible for exposing routes to the frontend.

## 5. Public interfaces

### `load_careers(path=None)`

Loads and minimally validates `careers.json`. `path` is an optional filesystem path, mainly useful in tests. Returns a list of career dictionaries. It raises `FileNotFoundError` for a missing file and `ValueError` for invalid JSON or a malformed top-level dataset.

### `load_courses(path=None)`

Loads `backend/data/career_learning_modules.json`. Returns the entire roadmap dataset dictionary, including the `courses` list. The existing `courses.json` is deliberately reserved for Member 3's `/courses` API and progress contract. It raises `FileNotFoundError` or `ValueError` when data cannot be loaded or has the wrong basic structure.

### `recommend_careers(profile, careers=None, top_k=3)`

- `profile`: mapping with optional `education_level`, `interests`, `skills`, `goals`, `preferred_learning`, and `weekly_learning_hours`. `name` is not required for matching.
- `careers`: optional list of career objects, or an object containing a `careers` list. If omitted, the default JSON file is loaded.
- `top_k`: positive integer, defaults to 3.
- Returns a JSON-compatible object with `careers`, `warnings`, `message`, and `score_note`.
- `ValueError` is raised for invalid `top_k` or a malformed explicit `careers` argument. Common profile-field errors are instead handled with warnings and safe defaults.

### `generate_learning_roadmap(profile, career, courses=None)`

- `profile`: same profile shape; `weekly_learning_hours` controls weekly scheduling. If omitted or invalid, a planning default of 3 hours is used with a warning.
- `career`: a career dictionary returned by the recommender, or a stable career ID such as `solar-technician`.
- `courses`: optional list of course modules, or the full dataset object with a `courses` list. If omitted, the default dataset is loaded.
- Returns a JSON-compatible object with `career_id`, `career_title`, `learning_goals`, `required_skills`, `missing_skills`, `modules`, `weekly_plan`, `estimated_learning_time`, `assessment_criteria`, `next_steps`, and `warnings`.
- Raises `ValueError` when a career ID cannot be found or the explicit course input is malformed.

## 6. Input contract

Example profile body (the `name` is optional):

```json
{
  "education_level": "Class 12",
  "location": "Tamil Nadu",
  "language": "Tamil",
  "interests": ["electronics", "hands-on work"],
  "skills": ["basic mathematics"],
  "preferred_learning": "practical",
  "weekly_learning_hours": 5,
  "goals": ["find vocational training"]
}
```

Accepted profile fields:

- `education_level`, `location`, `language`, `preferred_learning`: optional strings.
- `interests`, `skills`, `goals`: optional list of strings. A single string is accepted as a one-item list with a warning.
- `weekly_learning_hours`: optional positive number; invalid or missing values result in a 3-hour planning default and a warning.
- `name`: optional string; it is not part of the score.

The engine does not save profiles. Persistence and privacy controls, if required, belong to the backend/database team.

## 7. Example use from the backend (Member 3)

Member 3 can import the functions inside `backend/app/main.py` when launching Uvicorn from the `backend/` directory:

```python
from app.career_engine import (
    recommend_careers,
    generate_learning_roadmap,
    load_careers,
    load_courses,
)

careers = load_careers()
courses = load_courses()

# Inside a FastAPI endpoint, after validating the request with the team's Pydantic model:
result = recommend_careers(student_profile.model_dump(), careers=careers, top_k=3)

# After the frontend/user chooses a returned career:
roadmap = generate_learning_roadmap(
    student_profile.model_dump(),
    career_id,
    courses=courses,
)
```

The snippet illustrates the function calls; it is not a complete endpoint and does not create a route. If Member 3 uses a Pydantic version where `model_dump()` is unavailable, check the project's installed version and use the compatible model-to-dictionary method already standardised in `backend/app/main.py`. Do not add a separate backend app.

Suggested request/response agreement (route names are **not implemented by this component** and must be agreed by Member 3):

- Recommendation request: the student profile object above.
- Recommendation response: the complete return dictionary from `recommend_careers`.
- Roadmap request: student profile plus selected `career_id`.
- Roadmap response: the complete return dictionary from `generate_learning_roadmap`.

Member 3 should make the Pydantic schemas match the actual return fields, decide the REST paths, and return the function result from FastAPI. Frontend route names and data contracts must match Member 3's final API specification.

## 8. Environment and configuration

The engine requires **no component-specific environment variables**. It reads the two JSON data files using paths relative to `career_engine.py`, so its default data location does not depend on the terminal's current working directory. No `.env` entries are needed for this deterministic version.

The optional LLM layer has not been implemented. Do not add a placeholder API key or expose any secret in frontend code.

## 9. Data ownership and coordination

- Member 2 (this component): recommendation and roadmap functions, scoring logic, and tests.
- Member 3: FastAPI routes, Pydantic API schemas, endpoint error handling, persistent storage, and backend configuration.
- Member 4: review/verification of career taxonomy, education prerequisites, course content, and real opportunity data.
- Member 1: React forms/screens and frontend request/response handling.
- Member 5: integration test coordination, accessibility/offline expectations, and facilitator-facing requirements.

Coordinate the career records in `careers.json` with Member 4. Do not replace Member 3's `courses.json`: the existing `/courses` route and progress tests require its six-field shape and demo IDs. The roadmap generator uses the separate `career_learning_modules.json`; Member 4 should review both content sources before finalisation.

## 10. Known limitations

1. Career tags and learning modules are starter content written for a prototype; they are not externally verified or accredited courses and are not live opportunity listings.
2. Matching uses normalised phrase overlap, not semantic similarity, and will miss synonyms not represented in the JSON tags.
3. Scores and weights have not been scientifically validated. Do not display a score as probability, employability, or job-placement chance.
4. The starter career dataset intentionally has no verified mandatory minimum education level. The engine can handle a recorded mandatory prerequisite if the data team verifies and adds one.
5. Required-skill gaps are inferred by comparing the skills a student chose to report. An unreported skill is not necessarily a skill the student lacks.
6. Authentication, database persistence, official opportunity verification, multilingual translation, and LLM enrichment are outside this component.
7. Offline operation of these pure Python functions is possible when the code and JSON files are present, but the browser PWA/offline experience is owned and must be tested by the frontend/offline team.

## 11. Suggested integration sequence

1. Pull the team's latest branch and create a feature branch for this integration.
2. Compare the destination JSON files with Member 4's working versions.
3. Add `career_engine.py`, unit tests, example profiles, and docs; merge the JSON fields rather than overwriting team curation.
4. Run the `unittest` command from the repository root.
5. Start the existing FastAPI application using Member 3's documented command; do not create a competing `main.py`.
6. Have Member 3 wire the functions into the agreed endpoints and validate responses against `schemas.py`.
7. Have Member 1 call those endpoints with the agreed request shapes.
8. Test a complete profile, an incomplete profile, and each non-technology pathway.
9. Review prerequisite statements and course content with Member 4.
10. Commit and push the feature branch, open a pull request, and merge only after the team's tests pass.

## 12. Git commands (run from the shared repository root)

Use the actual team branch name if one has already been agreed. Replace `feature/ai-career-engine` if needed.

```powershell
git status
git pull --ff-only origin main
git switch -c feature/ai-career-engine
# Copy/merge the component files, then inspect changes:
git status
git diff -- backend/app/career_engine.py backend/app/main.py backend/data/careers.json backend/data/career_learning_modules.json backend/tests/test_api.py
git diff --check
python -m unittest discover -s backend/tests -v
git add backend/app/career_engine.py backend/app/main.py backend/data/careers.json backend/data/career_learning_modules.json backend/tests/test_api.py backend/tests/test_career_engine.py backend/tests/example_profiles.json backend/tests/expected_profile_results.json backend/tests/demo_engine.py backend/tests/demo_output.json docs/scoring-algorithm.md docs/ai-engine-integration.md docs/api-contracts.md
git commit -m "Add deterministic career recommendation engine"
git push -u origin feature/ai-career-engine
```

Do not run `git add` blindly if team data files contain other people's unreviewed changes. Use `git diff` and `git status` first. Open a pull request on GitHub and request review from Members 3 and 4. Do not force-push or merge into `main` without the team's approval.
