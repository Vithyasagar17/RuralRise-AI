# Member 3 Stage 2 — database integration handoff

> Historical release handoff. The current candidate is described in backend-handoff.md and ../START_HERE.md. Its opt-in authentication/access features supersede this release's statements that authentication is unimplemented; teammate/service integration is still pending.

This document describes release 0.2.0. Read ../STAGE2_SETUP.md for beginner setup. The original integration-guide.md remains Stage 1 history. No shared GitHub repository, hosted database account or teammate implementation was accessed or modified by this build.

## 1. Component overview

Adds explicitly selected PostgreSQL persistence to the existing FastAPI backend. The storage factory chooses JSON or PostgreSQL. All seven public endpoints, status codes, request/response schemas and mock engine contracts are preserved. PostgreSQL supports profiles and progress, an internal retrieval interface, fictional demo seeding, an idempotent migration runner, configuration/check commands and validated JSON import.

Authentication, real teacher-student permissions, profile read/edit HTTP endpoints, real career intelligence, verified datasets, frontend and offline synchronization are not added in this release. Those would require coordination and additional implementation. The fictional-only facilitator behavior remains deliberately unchanged.

## 2. Files created

| New path | Responsibility | Integration importance |
| --- | --- | --- |
| STAGE2_SETUP.md | Exact upgrade, Supabase/local setup, run/test/import/rollback steps | Start here |
| upgrade_stage1.py | Guarded file-by-file upgrade, code backup and conflict detection | Optional local upgrade convenience |
| stage2-upgrade-manifest.json | Release hashes and original Stage 1 hashes for upgrade allowlist | Required by upgrade tool; generated |
| backend/requirements-postgres.txt | Base requirements plus psycopg2-binary 2.9.12 | Required for PostgreSQL mode |
| backend/app/postgres_store.py | Transactions, parameterized SQL, CRUD boundary, migration, import | Required for PostgreSQL mode |
| backend/app/storage_import.py | Snapshot schema, references, course and timestamp validation | Required for import |
| backend/app/db_tools.py | migrate, seed-demo, check, import-json CLI | Required for documented setup |
| backend/app/configure_db.py | Hidden local credential input and backend/.env writer | Optional setup convenience |
| database/migrations/001_backend_storage.sql | Isolated schema, tables, constraints, RLS/revokes | Required for PostgreSQL mode |
| backend/tests/test_stage2_storage.py | Env/driver/transaction/import/error tests | Recommended |
| backend/tests/test_stage2_upgrade.py | Upgrade conflict, backup and data preservation tests | Recommended |
| backend/tests/test_postgres_integration.py | Explicitly opted-in real database tests | Required before claiming your deployment verified |
| docs/stage2-handoff.md | This handoff | Recommended |
| docs/stage2-test-results.txt | Actual captured test execution | Evidence |
| docs/stage2-verification.json | Counts, dependencies, skips and verification limitations | Evidence |
| docs/stage2-release-manifest.json | Packaged file paths, sizes and SHA-256 | Evidence; excludes itself |

All runtime .env files, JSON stores, virtual environments, test clusters, credentials and caches are excluded from the package. Existing application source is present so the release can also run independently. The upgrade utility uses a limited allowlist rather than copying the entire release over the user's folder.

## 3. Existing files modified

| Path | Change | Review/merge considerations |
| --- | --- | --- |
| backend/app/config.py | Added validated backend/URI/SSL/timeouts; automatically loads backend/.env | Existing three positional settings fields still work; DSN excluded from repr |
| backend/app/database.py | Added create_store selection factory; existing JsonStore remains | No fallback when PostgreSQL is selected |
| backend/app/main.py | Uses storage factory and version 0.2.0 | No path/schema changes; main.py remains a shared integration file |
| backend/requirements.txt | Added python-dotenv 1.0.1 | Existing four direct versions retained; preserve teammate dependencies |
| backend/.env.example | Database settings and actual .env loading behavior | Template only; real .env is never bundled or copied by upgrade |
| README.md | Stage 2 entry-point notice | Original quick start remains below the notice |
| docs/architecture.md | Stage 2 notice | Older body marked historical baseline |
| docs/api-contracts.md | Storage/config update notice | Existing seven API contracts preserved |
| docs/integration-guide.md | Stage 1 history notice | New handoff/setup supersedes its storage/.env statements |

