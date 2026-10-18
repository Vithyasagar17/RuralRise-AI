# RuralRise AI — Member 3 integration handoff

> This is the original Stage 1 handoff. The Stage 2 database release is documented in `../STAGE2_SETUP.md` and `stage2-handoff.md`. Those supersede this document's statements that PostgreSQL is unwired or .env is not loaded. Stage 1 test logs are historical. Stage 2 test evidence is stored separately. Do not run the old database/schema.sql scaffold for Stage 2.

Prepared 17 October 2026. Scope: the new backend package supplied with this document. The shared GitHub repository and teammate implementations were not available for inspection. No team repository, remote branch or existing teammate file was modified. Examples use fictional learners only.

## 1. Component overview

Member 3 owns backend, database and integration. This package supplies a runnable FastAPI application with all seven requested endpoint paths, Pydantic validation, CORS, JSON catalogs, persistent local profile/progress storage, error handling, temporary engine adapters and independent tests.

Implemented: health, profile creation, recommendation adapter/output validation, course listing, opportunity filters, progress upserts and fictional facilitator overview. Profiles and progress survive a server restart on the same filesystem. The backend runs independently without a frontend, database account, external AI provider or API key.

Partial: database work is local JSON plus a proposed PostgreSQL schema; career/opportunity integrations are mock boundaries. Facilitator data is limited to built-in fictional identities. Production authorization and a real teacher relationship model are absent.

Not implemented: real career matching, personalised roadmaps, LLM calls, verified opportunities, authentication, real student access control, PostgreSQL/Supabase connection, frontend, voice, service worker, offline queue, deployment or paid modules. See section 14 and the supplied logs for test evidence.

## 2. Files created

Every supplied file is new in this workspace. Paths are relative to `ruralrise-ai/`. “Review” means coordinate before copying into an existing team repository; it does not mean a teammate approved this file.

| File | Purpose/details | Needed for integration? | Ownership/edit considerations |
| --- | --- | --- | --- |
| README.md | Quick start, test commands, honest status | Yes, merge instructions | Shared root; preserve team README |
| .gitignore | Excludes secrets, environments, runtime data, caches | Merge entries | Shared root; preserve existing rules |
| .env.example | Frontend API URL guidance only | Guidance | Member 1/shared; no frontend code supplied |
| backend/.env.example | Three backend config examples; not automatically loaded | Guidance | Member 3; merge existing settings |
| backend/requirements.txt | Exact tested direct dependency versions | Yes | Member 3; preserve teammate additions |
| backend/app/__init__.py | Marks Python app package | Yes | Member 3 |
| backend/app/config.py | Settings and backend-relative path resolution | Yes | Member 3 |
| backend/app/main.py | FastAPI app factory, seven routes, adapters, errors, CORS | Yes | Member 3/shared integration; merge carefully |
| backend/app/schemas.py | Input/output/catalog/storage models | Yes | Member 3/shared contract; review before changing |
| backend/app/database.py | Atomic single-process JSON storage and fictional identities | Yes | Member 3; callers depend on method behavior |
| backend/app/career_engine.py | Fixed temporary recommendation mock | Until Member 2 adapter replaces it | Member 2 owns real engine; never overwrite it |
| backend/app/opportunity_engine.py | Temporary exact-tag filters; no eligibility claims | Until Member 4 adapter replaces it | Coordinate with Member 4 |
| backend/data/careers.json | Three career labels for recommendation mock | Only for independent demo | Member 4/Member 2 review; do not replace real catalog |
| backend/data/courses.json | Two fictional lesson fixtures | Only for independent demo | Member 4; real modules must match agreed course schema |
| backend/data/opportunities.json | Two explicitly fictional search fixtures | Only for independent demo | Member 4; no researched sources included |
| backend/tests/test_api.py | Automated API/storage/adapter/error/CORS tests | Recommended | Member 3/Member 5; add as new test coverage |
| backend/tests/inprocess_loop.py | Test-only event loop using a threading.Event rather than a socketpair | Required by test_api.py | Tests only; supports no I/O transports; application code unchanged |
| backend/tests/smoke_server.py | Real Uvicorn HTTP test and restart check | Recommended | Member 3/Member 5; requires a free local port |
| database/schema.sql | Proposed PostgreSQL scaffold with foreign keys and RLS | Optional, not needed to run | Shared database; unexecuted and requires review |
| docs/architecture.md | Data flow, component ownership, design limits | Yes | Merge/add documentation |
| docs/api-contracts.md | Exact implemented request/response/error contracts | Yes | Shared contract; proposed gaps clearly identified |
| docs/integration-guide.md | This 20-section handoff | Yes | Merge/add documentation |
| docs/test-results.txt | Recorded independent test results | Evidence | Captured from successful execution transcript; rerun tests to update |
| docs/smoke-results.json | Actual HTTP/restart result | Evidence | Generated by smoke_server.py |
| docs/server-smoke.log | Uvicorn smoke startup/request log | Evidence | Generated by smoke_server.py |
| docs/runtime-versions.txt | Actual verification environment versions | Evidence | Generated from installed metadata |
| docs/file-manifest.json | All packaged source/document paths, sizes and SHA-256 | Evidence | Generated after verification; excludes itself |

