# RuralRise AI — Member 3 backend handoff to Member 1

Prepared 18 October 2026. **Member 3 owns the backend component. Member 1 owns project integration.** This allocation supersedes earlier notes that assigned overall integration to Member 3. Member 2 owns the career engine; Member 4 owns verified knowledge/content; Member 5 owns facilitator/offline/PWA/accessibility features.

## Delivery status

The originally agreed seven-endpoint backend implementation is ready for component handoff and has passed independent tests. This does not certify a fully integrated/deployed application or hosted sign-in. Member 3 remains available for backend defects and explicitly agreed backend additions; frontend merging, student-screen construction, teammate coordination and final project integration belong to Member 1.

The `ruralrise-ai` folder contains the latest backend with Member 2's actual engine and Member 5's supplied frontend already present in their agreed paths. This is a source handoff/reference assembly for Member 1. The temporary frontend shell must be merged into Member 1's real app, not blindly copied over it. Do not use the older Member 2 ZIP as a whole-project replacement: it contains an older backend and no frontend.

## Files to take, by owner

| Owner/source | Included paths | Purpose |
| --- | --- | --- |
| Member 3 | backend/app/* other than the two teammate engine modules; backend/start_server.py; backend/requirements*.txt; backend/.env.example | FastAPI, strict schemas, compatible recommendation adapter, JSON/PostgreSQL storage, configuration, optional identity/access control and administration |
| Member 3 database | database/migrations/001_backend_storage.sql and 002_identity_access.sql | Versioned private-schema storage and optional ownership/teacher-assignment migration; apply only after review/configuration |
| Member 3 testing | backend/tests/test_api.py, test_stage2_storage.py, test_postgres_integration.py, test_auth_access.py, test_identity_integration.py, test_member2_boundary.py, test_stage2_upgrade.py, smoke_server.py, verify_member5.py, member5_contract.mjs and inprocess_loop.py | Backend and component-boundary verification; root upgrade_stage1.py is retained because upgrade tests import it |
| Member 2 | backend/app/career_engine.py; backend/data/careers.json and career_learning_modules.json; backend/tests/test_career_engine.py, example_profiles.json, expected_profile_results.json, demo_engine.py, demo_output.json/txt | Actual deterministic recommendation/roadmap component, starter data and examples, preserved unchanged |
| Member 2 documentation | docs/ai-engine-integration.md and scoring-algorithm.md | Python interfaces, score interpretation and component dependencies |
| Member 5 | frontend/ including package.json, package-lock.json, public/, src/features/facilitator, offline, i18n, common and tests; root tests/*.md | Actual facilitator/offline/PWA/language implementation and QA, preserved unchanged |
| Provisional content | backend/data/courses.json, opportunities.json and backend/app/opportunity_engine.py | Existing demo lessons/opportunities/filtering until Member 4 supplies reviewed replacements |
| Shared review material | docs/api-contracts.md, auth-contract-proposal.md, offline-sync-contract-proposal.md, roadmap-integration-proposal.md | Current contracts and clearly separated proposals for Member 1/team review |

Historical README/setup/upgrade/review files are retained as references. **This document is the authoritative ownership/status entrypoint for this handoff.** Their claims that Member 2/5 source is absent or that Member 3 owns all integration are superseded here. Do not run historical baseline upgrade scripts against a newer checkout or use database/schema.sql instead of the versioned runtime migrations.

## Backend API contract delivered

| Method/path | Behavior |
| --- | --- |
| GET /health | Liveness: {"status":"ok"}; does not certify database readiness |
| POST /profile | Strict StudentProfile; 201 student_id/profile envelope |
| POST /recommendations | Strict StudentProfile; careers with exactly career_id, title, match_score, reasons, missing_skills, next_steps |
| GET /courses | Array of existing six-field lesson records |
| GET /opportunities | Existing category, education_level, location and search filters |
| POST /progress | student_id, course_id, completed, optional score; saved/progress envelope; per-student/course upsert |
| GET /facilitator/students | students/profile/progress envelope; fictional identities in demo, assigned students in reviewed secure mode |

Paths and public JSON field names are unchanged. docs/api-contracts.md has complete formats and errors. The Member 2 adapter projects its richer result into the existing response; malformed results return sanitized 503. The engine's internal partial-profile support does not relax the HTTP profile schema. Remove sample-only profile_id before an HTTP request.

## Install and run the independent backend

Extract to a short path, such as `C:\Projects\RuralRise-handoff`. Open PowerShell in the inner `ruralrise-ai` folder:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Open <http://127.0.0.1:8000/docs> and <http://127.0.0.1:8000/health>. JSON/demo mode needs no database/account/API key. Use one process for JSON storage. Stop with Ctrl+C.

Test from the same root:

```powershell
$env:PYTHONPATH = (Resolve-Path backend).Path
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
```

The recorded full run executed 110 tests with zero failures/errors/skips using a private disposable PostgreSQL database. On an ordinary setup, real database tests skip unless explicitly configured; this is expected and must not be reported as a new 110-test execution. See STAGE2_SETUP.md for disposable-test-database opt-in. Install backend/requirements-postgres.txt for PostgreSQL support. Do not run destructive test setup against the team's production database.

The optional engine demo is `.\.venv\Scripts\python.exe -m backend.tests.demo_engine`. It demonstrates the internal roadmap without adding a public endpoint.

## Dependencies and configuration

Tested backend: Python 3.13.7, FastAPI 0.137.1, Pydantic 2.12.5, Uvicorn 0.49.0, HTTPX 0.28.1, python-dotenv 1.0.1; optional psycopg2-binary 2.9.12. Requirements files pin these. Member 2 uses the standard library and adds no API key, package or environment variable.

Member 5 frontend: Node.js >=22.12.0; exact React/Vite/PWA/Vitest dependencies are in frontend/package.json and package-lock.json. Run npm ci; do not replace these pins independently. Node 22.19.0/npm 10.9.3 were used for the component checks.

backend/.env loads automatically; shell values take precedence. backend/.env.example is the complete template. Important settings:

| Variable | Purpose/default |
| --- | --- |
| STORAGE_BACKEND | json by default; postgres requires configured database |
| DATA_DIR / STORAGE_FILE | Backend-relative catalog/store paths unless absolute; runtime data is excluded from delivery |
| CORS_ORIGINS | Exact frontend origins; localhost and 127.0.0.1 on port 5173 already allowed |
| DATABASE_URL / DB_SSLMODE | PostgreSQL URI and TLS mode; default SSL require; set only in local/runtime configuration |
| DB_CONNECT_TIMEOUT / DB_STATEMENT_TIMEOUT_MS | Bounded database connection/query waits |
| AUTH_MODE | demo by default; supabase is opt-in after login/role review |
| SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY | Actual project's Auth configuration for secure mode |
| AUTH_TIMEOUT_SECONDS | Provider timeout, default 5 |
| ENABLE_ACCOUNT_ROUTES | false by default; reviewed optional account/profile/progress reads |
| APP_ENV | development default; production requires secure mode and encrypted database connections |
| HOST / PORT | Deployment entrypoint binding; documented by backend/start_server.py |
| VITE_API_BASE_URL | Frontend setting in frontend/.env; default backend http://127.0.0.1:8000 |

No actual credentials, tokens, private records, virtual environments, node_modules, build outputs or runtime store are included. Use backend/app/configure_db.py and configure_auth.py through their documented module commands for local setup. START_HERE.md contains migration/operator commands, including teacher promotion and explicit student assignments. Auth mode does not trust user-editable role metadata or expose a public promotion API.

## Member 1's integration checklist

1. Merge backend files into the team repository while preserving newer teammate changes. Review shared schemas, documentation and migrations before applying changes. Keep engine/data ownership intact.
2. Merge Member 5's features into the actual student app. Preserve LanguageProvider, one registerPWA call, one OfflineBanner, exactly one VitePWA block and the necessary HTML/manifest assets. Supply the actual returned/owned student_id to OfflineLessons.
3. Connect onboarding, recommendations, lessons, opportunities and the facilitator dashboard using the existing documented JSON shapes. The frontend API base URL and backend CORS must match the real origin.
4. Collect Member 4's real content and stable IDs. Keep prototype records labelled until replaced/reviewed.
5. Review auth-contract-proposal.md with Members 3/5 before secure mode. The supplied frontend currently sends no bearer token. Member 1 owns login/session integration; Member 5 owns active-account queue scoping and error recovery. Member 3 supports backend fixes and agreed changes.
6. Decide whether a public roadmap route/course mapping and stronger offline conflict handling are needed for the final scope. Send Member 3 the agreed backend contract if these additions are required. Do not invent JSON fields or rename IDs independently.
7. Run the whole student/offline/facilitator journey and permissions checks on the merged project. Member 1 coordinates final acceptance and deployment if chosen.

For Member 5's reference app, from frontend run npm ci and npm run dev; open http://localhost:5173. Use npm run build then npm run preview for offline/PWA behavior. npm test runs component tests; npm run test:live requires the backend. After npm ci, `python backend/tests/verify_member5.py` from the root exercises actual queue/API modules through an isolated ASGI bridge. It is separate from browser/phone verification.

## Verification supplied

- 110 backend tests passed: includes 14 Member 2 tests, 7 added boundary tests and 24 real PostgreSQL tests. These are subsets of 110, not additional totals.
- Actual PostgreSQL restart retained progress. The disposable local test server was stopped afterward.
- Six frontend live API tests and ten actual frontend/queue-to-backend integration checks passed after the engine merge.
- The unchanged Member 5 frontend previously passed 73 unit/component tests and its production/PWA build. Those results were carried forward only after confirming identical source and lockfile; they were not rerun or presented as new executions.
- Earlier real Uvicorn/process-restart smoke passed. Hosted Supabase Auth responses remain substituted in automated tests; a real hosted login/session has not been certified.
- File hashes and guarded-upgrade verification are included. No repository push, team merge, cloud deployment or physical-phone test was performed by this handoff.

Evidence: docs/member2-backend-test-results.txt, member2-backend-verification.json, member2-current-verification.json and member2-live-tests.txt. Earlier Member 5 reports retain their original timestamps/context. No application source was changed while preparing this ownership-corrected handoff, so existing source-level test evidence is reused rather than inventing a fresh run.

## Known limitations / requests for decisions

| Item | Current state | Next owner/action |
| --- | --- | --- |
| Full student UI/login | Not included in received sources | Member 1 builds/merges it |
| Public roadmap | Internal generator works; no agreed HTTP endpoint | Member 1 coordinates API decision with Members 2/3/4; Member 3 implements approved backend addition |
| Trackable roadmap lessons | Thirty module IDs do not match the two current course IDs | Members 2/4 agree content/mapping; Member 1 coordinates consumption |
| Real catalog accuracy | Career/module starter content and demo opportunities/lessons require review | Member 4 verifies/supplies content |
| Secure frontend requests | Token/session wiring is absent | Members 1/5 integrate the approved flow; Member 3 validates backend behavior |
| Shared-device offline queue | The supplied hook can attempt sync without active-student scoping; 401 recovery is incomplete | Member 5 fixes feature code; Member 1 merges/tests |
| Offline conflicts | Arrival-order upserts; old offline uploads may replace newer values | Members 1/3/5 agree requirements before changing progress fields; Member 3 implements any approved backend extension |
| Hosted services | Real project credentials/session/deployment not configured here | Member 1 coordinates actual environment; Member 3 supplies backend support |
| Phone/Tamil accessibility | Physical Android/TalkBack and native Tamil review remain | Member 5/team performs checks |

The agreed seven-endpoint backend component is deliverable now. Additional backend features and defects remain Member 3's responsibility when identified and agreed; overall integration and missing frontend/content work are not reassigned to Member 3.