These edits are to the local package built in this conversation. Contents of the user's downloaded copy, beyond supplied logs/results, were not inspected. The upgrade utility refuses local source differences instead of discarding them.

## 4. Exact directory structure

New Stage 2 additions are listed in section 2. They fit beneath the original ruralrise-ai root: root setup/upgrade files; backend/app for application code; backend/tests for tests; database/migrations for SQL; docs for evidence/handoff. The existing careers/courses/opportunities JSON files and both engine modules retain their original responsibilities. No frontend files are added. stage2-release-manifest.json is the exact complete packaged file inventory.

## 5. Dependencies and versions

The runtime uses Python 3.13.7 in the verification environment. Base direct dependencies remain FastAPI 0.137.1, Pydantic 2.12.5, Uvicorn 0.49.0 and HTTPX 0.28.1. Added python-dotenv 1.0.1 loads backend/.env; psycopg2-binary 2.9.12 is the optional PostgreSQL driver. Requirements pin observed installed versions, not a claim of latest releases. PostgreSQL/Supabase requires a real server/database supplied by the user. No ORM, microservice, Docker or message broker was introduced.

Install from root: `.\.venv\Scripts\python.exe -m pip install -r backend/requirements-postgres.txt`. Base JSON mode can install backend/requirements.txt alone. Driver-specific tests skip if the optional driver is absent; real database tests also require explicit test settings. The package install into a fresh internet-connected venv was not performed here.

## 6. Installation instructions

Use STAGE2_SETUP.md to preview/apply the guarded upgrade into the original downloaded folder, then install dependencies with its .venv interpreter. The existing .venv is retained. For a clean independent folder: create `.venv` with `python -m venv .venv`, then install requirements-postgres.txt. Open PowerShell in the root and set `$env:PYTHONPATH = (Resolve-Path 'backend').Path`. Activation is optional; use explicit interpreter paths to avoid execution-policy changes.

## 7. Run commands

From root after configuration: `.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000`. Open /docs or /health on that host/port. Stop with Ctrl+C. Setup/check/import commands run in a separate terminal with PYTHONPATH pointing at backend. API startup does not execute migrations, seed rows or automatically import data. /health is still process liveness rather than DB readiness; run `python -m app.db_tools check` for database state.

## 8. Environment variables and configuration

| Variable | Default | Required / secret / behavior |
| --- | --- | --- |
| STORAGE_BACKEND | json | Optional selection: json or postgres; invalid values stop setup |
| DATABASE_URL | empty | Required and secret in postgres mode; PostgreSQL URI only; omitted from Settings repr/log output |
| DB_SSLMODE | require | disable/require/verify-ca/verify-full; use disable only for a local non-TLS server |
| DB_CONNECT_TIMEOUT | 5 | Integer 1–60 seconds; libpq connection timeout |
| DB_STATEMENT_TIMEOUT_MS | 10000 | Integer 100–120000; transaction-local statement timeout |
| DATA_DIR | data | Existing JSON catalog directory, relative to backend |
| STORAGE_FILE | var/demo-store.json | Existing JSON store/import default, relative to backend |
| CORS_ORIGINS | localhost:5173 and 127.0.0.1:5173 HTTP origins | Existing explicit-origin behavior |
| RURALRISE_TEST_DATABASE_URL | unset | Secret, separate disposable database URI for opt-in tests only |
| RURALRISE_ALLOW_DATABASE_TESTS | unset | Must equal 1 to enable real DB tests |
| RURALRISE_TEST_DB_SSLMODE | require | SSL mode for dedicated real test DB only |

backend/.env is loaded with override=False and interpolation disabled; explicit shell values win. The wizard uses hidden input, optionally substitutes/encodes [YOUR-PASSWORD], validates the URI, then updates managed env keys while preserving unrelated entries. It prints no URI/password. Supabase API keys are not used for direct PostgreSQL SQL connections. TLS require encrypts but does not verify hostname; verify-full with a root certificate gives stronger server verification. An existing exported shell URL must be changed/removed separately after editing .env.

## 9. Input data formats