No images, frontend assets, credentials, virtual environment, caches, runtime profile store or database dump are included. Adding/replacing real catalogs and adapters requires review with their owners. Documentation and tests can be added under new names if names conflict.

## 3. Existing files modified

None in the shared project: no existing implementation was present locally. New files were iterated during development and testing. This package cannot establish whether any same-named file already exists in the team's GitHub repository. Treat every collision as a merge requiring inspection, not permission to overwrite. Shared ownership is unchanged.

## 4. Exact directory structure

All entries below are supplied. Indentation represents directories; no frontend directory is claimed.

```text
ruralrise-ai/
    README.md
    .gitignore
    .env.example
    backend/
        requirements.txt
        .env.example
        app/
            __init__.py
            config.py
            main.py
            schemas.py
            database.py
            career_engine.py
            opportunity_engine.py
        data/
            careers.json
            courses.json
            opportunities.json
        tests/
            test_api.py
            inprocess_loop.py
            smoke_server.py
    database/
        schema.sql
    docs/
        architecture.md
        api-contracts.md
        integration-guide.md
        test-results.txt
        smoke-results.json
        server-smoke.log
        runtime-versions.txt
        file-manifest.json
```

Runtime-only `backend/var/demo-store.json` appears after the first successful write. It is excluded from Git and this handoff. Tests create temporary directories inside backend and remove them after use. The shared target repository additionally contains Member 1's frontend and Member 5's PWA/facilitator work; those files are not supplied. The SQL file is optional. Existing `App.jsx`, `main.jsx`, `services/api.js`, data, schemas and docs must be merged by their owners when present.

## 5. Dependencies and versions

| Dependency | Verified direct version | Purpose | Requirement |
| --- | --- | --- | --- |
| Python | 3.13.7 | Runtime and stdlib unittest/storage | Mandatory; other Python versions unverified |
| FastAPI | 0.137.1 | REST application, OpenAPI and CORS integration | Mandatory |
| Pydantic | 2.12.5 | Schemas and output validation | Mandatory; version 1 unsupported |
| Uvicorn | 0.49.0 | Local ASGI HTTP server | Mandatory for documented run command |
| HTTPX | 0.28.1 | FastAPI TestClient transport | Test-only; included in requirements for convenience |
| Git | Not checked here | Team branch/PR integration | Needed only for shared repository work |
| PostgreSQL/Supabase | None configured | Future production persistence | Optional, not used by current code |
| Node/React/Vite | Not installed or required by this component | Member 1's frontend | Outside backend scope |

`backend/requirements.txt` pins the four direct Python packages actually installed during verification. Their transitive installed versions are in `docs/runtime-versions.txt`. Install all four with `python -m pip install -r backend/requirements.txt` inside a selected environment. No global package changes are required. These are observed versions, not a claim about latest releases or compatibility with untested runtimes. This environment's preinstalled packages were used; a fresh internet-based pip installation was not executed here.

## 6. Installation instructions

1. Extract the archive into a separate staging folder. Locate the inner `ruralrise-ai` directory containing README.md and backend. Do not extract over the team's working tree.
2. Install Python if necessary, with the command available in PowerShell. This package was verified using Python 3.13.7. Open a new PowerShell window after installation.
3. Open PowerShell in the extracted `ruralrise-ai` folder. Check that `Get-ChildItem` shows backend and docs.
4. Run the following commands one at a time from that root:

```powershell
python --version
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\.venv\Scripts\python.exe -c "import fastapi,pydantic,uvicorn,httpx; print(fastapi.__version__,pydantic.__version__,uvicorn.__version__,httpx.__version__)"
```

