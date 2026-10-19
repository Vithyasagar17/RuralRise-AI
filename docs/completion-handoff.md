# Current implementation handoff — 19 October 2026

This source copy integrates the uploaded team project while preserving React/Vite/PWA, FastAPI/Pydantic/Uvicorn, JSON/PostgreSQL/Supabase and the existing API formats. It is ready for a team integration review and local demonstration. It is not evidence of a deployed hosted service or approval of educational/translated content.

## Contents and entry points

- All frontend/backend source, original teammate catalogs/engine, existing database migrations and pinned dependencies.
- `setup.ps1` and `QUICKSTART.md`: fresh-folder setup, two-terminal startup, secure configuration and coordinator role/assignment commands.
- `docs/completion-phases.md`: implemented phases, team owners and launch sequence.
- `docs/completion-contracts.md`: additive roadmap/restore contracts, compatibility flags and offline policy.
- `docs/completion-source-changes.json`: per-file changes relative to the uploaded ZIP. `docs/completion-release-manifest.json`: current file hashes.
- Current executed evidence in `docs/completion-*tests.txt`, `completion-build.txt`, `completion-database-verification.json` and `completion-browser-verification.json`. Historical test documents are retained under their original filenames; do not mix their totals with this release.

No `.env` secrets, virtual environment, node_modules, build output, live student records, browser screenshots or local database files are included. Dependencies install from `backend/requirements.txt`, optional `requirements-postgres.txt`, and `frontend/package-lock.json`. No new runtime frontend dependency was added for authentication or voice.

## Executed verification

| Check | Result | What it establishes |
| --- | --- | --- |
| Backend full suite with disposable local PostgreSQL 17.5 | 118 passed, zero skipped/failures/errors | Original API compatibility, SQL migrations/imports/persistence, ownership/teacher permissions, career engine, gated roadmap, bounds/mapping failures and sanitized errors |
| Database restart | All 30 practice completions retained | Actual local SQL persistence across server restart |
| Frontend unit/component suite | 85 passed | Existing Member 5 behavior plus student journey, save failure, identity/token races, queue account scope, hydration, secure login/role switch, confirmation and logout/refresh behavior, optional voice controls |
| Production build | Passed; service worker generated | Source compiles and PWA shell assets are precached |
| Real Chrome + live JSON backend, 360 px emulation | 13 checks passed; backend disk confirmation passed | Profile creation → real career ranking → mapped lesson → offline completion/reload → reconnect sync; opportunities/filter/link; keyboard dialog; fictional demo roster; no horizontal dashboard overflow or uncaught JS errors |
| Automated accessibility | No A/AA violations in the tested dashboard scan | Targeted automated check only; not a whole-product accessibility certification or physical phone/TalkBack test |

Supabase Auth is mocked at the external-provider boundary in tests; real ownership SQL is exercised. Browser tests use demo mode against live Uvicorn; they do not establish actual hosted login or email delivery. Tests intentionally print sanitized error messages for negative cases. A local JSON write-permission failure was seen in an earlier Windows test run; repeated isolated checks and the final full suite passed. The backend correctly reported 503 without resetting data on that failure.

## Reproduce tests

From root: `.venv/Scripts/python.exe backend/run_tests.py`. Without a test database, 24 SQL tests skip; other tests use isolated JSON. In `frontend/`: `npm ci`, `npm test`, `npm run build`.

For all SQL tests, use a **disposable** database with `RURALRISE_TEST_DATABASE_URL`, `RURALRISE_TEST_DB_SSLMODE` and `RURALRISE_ALLOW_DATABASE_TESTS=1` in the test process. Never reuse production data for these tests. The test runner applies only the backend's isolated schema through versioned migration tools; database tests intentionally create, update and remove fictional records.

The optional browser script needs Chrome plus `playwright-core@1.64.1` and `axe-core@4.14.0` installed in the test environment. These are QA tools, not application dependencies. Run a production frontend preview and a demo backend with learning routes enabled and matching CORS. From `frontend/`, run `node scripts/e2e-project-journey.mjs`. Defaults are http://localhost:5173 and http://127.0.0.1:8000; `APP_URL`, `API_URL`, `E2E_REPORT_DIR` and optional `E2E_TOOLS_DIR` select isolated servers/tools. Test profiles are fictional. The browser script writes a fresh report; rerun it against the deployed service only with deliberate test accounts and appropriate access.