Public API bodies and query parameters are unchanged; see api-contracts.md. Config takes a PostgreSQL URI containing actual host, database and credentials. SQL parameters are bound, not interpolated into query text. Internal get_profile/get_progress take student_id strings; they do not expose a new public read endpoint.

JSON import accepts exactly the Stage 1 StoreData snapshot: profiles array of student_id/profile/created_at and progress array of student_id/course_id/completed/score/updated_at. Existing Pydantic schemas validate shapes and unique keys. Timestamps must be ISO strings with timezone; profile IDs cannot use reserved fictional IDs. Progress references must point to a snapshot profile or built-in demo ID and a current catalog course. Missing files, malformed JSON, unknown references, duplicate keys and invalid timestamps stop the import before database writes. Existing source JSON is preserved.

## 10. Output data formats

All seven HTTP response shapes remain unchanged, including the existing sanitized storage-error detail string and HTTP 503. The CLI emits JSON without connection details:

```json
{"migration_version":1,"applied":true}
{"demo_profiles_inserted":2}
{"backend":"postgres","schema":"ruralrise_backend","migration_version":1,"profiles":2,"progress":0}
{"valid":true,"dry_run":true,"profiles":0,"progress":1}
{"profiles_inserted":0,"progress_inserted":1,"demo_profiles_inserted":0}
```

These are illustrative counts, not promised values in the user's database. Repeated migration returns applied=false. Repeated seed/import skips existing keys. Setup errors exit with status 1 and sanitized diagnostics; they do not print driver exception text containing credentials. API timestamps remain UTC ISO strings. Counts reveal no profile contents.

## 11. Exported interfaces

- `app.database.create_store(settings)` returns JsonStore or PostgresStore. A selected PostgreSQL mode requires its driver; no fallback.
- `app.postgres_store.PostgresStore(settings)` implements create_profile(profile dict), save_progress(update dict), facilitator_students(), internal get_profile(student_id), internal get_progress(student_id), seed_demo(), migrate(), check(), and import_snapshot(validated state).
- create_profile -> student_id/profile dict; save_progress -> existing progress record shape; facilitator_students -> built-in fictional profiles with their database progress. get_profile includes created_at; missing profile raises MissingStudent. get_progress -> course-ordered list. These retrieval methods are internal and do not add routes.
- transaction() opens one connection, establishes transaction-local statement/lock timeouts, commits on success, rolls back on failure and closes the connection. Database/record decoding errors become StorageUnavailable with sanitized logs. MissingStudent remains distinct for the existing 404 mapping. MigrationConflict stops setup for a schema/checksum mismatch.
- `app.storage_import.load_snapshot(Path, set[str]) -> dict` validates a complete import before writes. timestamp(str) enforces timezone-aware ISO input.
- `app.configure_db.write_database_config(url, sslmode='require', path=None)` validates then writes managed settings; main() implements hidden local prompts.
- `app.db_tools.main(argv=None) -> int` provides migrate/check/seed-demo/import-json [--file PATH] [--dry-run]. Dry-run needs no database connection/driver.
- Root upgrade_stage1.py exposes plan_upgrade(source,target,manifest), apply_upgrade(...), and a --target/--dry-run/--apply CLI. The manifest's hashes gate writes; arbitrary incoming release paths escaping roots are rejected.

No new HTTP, React or teammate engine interface was introduced.

## 12. Integration with other team members

Member 1 continues calling the same APIs and retaining student_id from POST /profile. Member 2's career engine and Member 4's datasets/filter adapter are unchanged by this stage. Course IDs still come from Member 4's JSON catalog; the API/import boundaries validate course existence instead of maintaining a duplicate SQL catalog. Member 5 continues using the same fictional facilitator/progress shapes; client queueing and stale-event ordering remain unresolved. Member 3 configures database storage and coordinates migration review. Real teacher lookup must wait for authentication/relationship checks rather than exposing new profiles in the demo overview.

The PostgreSQL schema is deliberately separate from public/shared tables. It stores IDs as text to preserve existing UUID strings and fictional IDs; it does not alter the older shared-schema proposal. Review this migration before applying it to any shared/team database. No teammate integration was executed because their code was unavailable.

## 13. Minimal working example

After configure_db, migrate and seed-demo, start the API and POST the existing progress JSON:

```json
{"student_id":"demo-student-001","course_id":"demo-safety","completed":true,"score":80}
```