If `python` is unavailable but the Windows launcher exists, use `py -3.13 -m venv .venv`; first confirm that runtime is installed with `py -0p`. If pip is missing inside the environment, use `.\.venv\Scripts\python.exe -m ensurepip --upgrade`, then repeat installation. If imports fail, verify that the terminal is in the root and that the same `.venv\Scripts\python.exe` runs installation and the server. If network installation fails, restore network access or use your team's approved wheel cache; do not silently change pinned versions.

Activation is optional. The commands use the environment's interpreter directly, so PowerShell script-execution restrictions do not need to be changed. No Node installation, database setup, Docker, message broker or AI account is needed.

## 7. Run commands

From the extracted `ruralrise-ai` root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Expected observable behavior: Uvicorn starts and logs its listening address. Open `http://127.0.0.1:8000/health` to see `{"status":"ok"}`. Open `http://127.0.0.1:8000/docs` for interactive API requests. `/` has no page and returns 404, which is expected. Stop with Ctrl+C in the server window.

Alternative, from inside `ruralrise-ai/backend` using the environment at the repository root:

```powershell
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Run only one server process/worker for JSON storage. Optional local source reload can be enabled with `--reload`, but was not part of the live smoke check. If port 8000 is busy, stop your existing server or choose another port and coordinate that URL with Members 1 and 5. Frontend users on an Android phone cannot reach the developer PC via the phone's own `127.0.0.1`; agree on reachable test hosting and its CORS origin before mobile integration. Public hosting is not configured by this handoff.

## 8. Environment variables and configuration

No environment variable is mandatory for the default local demo. No secrets are required.

| Variable | Default/example | Scope | Secret? | Missing behavior |
| --- | --- | --- | --- | --- |
| DATA_DIR | `data` | Backend catalog directory | No | Resolves to backend/data |
| STORAGE_FILE | `var/demo-store.json` | Writable backend development store | No; contents may be private | Resolves under backend; file created on first write |
| CORS_ORIGINS | `http://localhost:5173,http://127.0.0.1:5173` | Backend allowed browser origins, comma-separated | No | Allows those two local origins |
| VITE_API_BASE_URL | `http://127.0.0.1:8000` | Member 1's frontend build configuration | No | No backend effect; frontend behavior depends on its code |

Paths may be absolute or relative to backend; they do not depend on shell cwd. The app reads environment variables when Settings is created. Wildcard CORS_ORIGINS is rejected. Empty origins allow no cross-origin browser access. Credentials are disabled.

Example optional backend settings from repository root, before starting Uvicorn:

```powershell
$env:DATA_DIR = 'data'
$env:STORAGE_FILE = 'var/demo-store.json'
$env:CORS_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173'
```

These settings last for the current PowerShell process. The supplied `.env.example` files are reference templates. The app does not automatically parse `.env`. Copying them alone has no effect. Uvicorn `--env-file` requires the separately installed optional python-dotenv package; that path was not used or tested here. For the frontend, Member 1 places VITE_API_BASE_URL in frontend/.env using that project's Vite configuration. Do not add database passwords/API keys to these examples or Git. DATABASE_URL and Supabase keys are not consumed by this code.

## 9. Input data formats

See `docs/api-contracts.md` and live `/docs` for all fields/types/examples. The agreed StudentProfile keys are preserved. POST /profile and /recommendations accept that object directly, not inside a `profile` wrapper. name, education_level, location, language, interests, preferred_learning and weekly_learning_hours are required; skills/goals default to empty arrays. Nonblank short strings have a 200-character limit; lists have at most 30 entries; interests has at least one. Weekly hours is a strict integer 1–168. Extra JSON fields fail validation.

POST /progress accepts student_id, course_id, completed and optional score. IDs are 1–80 characters using ASCII letters/digits/hyphens/underscores with an alphanumeric first character. completed is a JSON boolean. Score is null or integer 0–100. Catalog course and saved/demo student IDs must exist.

GET /opportunities accepts category, education_level, location and search query strings. Catalog files must contain arrays of unique-ID objects. The exact course and opportunity schemas are in api-contracts.md. Opportunity dates and URLs are not semantically verified. Career mock data requires id/title only; this is not a final Member 2 catalog contract. STORAGE_FILE contains profiles and progress arrays validated against StoreData; it is internal storage, not a shared data-exchange contract.

Missing/invalid fields or invalid JSON produce 422; unknown progress IDs produce 404; unreadable/malformed catalogs and storage produce 503. A corrupt storage file is preserved rather than reset. No endpoint uploads files or accepts personal credentials.

## 10. Output data formats