## Environment variables

| Location | Variables | Purpose |
| --- | --- | --- |
| backend | `DATA_DIR`, `STORAGE_FILE`, `CORS_ORIGINS` | Catalog/storage paths and exact frontend origins |
| backend | `STORAGE_BACKEND`, `DATABASE_URL`, `DB_SSLMODE`, `DB_CONNECT_TIMEOUT`, `DB_STATEMENT_TIMEOUT_MS` | JSON or PostgreSQL selection and bounded connections/queries |
| backend | `AUTH_MODE`, `APP_ENV`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `AUTH_TIMEOUT_SECONDS` | Verified identity provider; production rejects demo authentication |
| backend | `ENABLE_ACCOUNT_ROUTES` | Required true for secure frontend account/profile/progress restoration |
| backend | `ENABLE_LEARNING_ROUTES` | Required true for integrated roadmap and its practice lessons |
| frontend | `VITE_API_BASE_URL`, `VITE_AUTH_MODE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Build-time API/auth selection; all VITE values are public |

See the actual `.env.example` files for defaults. Backend shell values override `backend/.env`. Vite needs restart/rebuild after configuration changes. Actual passwords, connection strings, access/refresh tokens and service-role keys must stay out of frontend code and Git.

## Known limitations and required launch checks

1. **Hosted services are unconfigured here.** Configure the team's actual Supabase/email/database project and hosting, run migrations and role assignments, then repeat student/teacher access, persistence, refresh, confirmation, logout, CORS and HTTPS checks. No deployment was performed and no repository was pushed.
2. **Shared additions need team review.** Review `/roadmap`, extended course IDs, optional secure reads and frontend/offline changes before merging. Original seven JSON formats, original lesson IDs, Member 2 engine and migration SQL remain preserved.
3. **Educational and opportunity data remain prototype/reviewed-by-provider boundaries.** The 30 worksheets are introductory, self-reported practice, without certificates. Six supplied opportunity records retain their source/unknown verification status; eligibility/deadlines may change. Member 4 and domain reviewers must check current sources before real use.
4. **Tamil is unfinished as a complete product language.** Existing facilitator/offline strings are draft Tamil and visibly labelled. Student screens, new integration controls and lesson content include English. Native review and completion are still required; no automatic translation is claimed.
5. **Physical device/audio tests remain.** Real low-end Android installation, airplane-mode reopen, storage pressure, TalkBack, microphone permission denial and installed Tamil/English voices need the team's phone test. Headless speech mocks do not establish microphone accuracy or audible playback. Browser voice services may require internet.
6. **Cross-device progress is last-arrival-wins.** Per-device revisions protect local edits, but the original API has no conditional/versioned update. Delayed writes may overwrite a newer device's state. Use a single device per student for prototype trials or agree a versioned conflict protocol before broader use.
7. **Demo behavior is intentionally restricted.** Newly saved demo profiles receive new IDs and do not appear in the public fictional facilitator roster. JSON locking is process-local: use one Uvicorn worker and fictional data only. PostgreSQL is required for secure shared usage.
8. **Offline storage is local.** First online download is required; clearing browser data removes unsynced work. API hostname changes create a separate queue. Legacy device queues are left untouched and are not automatically migrated/replayed. Pending records remain after logout but are shown/sent only for their student after sign-in. Same-tab offline cached access cannot immediately learn of remote revocation; all later server writes recheck permissions.
9. **Account scope is limited.** Email/password sign-up/sign-in/refresh/logout is included; social login, password-reset UI and account deletion UI are not part of this prototype. Use the provider's administrative recovery procedures until separately designed flows are agreed.
10. **Historical upgraders are not a current deployment method.** Older scripts/manifests remain for their specific baselines. This bundle is full source; compare and merge on a new branch, preserve the team's newer edits, and tag the accepted commit after integration checks.

## Handoff decision

Member 1 receives the complete source bundle plus this evidence and coordinates integration. Member 3 retains backend defects/configuration assistance; Member 2 reviews the unchanged engine and plan output; Member 4 reviews datasets/content; Member 5 reviews offline/i18n/phone/voice behavior. The next concrete project step is configuring the real services and performing the hosted acceptance journey, rather than repeating the already completed local implementation phases.