Expected HTTP 200 with saved=true and the progress record. GET /facilitator/students should show the completion. Stop/restart Uvicorn and retrieve it again. Run db_tools check to confirm PostgreSQL selection/counts. Do not assume an old JSON completion has migrated unless import-json was run. Detailed PowerShell commands are in STAGE2_SETUP.md.

## 14. Testing instructions and executed results

From root with backend on PYTHONPATH, run `python -m unittest discover -s backend/tests -v` using the project's .venv interpreter. The independent suite covers the original 24 contracts and JSON behaviors plus settings validation, literal secret handling, env precedence, bound SQL parameters, commit/rollback/close control, sanitized outages/no JSON fallback, demo visibility, migration tracking/conflicts, import validation, idempotent import behavior and guarded upgrade/data preservation.

Real SQL tests require a separate dedicated RURALRISE_TEST_DATABASE_URL and explicit RURALRISE_ALLOW_DATABASE_TESTS=1. They test migration re-entry, Unicode/SQL punctuation, profile retrieval, upserts/new connections, HTTP response parity against PostgreSQL, unknown IDs/courses, real score/FK rollback, concurrent writes, timestamp/ID preservation, no overwrite on reimport and RLS state. They never drop tables/schemas and remove only IDs generated by their test cases. Their default skip is deliberate and is not a passed DB test.

Actual run counts and any local database attempt are recorded in stage2-verification.json; raw captured output is in stage2-test-results.txt. The test-only event loop avoids the sandbox's internal socketpair problem while leaving application handlers/threadpool dispatch intact. No hosted Supabase account or credential was supplied, so this user's actual hosted connection remains unverified regardless of unit-test results.

Final executed result: **60 tests passed, zero failures/errors/skips**, including all ten real database tests on isolated local PostgreSQL 17.5. A separate PostgreSQL process restart preserved a saved score of 87. The private test server was shut down cleanly. The earlier independent run passed 50 tests while live database tests were disabled; an initial cross-session database attempt failed because the background test-server lifetime did not cover the next execution. The final test run kept the server and tests in one execution session and supersedes that unsuccessful attempt. No application change was needed to resolve that test-server lifetime issue.

## 15. Known limitations and incomplete work

- No authentication/authorization; use fictional data and local-only access until the next stage. RLS/revokes protect database public roles but the backend owner connection bypasses them; API caller permissions still need implementation.
- Facilitator list remains two built-in fictional learners. Newly created profiles do not appear there.
- PostgreSQL driver and SQL code cannot establish a hosted connection without the user's actual database/credentials/network. Run setup/check and the real test suite in the intended environment before deployment.
- One new connection per operation, no application connection pool. Appropriate for a small prototype; tune limits/pooling before load increases. Session pooler can provide provider-side pooling.
- Course catalog stays JSON. Direct internal save_progress assumes the HTTP/import boundary checked course validity; no SQL foreign key to a course table is created.
- Profile POST still creates a new ID each time. Profile update and authenticated read endpoints need a separately agreed API change.
- Progress remains last-write-wins. Offline event ordering and conflict detection are not solved.
- JSON import is insert-only by existing keys. It deliberately does not overwrite newer database rows or perform reverse sync.
- Setup requires schema ownership/creation permission. No least-privilege backend role or auth policies were provisioned.
- Binary driver package is a development convenience; review deployment packaging and current driver guidance before production.
- Guarded upgrade copies files sequentially. It backs up old code but a filesystem error may leave a partially copied upgrade; inspect its record/backup before retrying.
- Real engine matching, verified opportunities, frontend, voice, PWA and shared deployment remain other unfinished project components.

## 16. Files that must not be overwritten

Preserve existing frontend files, backend/app/schemas.py, both engine modules, all Member 4 catalogs, database/schema.sql, .env, .venv and backend/var data. The upgrade manifest excludes these runtime/team-owned items. main.py/config.py/database.py/requirements and docs need reviewed merges if the local versions differ from the original package; the upgrade tool refuses such conflicts. Existing public tables and other schemas are never altered by the new migration. Do not add ruralrise_backend to frontend-exposed Supabase schemas just to make the demo work.

## 17. Assumptions and decisions