- /health returns a status object. It checks process liveness, not dependency readiness.
- /profile returns student_id and the accepted profile; IDs/timestamps vary per run. It creates a new profile every time; it does not update an existing identity.
- /recommendations returns `{"careers":[...]}` with career_id, title, match_score, reasons, missing_skills and next_steps. Fixed mock reasons explicitly say real matching is unavailable.
- /courses and /opportunities return plain arrays. Empty matches return an empty array.
- /progress returns saved=true and the stored progress record with a UTC updated_at timestamp. Success is sent only after storage completes.
- /facilitator/students returns a students array containing only demo-student-001 and demo-student-002 with profiles and matching progress arrays. It excludes all user-submitted profiles.
- Saved JSON is written to the configured storage path after profile/progress writes. No browser cache, certificate, application submission or external notification is generated.

HTTP 422 has a detail array; 404/503/500 use a detail string. Raw submitted values and exception text are not returned. Request examples with UUIDs or timestamps in the documentation are illustrative; test-results.txt and smoke-results.json are the actual execution evidence. JSON dates, URLs and text in fixtures are explicitly unverified mock content.

## 11. Exported functions, models and endpoints

| Interface and location | Parameters / return | Errors / dependencies / usage |
| --- | --- | --- |
| app.main.app | FastAPI instance | `uvicorn app.main:app --app-dir backend` |
| app.main.create_app | Settings or None -> FastAPI | Uses config, storage, schemas and adapters; optional settings make independent tests possible |
| app.main.read_catalog | Path, filename, optional model -> list[dict] | Internal helper, DatasetUnavailable on missing/invalid catalog; callers should use HTTP routes |
| app.config.Settings | data_dir: Path, storage_file: Path, cors_origins: tuple[str,...] | Settings.from_env() resolves default env values; ValueError for wildcard origins |
| app.config.backend_path | str -> Path | Relative paths resolve below BACKEND_DIR |
| app.career_engine.recommend_careers | profile: dict, careers: list[dict] -> list[dict] | Temporary mock; call with a validated StudentProfile.model_dump(); main wraps into careers response and catches errors |
| app.opportunity_engine.filter_opportunities | list[dict], keyword-only category/education_level/location/search, each str or None -> list[dict] | Temporary proposed adapter; works on validated records; missing dict keys would fail and become 503 at API boundary |
| app.database.JsonStore | Path -> instance | Shared single-process lock per instance; use one instance per storage path |
| JsonStore.create_profile | validated profile dict -> student_id/profile dict | StorageUnavailable; generates UUID and persists |
| JsonStore.save_progress | validated update dict -> progress dict | MissingStudent or StorageUnavailable; HTTP layer checks course first |
| JsonStore.facilitator_students | no args -> list[dict] | Fictional profiles and matching stored progress; StorageUnavailable on corrupt/unreadable store |
| app.database.demo_profiles | no args -> list[dict] | Built-in fictional fixtures; not a production student directory |
| app.database.utc_now | no args -> str | UTC ISO timestamp |

Schemas in `backend/app/schemas.py` are Pydantic models. `StrictModel` forbids unknown fields. `StudentProfile`, `CareerRecommendation`, `Course`, `Opportunity`, and `ProgressUpdate` define the public data bodies. `ProfileResponse`, `RecommendationResponse`, `ProgressRecord`, `ProgressResponse`, `FacilitatorStudent`, and `FacilitatorResponse` define responses. `StoredStudent` and `StoreData` are internal persistence models. Use `Model.model_validate(value)` to validate a dict and `.model_dump()` for plain data. Invalid data raises Pydantic ValidationError. `StoreData` also rejects duplicate profile/progress keys. Text, Identifier and ShortList are annotated type aliases, not functions.

The HTTP handlers are factory-local functions named health, profile, recommendations, courses, opportunities, progress and facilitator_students in main.py. They are used through the seven HTTP routes listed in api-contracts.md, not imported directly. The exception types DatasetUnavailable, EngineUnavailable, StorageUnavailable and MissingStudent are internal integration failure signals. There are no exported React components.

## 12. Integration with other team members

Member 1: configure the existing frontend API layer with VITE_API_BASE_URL. POST the StudentProfile object directly to /profile, retain response.student_id, and POST the same profile to /recommendations. Read response.careers. Courses/opportunities are arrays. Encode query strings with URLSearchParams. Check response.ok before displaying success; handle 422, 404, 503 and network errors. Keep loading, empty and error states. Do not replace services/api.js with this package; it contains no replacement frontend file. Example to adapt in that existing service:

```javascript
const base = import.meta.env.VITE_API_BASE_URL;
const response = await fetch(`${base}/recommendations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(profile)
});
if (!response.ok) throw new Error(`Backend request failed (${response.status})`);
const { careers } = await response.json();
```

Member 2: inspect the temporary career_engine.py without overwriting your real implementation. The architecture's example uses recommend_careers(profile, careers); this backend expects a list of six-key recommendation objects, and main.py supplies the careers envelope. If your implementation returns an envelope or uses async calls/another signature, discuss and add a private adapter in the backend after agreement. Do not rename public JSON fields. Roadmap endpoints/extra fields were not specified here; agree on them separately. Run engine tests plus the contract tests before removing mocks.

Member 4: replace mock catalogs only after reviewing fields with Members 2 and 3. The opportunity adapter signature in section 11 is a proposal for existing filters, not approval to discard your matching implementation. Merge it with your actual module. Filters perform catalog search only; no student eligibility decision is made. Verify source URLs, dates and requirements before using real data. Preserve unknown fields honestly. Keep course IDs stable or coordinate progress migrations.

Member 5: use GET /facilitator/students for fictional overview only. For the demo use student_id=demo-student-001, course_id=demo-safety. Submit POST /progress after completing an offline exercise when the network returns. Queueing/caching belongs to your component and is absent here. Replays replace the same row; coordinate ordering, stale-event handling and retries before real offline use. Newly created profile IDs are deliberately absent from the fictional facilitator list. A real authenticated relationship lookup must replace that fixed list before showing real students.

Member 3: review unknown contract details with the team, implement authorization, add a database adapter and migration when needed. Backend must be running for online API calls; offline frontend content may run without it, but cannot synchronize until it is reachable. All teammate integration remains untested because their code was not supplied.

## 13. Minimal working example

Start the server from section 7. Open a second PowerShell terminal in the repository root. These are complete requests using default mocks:

```powershell
$baseUrl = 'http://127.0.0.1:8000'
Invoke-RestMethod "$baseUrl/health"
$profile = @{
    name = 'Demo Student'
    education_level = 'Class 12'
    location = 'Tamil Nadu'
    language = 'Tamil'
    interests = @('electronics', 'hands-on work')
    skills = @('basic mathematics')
    preferred_learning = 'practical'
    weekly_learning_hours = 5
    goals = @('find vocational training')
}
$created = Invoke-RestMethod -Uri "$baseUrl/profile" -Method Post -ContentType 'application/json' -Body ($profile | ConvertTo-Json -Depth 10)
$created.student_id
Invoke-RestMethod -Uri "$baseUrl/recommendations" -Method Post -ContentType 'application/json' -Body ($profile | ConvertTo-Json -Depth 10)
Invoke-RestMethod "$baseUrl/courses"
Invoke-RestMethod "$baseUrl/opportunities?category=training&location=Tamil%20Nadu"
$update = @{ student_id = 'demo-student-001'; course_id = 'demo-safety'; completed = $true; score = 80 }
Invoke-RestMethod -Uri "$baseUrl/progress" -Method Post -ContentType 'application/json' -Body ($update | ConvertTo-Json)
Invoke-RestMethod "$baseUrl/facilitator/students" | ConvertTo-Json -Depth 10
```

Expected: health ok; profile ID created; three mock careers; two demo courses; one filtered fictional opportunity; saved=true; fictional student's progress includes demo-safety. The separately created profile is stored but excluded from facilitator mode. To save progress against the new profile instead, use `$created.student_id`; it remains absent from that fictional overview. This PowerShell sequence is documented for the team. Equivalent endpoint requests passed in-process; real HTTP smoke was blocked by the environment before requests could complete.

## 14. Testing instructions and results

Prerequisites: the four Python dependencies installed, writable extracted root and a free port for live smoke. No pytest installation is needed; the suite uses standard-library unittest.

From repository root:

```powershell
$env:PYTHONPATH = (Resolve-Path 'backend').Path
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
.\.venv\Scripts\python.exe backend/tests/smoke_server.py
```

The unit/API suite is in-process; a separate server need not run. TestClient uses the supplied InProcessEventLoop, which replaces the event loop's internal socketpair with a threading.Event wakeup. HTTP requests use in-memory ASGI transport and real application handlers, including their normal threadpool dispatch. No application/server code is patched for these tests. The test loop supports no network/file transports. Standard socket-based TestClient initialization stalled in this Windows sandbox; a diagnostic stack showed socket._fallback_socketpair waiting in accept.

The smoke script is intended to launch/stop its own Uvicorn processes and refuses to run against an already occupied port. If your normal server is running, stop it first or execute `... smoke_server.py --port 8001`. It uses an isolated storage file and is designed to check all seven endpoints, invalid input and persistence across a real process restart. It writes smoke-results.json and server-smoke.log under docs. Test temporary directories are under backend so they remain inside the workspace.

Executed evidence: all 24 in-process tests passed in 2.343 seconds. Results are recorded in docs/test-results.txt. The suite covers fixed route paths and JSON keys; valid/invalid profiles; missing optional fields; invalid JSON; engine input/output contracts and exceptions; courses; opportunity filters and unknown eligibility; progress upserts across a new app/store instance; hiding submitted profiles; invalid/missing IDs; missing, malformed and duplicate-ID catalogs; corrupt storage preservation; simulated disk failure; 20 concurrent same-process writes; CORS origins/preflights; configuration paths; and sanitized unexpected failure responses. Negative-case logger messages are expected in a passing run.

The real HTTP smoke was attempted and failed before serving requests: Uvicorn startup timed out. docs/smoke-results.json preserves that failure, and diagnostics independently showed standard asyncio socketpair creation stalling in this sandbox. Treat real server startup and process-restart persistence as blocked here, not passed. Rerun the supplied smoke on a machine permitting localhost networking. In-process app re-creation and on-disk persistence did pass; those do not prove real HTTP networking.

The first local test attempt used an inaccessible sandbox default temporary directory and failed before application assertions. Tests were adjusted to create isolated temporary directories under backend. A subsequent standard TestClient run stalled on the socketpair issue; it was stopped, and the final test-only event loop allowed all 24 assertions to run. The recorded successful results supersede those unsuccessful harness attempts. A fresh virtual-environment install, live HTTP startup, real process-restart persistence, PostgreSQL, frontend, Android hardware, service worker, voice, live AI, external opportunity sources, authenticated teacher roles and cloud hosting remain unverified.

Manual checks after team integration: open /docs, complete one student journey, inspect non-mock career results, verify official source links, complete a lesson, check teacher permissions, test offline retry order and test the frontend's error/empty states. Those are recommended checks, not completed checks. Debug failed 503 responses using server-side log categories and catalog schemas. Do not “fix” corrupt storage by deleting it: stop the server, preserve a backup and review/repair the file. For ModuleNotFoundError: app, run from the root with --app-dir backend or set PYTHONPATH for tests. For CORS failure, compare exact protocol/host/port and restart after changing env variables. For JSON storage concurrency, do not add workers; implement a database adapter first.

## 15. Known limitations and incomplete work

| Limitation | Impact | Next action / owner |
| --- | --- | --- |
| Fixed career mock, zero scores | No personalised recommendation or roadmap | Integrate real engine with Member 2 |
| Fictional courses/opportunities | No real opportunity discovery or eligibility decision | Member 4 verifies and supplies catalogs |
| Strict proposed course/progress/facilitator contracts | Teammate shape may differ | Review before adoption; Members 1/3/4/5 |
| JSON store, one process | No multi-worker/multi-host transactions; whole file rewritten | Member 3 adds PostgreSQL adapter and migration |
| No authentication/authorization | Cannot accept real student data or provide real teacher access safely | Members 3/5 implement identities and relationship checks |
| Fictional facilitator identities only | Newly saved learners do not appear in overview | Replace fixture lookup after access control is tested |
| Profile POST always creates | Retrying can create duplicate profiles | Agree identity/upsert contract with Member 1 |
| Progress last-write-wins | Late offline updates can undo a newer completion/score | Members 3/5 agree client event ordering/version contract |
| No client offline queue/service worker | API alone cannot work offline or synchronize | Member 5 implements and tests end-to-end |
| No semantic URL/date validation | Real malformed or stale listing data could be accepted | Member 4 validates sources; Member 3 adds reviewed rules |
| Exact tag matching | No nationwide/synonym matching or eligibility inference | Member 4 supplies documented semantics |
| Unbounded record count/file size | Whole-file JSON is unsuitable at scale | Add quotas/pagination/database before wider usage |
| No database adapter or executed migration | Supabase/PostgreSQL is not operational | Review schema, implement adapter, run DB integration tests |
| Data on local disk only | Ephemeral cloud disk can lose it on redeploy | Configure durable storage or database before deployment |
| No frontend/phone/cloud tests | End-to-end usability and hosting unknown | Members 1/3/5 run shared integration checks |
| Sandbox socketpair initialization stalls | Real Uvicorn startup timed out; no live HTTP checks completed | Member 3 reruns supplied smoke on a machine permitting localhost networking |
| /health is liveness only | 200 does not prove catalog/storage readiness | Use actual endpoint checks; agree readiness behavior if needed |

No known failing backend assertion should be treated as resolved without the accompanying final logs. There are no real API keys or passwords in this package.

## 16. Files that must not be overwritten

Do not overwrite frontend/src/App.jsx, frontend/src/main.jsx, frontend/src/services/api.js, frontend/package.json or frontend PWA/service-worker files. Those remain with Members 1 and 5. Do not overwrite Member 2's career_engine.py or Member 4's datasets/opportunity logic with the included placeholders.

backend/app/main.py, schemas.py, config.py, database.py, requirements.txt, database/schema.sql, root README/.gitignore/.env.example and shared docs require careful review against the shared repository. New local code does not imply the team has no version of it. Preserve existing functions, environment settings, authentication and other endpoints. If another member already has an interface, discuss incompatibilities first. This handoff proposes no automatic replacement or batch copy.

Tests/docs with noncolliding filenames can be added as new files. If a name already exists, choose a new test/document filename or perform a reviewed merge. There is no permission here to delete a teammate's implementation.

## 17. Assumptions and design decisions

Verified locally: specified endpoint paths and StudentProfile/career response keys are implemented; catalogs come from JSON; storage defaults under backend; no key/database required; the mock adapter and frontend base URL match the supplied prompts. Runtime versions are observed, not guessed.

Pending team confirmation: course/progress/facilitator response shapes, optional profile defaults, status-code choices, strict unknown-field rejection, opportunity adapter interface, course ID scheme, how Member 2 produces roadmaps, real opportunity date/URL semantics, frontend CORS origins beyond local Vite, teacher identity provider and PostgreSQL deployment. These fill unspecified gaps in the prompts; no change was made to a supplied concrete endpoint or agreed profile/career key.

Deliberate decisions: preserve boundaries with small temporary mocks; return validation errors rather than silently coercing key numeric/boolean fields; validate engine output before sending it; fail with 503 rather than reset corrupt storage; use a fictional facilitator list while authorization is absent; keep JSON to avoid blocking independent development on database configuration. The JSON store supports process restarts on durable local disk, not distributed consistency. Client offline behavior and frontend features cannot be inferred from the backend alone.

## 18. Exact integration procedure

1. **Prepare the repository.** Obtain the real team URL and agreed base branch from your coordinator. They were not provided here. If already cloned, open that repository. Save/commit your own unfinished work before switching branches; do not discard it. Run `git status` and inspect existing same-named files.
2. **Fetch and branch.** If the coordinator confirms main as the base, run the following inside the real repository; substitute the agreed base if different:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c feature/member3-backend
```

