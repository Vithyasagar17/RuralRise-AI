# API contracts — backend proposal 0.1.0

> Current authentication/access candidate: see `auth-contract-proposal.md` and `../MEMBER2_REVIEW_START_HERE.md`. Default demo mode preserves these original methods/bodies. Required secure-mode headers and optional account reads remain opt-in proposals pending team review.

> Stage 2 keeps every endpoint path and request/response schema below. Storage can now be selected with `STORAGE_BACKEND=json|postgres`; `backend/.env` is loaded automatically. Database failures still return the existing sanitized 503 response, and /health remains liveness only. See `../STAGE2_SETUP.md`. Extra profile/progress/facilitator API proposals still require team review; no new routes were added.

Base URL: `http://127.0.0.1:8000`. Interactive documentation: `/docs`. Machine-readable schemas: `/openapi.json`. All POST bodies use `Content-Type: application/json`. These documents describe actual code; some shapes remain pending team approval as identified below.

| Method/path | Success | Request | Response | Contract source |
| --- | --- | --- | --- | --- |
| GET /health | 200 | None | `{"status":"ok"}` | Path specified; body proposed |
| POST /profile | 201 | StudentProfile | `{"student_id":"<UUID>","profile":{...}}` | Profile fields specified; envelope permitted by prompt and proposed here |
| POST /recommendations | 200 | StudentProfile | `{"careers":[...]}` | Specified fields preserved |
| GET /courses | 200 | None | Array of Course | Path specified; data shape proposed |
| GET /opportunities | 200 | Optional query filters | Array of Opportunity | Fields based on supplied example; array envelope proposed |
| POST /progress | 200 | ProgressUpdate | `{"saved":true,"progress":{...}}` | Path specified; fields/envelope proposed |
| GET /facilitator/students | 200 | None | `{"students":[{"student_id":"...","profile":{...},"progress":[]}]}` | Path specified; fictional response shape proposed |

## StudentProfile