Selected backend is explicit, not inferred merely from a populated URL. JSON remains the backward-compatible default. PostgreSQL operations use fixed schema-qualified tables, bound parameters, atomic conflict upserts and short transactions. DDL runs only through a reviewed setup command. The migration metadata stores the normalized SQL source checksum and refuses untracked/changed schemas rather than modifying them. IDs are preserved as text; scores and references have database constraints. Auth and API expansion are deferred rather than silently inventing shared interfaces. Supabase/local PostgreSQL both use the same adapter; the actual connection URI must be copied/provided by the user.

## 18. Exact integration procedure

1. Keep the original package and stop Uvicorn. Extract Stage 2 separately.
2. Preview/apply the guarded upgrade to the independent Member 3 folder, or manually merge files if local code differs. Inspect the printed backup location.
3. For the shared Git repository, create a feature branch from the agreed base, inspect source differences and ask owners to review shared-file collisions. No force overwrite, automatic PR or push is performed here.
4. Install requirements-postgres.txt with the intended .venv interpreter.
5. Confirm database/contract/schema choices with the team, then obtain the user's database connection privately.
6. Run the hidden configuration wizard, set PYTHONPATH, apply migrate, seed-demo and check. Check existing environment variables if the mode appears wrong.
7. Back up and dry-run/import the existing local JSON snapshot if needed. Verify counts; source file remains unchanged.
8. Start Uvicorn and test all seven endpoints, including save/retrieve/restart using the database.
9. Run independent tests; use a dedicated disposable test database for real integration tests.
10. Review Git diff, exclude credentials/runtime data, stage only reviewed files, commit and push the feature branch under the team's workflow.
11. Open a PR describing database selection, unchanged API contracts, isolated migration, test evidence and unfinished authentication. Review/merge with relevant members; rerun the shared demo after merge.

For rollback, switch STORAGE_BACKEND=json only after stopping the server and understanding that later DB progress is not in the old JSON file. Restore code individually from the upgrade backup or original release if needed. No database rows are removed by a mode/code rollback; no destructive SQL rollback is supplied.

## 19. Integration checklist

- [ ] Shared migration/contract review complete.
- [ ] Upgrade dry-run reviewed and local source merged without conflicts.
- [ ] Old JSON data and .env preserved; code backup recorded.
- [ ] Database driver installed in the intended environment.
- [ ] Actual connection URI/SSL configured privately.
- [ ] Migration applied or recognized; demo rows seeded.
- [ ] Database check confirms postgres and expected schema/counts.
- [ ] Old JSON import validated/executed if required.
- [ ] Public JSON contracts verified with frontend/engines.
- [ ] Independent tests passed; real DB tests run on a separate disposable DB.
- [ ] Restart/retrieval checked against the actual intended database.
- [ ] Auth/real student access still clearly marked unfinished.
- [ ] Secrets/runtime data excluded; PR reviewed; shared integration verified.

These are user/team environment checks, not assertions that a hosted environment was configured by this build.

## 20. Final status report

| Requirement | Status | Evidence | Remaining work / owner |
| --- | --- | --- | --- |
| PostgreSQL storage adapter and configuration | Complete and verified on local PostgreSQL | postgres_store.py/config.py; 60 passing tests | Configure/verify intended hosted DB; Member 3 |
| Public API compatibility | Verified in independent regression suite | Original 24 tests retained | Team integration; Members 1/3/5 |
| Migration, seeding, check CLI | Implemented; SQL operations verified on local PostgreSQL | Source and migration tests | Apply reviewed migration in user's database; Member 3 |
| JSON snapshot import | Implemented | Validation/transaction/idempotency tests | Import user's actual snapshot; Member 3 |
| Guarded upgrade and setup/handoff | Implemented and independently tested | Hash/conflict/backup/data-preservation tests | Run upgrade/review local differences; user |
| Real database integration | Complete and verified on local PostgreSQL | Ten real SQL tests; actual database restart; stage2-verification.json | Verify intended hosted DB; Member 3 |
| Hosted Supabase account/connection | Not configured | No credentials/account supplied | User creates/selects project and configures locally |
| Authentication/real facilitator access | Not implemented | Fictional-only behavior retained | Next stage; Members 3/5 |
| Real engine/data/frontend/offline | Not changed by this release | Original ownership boundaries | Teammates integrate through reviewed contracts |