3. **Review contracts with the team.** Share api-contracts.md, the owner table and adapter signatures with Members 1/2/4/5. Resolve proposed shapes before merging dependent changes. This document is ready to share; no messages were sent automatically.
4. **Merge individually.** Keep the archive in a separate staging directory. Inspect each file. Add only missing files; manually merge existing main.py/schemas.py/settings/requirements/docs. Preserve real catalogs and engines. Compare with your editor's diff tool; there is intentionally no recursive overwrite command. Do not run database/schema.sql yet.
5. **Install.** From the shared repo root, create/use its approved environment and install the merged requirements. For a new root environment use section 6 commands. Do not replace the team's requirements blindly with this package's four lines.
6. **Configure.** Set DATA_DIR/STORAGE_FILE/CORS_ORIGINS as needed. Have Member 1 set the actual reachable VITE_API_BASE_URL in the existing frontend project. Keep keys out of Git; none are needed for these mocks.
7. **Resolve file conflicts.** When merging teammate branches later, use `git status` to see conflicts, open each conflicted file, preserve the agreed interface, remove conflict markers and rerun affected tests. If uncertain, discuss with that file's owner. Do not choose all incoming or all current changes for shared files without inspection.
8. **Start dependencies.** No external backend service is required for this JSON demo. After a real engine is integrated, install its reviewed dependencies and configure its documented environment. Start the backend with section 7. Start the existing frontend separately using Member 1's instructions.
9. **Verify independently.** Stop the normal server before live smoke, or use --port 8001. Run section 14 tests using the merged implementation. Fixture-specific tests may need reviewed updates when real catalogs/engines arrive; do not delete public contract/error tests merely to force a pass.
10. **Verify together.** Test profile -> careers -> course -> progress -> authorised facilitator, plus opportunity filters/error states. Check the seven paths and JSON keys against live OpenAPI. On the current mocks, demonstrate the fictional progress flow and explicitly label mock intelligence/data. Test real teacher access and offline ordering only after those features are implemented.
11. **Inspect and stage.** Confirm no secrets, .venv, caches, backend/var data or unintended frontend replacements appear. From the repo root:

```powershell
git status
git diff --check
git diff
git add -p
```

`git add -p` stages reviewed changes to tracked files; add each selected new file explicitly, for example `git add backend/app/config.py`. Use the exact approved file list from your actual diff. Avoid `git add .` while runtime/student files or unrelated work are present.
12. **Commit and push.** After review/tests, run:

```powershell
git diff --cached
git commit -m "Add Member 3 backend APIs and independent tests"
git push -u origin feature/member3-backend
```

13. **Open a pull request.** In the shared GitHub repository choose your feature branch and the coordinator's agreed base. Describe the seven routes, JSON persistence, mock boundaries, actual test evidence and incomplete production features. Ask relevant owners to review shared contracts, datasets and adapter merges. GitHub account/remote/PR permissions were not exercised here.
14. **Merge safely.** Coordinator/reviewers confirm all checks and teammate compatibility, then merge under the team's normal process. Do not merge unreviewed interface changes. After merge, all members fetch/pull their agreed branch and rerun the shared demo. No commit, push, PR or merge was performed by this package creation task.

For future database integration: review this SQL scaffold against the real schema, map identity provider UUIDs, migrate demo IDs to real UUID references, seed courses/opportunities, implement a Postgres store matching the reviewed storage interface, add authorization policies/server checks, configure credentials securely, and test with an actual database. Supplying DDL is not database integration.