```json
{
  "name": "Demo Student",
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

All fields except `skills` and `goals` are required. Those two default to empty lists. Text fields/list items trim whitespace and require 1–200 characters. Lists have at most 30 items; interests needs at least one. Learning hours is a strict integer from 1 to 168; strings/floats/booleans are rejected. Education, location, language and preferred_learning are open text, not invented enums. Extra fields are rejected with 422. No email, telephone, caste, income or precise address is required.

## Career response

`POST /recommendations` uses the deterministic Member 2 career engine. The endpoint returns the established response contract: a `careers` array, where each record contains exactly `career_id`, `title`, `match_score`, `reasons`, `missing_skills`, and `next_steps`. Internal diagnostic fields such as `warnings`, `message`, `score_note`, matched tags, and prerequisite metadata are not currently exposed by the six-field API response model.

Example (illustrative; exact scores and rankings depend on the submitted profile and current career dataset):

```json
{
  "careers": [
    {
      "career_id": "solar-technician",
      "title": "Solar PV Technician",
      "match_score": 100,
      "reasons": [
        "Interest match: hands-on work, electrical systems, renewable energy.",
        "Related existing skills: basic mathematics.",
        "Goal alignment: find vocational training.",
        "The practical learning preference is supported by this pathway's learning modes."
      ],
      "missing_skills": [
        "electrical safety",
        "basic circuit knowledge",
        "safe tool handling"
      ],
      "next_steps": [
        "Start by learning: electrical safety."
      ]
    }
  ]
}
```

Match scores are rule-based profile-fit indicators from 0 to 100. They are not probabilities of success or employment. The current core engine is deterministic and does not require an LLM. The career catalog is starter prototype data and requires review; recommendations do not verify live opportunities or official eligibility.

## Learning roadmap function

Member 2's internal Python function `generate_learning_roadmap(profile, career, courses=None)` is available for backend integration. It returns structured learning goals, ordered modules, a weekly plan, estimated study time, assessment criteria, next steps and warnings. A public roadmap HTTP endpoint is not currently defined; Member 3 should coordinate its request/response contract with Members 1, 2 and 4 before adding a route. The roadmap generator reads `backend/data/career_learning_modules.json`, not the current API catalog `backend/data/courses.json`.

## Courses

`GET /courses` returns an array (no wrapper). First fixture:

```json
{
  "id": "demo-safety",
  "title": "Demo: Recognising electrical hazards",
  "skill": "safety awareness",
  "difficulty": "beginner",
  "lesson": "Fictional prototype lesson. Stay away from exposed wires and report hazards to a trained adult. Never touch or practise on live electrical equipment. This is not professional training.",
  "practical_task": "On paper, list three situations where you would ask a trained professional for help."
}
```

All six fields required. `id` is 1–80 ASCII letters/digits/underscores/hyphens, beginning with an alphanumeric character. Difficulty is beginner/intermediate/advanced. Lesson length 1–20000; task 1–2000. Titles/skills use the short text rules above. Dataset IDs must be unique. Member 4 must review this proposed shape before replacing fixtures.

## Opportunities

`GET /opportunities?category=training&education_level=Class%2012&location=Tamil%20Nadu&search=practical` returns an array containing this fictional record:

```json
{
  "id": "demo-training-001",
  "title": "FICTIONAL DEMO: Practical learning programme",
  "category": "training",
  "description": "Mock record for API integration only. No real programme, provider, deadline or eligibility has been verified.",
  "education_levels": ["Class 12"],
  "locations": ["Tamil Nadu"],
  "eligibility_requirements": [],
  "deadline": null,
  "official_url": "",
  "source_name": "Fictional backend fixture",
  "last_verified": null
}
```

All displayed keys are required in each dataset record. `id` follows identifier rules. Description 1–5000 characters. Title/category and text lists follow short text rules. Deadline/last_verified are string or null; URL/source are strings. Dates and URL validity are not checked in this prototype; Member 4 must verify real records. Unknown dates stay null, unknown URL stays empty. Empty eligibility_requirements does not establish eligibility.

Filters are combined with AND. Category, education level and location compare exact text after case folding/whitespace trimming; search is a case-insensitive substring in title and description. Education/locations are literal catalog tags, not synonym expansion, nationwide matching or an eligibility engine. Empty education/location lists mean unknown and do not match supplied education/location filters. No filters returns all records. No match returns `[]`. Supplied query strings require 1–200 characters; unknown query keys follow FastAPI's default behavior and are ignored. A whitespace-only filter is not a useful search; clients should omit blank inputs.

## Progress

```json
{
  "student_id": "demo-student-001",
  "course_id": "demo-safety",
  "completed": true,
  "score": 80
}
```

student_id/course_id and completed are required. IDs follow identifier rules. completed is a strict boolean; score is optional/null or a strict integer 0–100. No additional fields accepted. A student must be a saved profile ID or one of the two fictional demo IDs; course must exist in the courses catalog. Unknown IDs return 404.

Response example (timestamp illustrative):

```json
{
  "saved": true,
  "progress": {
    "student_id": "demo-student-001",
    "course_id": "demo-safety",
    "completed": true,
    "score": 80,
    "updated_at": "2026-10-17T12:00:00+00:00"
  }
}
```

Timestamp is generated server-side in UTC. Updates replace the record for that student/course. Null/omitted score replaces a previously saved score with null. `completed=false` can revert completion. This is current-state storage, not an offline event log. Repeated updates are duplicate-safe by key but not byte-identical due to timestamps. Profile POST has no retry deduplication.

## Errors and backend outages

| Status | Meaning | Client handling |
| --- | --- | --- |
| 404 | Unknown student/course, or unspecified route | Refresh available IDs; show a clear message |
| 422 | Missing/invalid JSON, field types, extra fields | Show validation errors and retain form inputs |
| 503 | Dataset missing/corrupt; storage failure; engine exception/invalid output | Show unavailable state; retain pending progress for a user-controlled retry |
| 500 | Unexpected backend exception | Show error; inspect server logs; do not claim saved |

HTTP errors use `{"detail":"..."}`. Validation errors use `{"detail":[{"loc":["body","name"],"msg":"Field required","type":"missing"}]}`. This is an illustrative validation message; exact text can depend on Pydantic. Raw input values and internal exception details are excluded. Network connection failures have no HTTP response and must be caught by Member 1's service layer. Never display a fake success on failure.

CORS defaults to `http://localhost:5173` and `http://127.0.0.1:5173`; credentials are disabled. Explicit origins can be configured via CORS_ORIGINS. CORS does not provide authentication. No Authorization header, cookie or API token is needed for this fictional local prototype.