## 19. Integration checklist

- [ ] Team reviewed unspecified response shapes and adapter details.
- [ ] Files compared individually with the shared repository.
- [ ] Existing frontend, engines and verified catalogs preserved.
- [ ] Dependencies installed into the intended environment.
- [ ] Backend environment and writable storage configured.
- [ ] Frontend base URL and exact CORS origin agree.
- [ ] All seven API endpoints connected using documented JSON.
- [ ] Backend starts from the documented command.
- [ ] Independent tests executed on merged code; failures fixed.
- [ ] Real engine and dataset integrations tested, or mocks labelled.
- [ ] Teacher authorization implemented before real student records.
- [ ] Offline queue/replay ordering tested with Member 5.
- [ ] Runtime data, secrets and caches excluded from commit.
- [ ] Reviewed changes committed and feature branch pushed.
- [ ] Pull request reviewed by relevant owners.
- [ ] Shared demo confirms integration after merge.

These boxes intentionally remain unchecked: they describe work in the shared team repository, not the completed independent local backend verification.

## 20. Final status report

| Requirement | Status | Evidence | Remaining work | Responsible person |
| --- | --- | --- | --- | --- |
| Seven specified REST paths | Complete and verified in-process | main.py, OpenAPI assertion, 24-test pass | Live HTTP and merged team tests | Member 3 |
| Profile/career JSON field names | Complete and verified in-process | schemas.py, contract assertions | Team engine/frontend verification | Members 1/2/3 |
| Local persistent profile/progress store | Complete and verified in-process | Disk writes, new app/store instance, concurrent-write tests | Real process-restart check and database adapter | Member 3 |
| Validation, CORS and failure handling | Complete and verified in-process | Negative/API/CORS test cases | Recheck live origins and real services | Member 3 |
| Real Uvicorn HTTP launch | Blocked in this sandbox | Attempt timed out; socketpair diagnostic; smoke-results.json | Rerun smoke on a localhost-capable machine | Member 3 |
| Complete source/setup/environment handoff | Complete for this local component | Package, this document and requirements | Merge reviewed files | Member 3/coordinator |
| Real AI and roadmap | Not implemented | Explicit mock module | Integrate Member 2's code | Member 2/3 |
| Verified learning/opportunity data | Not implemented | Fictional fixtures, empty URL/null dates | Research and merge actual catalogs | Member 4 |
| PostgreSQL/Supabase | Partially implemented | Unexecuted schema scaffold only | Connection, migrations and tests | Member 3 |
| Real facilitator permissions | Not implemented | Fictional-only list; no auth | Identity, ownership and role tests | Members 3/5 |
| Mobile frontend, voice, offline queue | Not implemented here | No frontend files supplied | Integrate/test their components | Members 1/5 |
| Team end-to-end integration | Requires verification | Teammate code unavailable | Review, merge and test together | All members |
| Deployment | Not implemented | Local-only run instructions | Choose host, persistent DB and access controls | Member 3/coordinator |
