# Member 3 backend handoff — authentication/access review candidate 0.3.0

This handoff covers the backend source in this candidate. The team's actual frontend, engines, researched catalogs, hosted Supabase project and deployment account were not supplied. START_HERE.md contains complete beginner commands; TEAM_INPUTS.md names the outstanding inputs. This is a component review candidate until those integrations and shared-interface decisions are verified.

## 1. Component overview

Implemented: the seven agreed REST APIs, Pydantic validation, CORS/errors, JSON/PostgreSQL storage, versioned schema creation/checks, seed/import utilities, opt-in Supabase user-token verification, student-owned profile/progress writes, profile updates retaining IDs, teacher-assigned reads, operator role/assignment controls, optional account reads, production configuration guards and a hosting entrypoint. Defaults retain the prior fictional/demo behavior. Current source has no frontend/login UI, real career intelligence, real opportunity data or offline client queue.

## 2. Files created

New since Stage 2: app/auth.py (provider verification/errors/principal), app/identity_store.py (roles/ownership/assignments), app/account_schemas.py (proposed read models), app/configure_auth.py (local setup), migrations/002_identity_access.sql (identity tables), tests/test_auth_access.py and tests/test_identity_integration.py, backend/start_server.py, root Procfile, START_HERE.md, upgrade_backend.py, backend-upgrade-manifest.json, docs/TEAM_INPUTS.md, docs/auth-contract-proposal.md, this handoff, stage3-test-results.txt, stage3-verification.json and backend-release-manifest.json. Complete exact packaged inventory and hashes are in backend-release-manifest.json; it excludes itself.

Core runtime files are required for their selected modes; configure/upgrade helpers and docs aid integration; tests/evidence support verification. New identity/auth files are Member 3's responsibility. All teammate catalogs/engines and existing shared schemas remain untouched. The archive excludes real .env files, runtime stores, virtual environments, test clusters and credentials.

## 3. Existing files modified

main.py integrates optional auth/ownership dependencies while retaining existing bodies; config.py adds validated auth/production flags and hidden-key repr behavior; postgres_store.py recognizes migration versions 1/2 and applies 002 explicitly; db_tools.py adds migration/operator commands; requirements.txt clarifies HTTPX is now a runtime Auth client; backend/.env.example adds placeholders; selected root/docs files point to the current candidate. Existing PostgreSQL integration assertions now accept supported migration 1/2 and verify the original tables as a subset of the expanded RLS-protected schema. No public input model or engine/dataset file was overwritten. All changes are local; no shared repository commit/push/merge occurred.

## 4. Exact directory structure

The original ruralrise-ai structure is retained. New runtime modules are under backend/app, new tests under backend/tests, SQL 002 under database/migrations, deployment entrypoint under backend, and setup/upgrade/Procfile at root. Current evidence and handoff are under docs. backend-release-manifest.json enumerates every packaged path. No frontend directory is claimed. Existing runtime backend/var and .env are intentionally excluded and preserved by upgrade helpers.

## 5. Dependencies and versions

Verified installed runtime: Python 3.13.7; FastAPI 0.137.1; Pydantic 2.12.5; Uvicorn 0.49.0; HTTPX 0.28.1; python-dotenv 1.0.1; psycopg2-binary 2.9.12. No JWT crypto/password library or new service architecture is required: the configured Supabase Auth server verifies access tokens. PostgreSQL/Supabase and frontend login are external runtime dependencies. Install backend/requirements-postgres.txt through the intended .venv interpreter. A fresh internet package installation was not executed here.

## 6. Installation instructions

Extract separately and follow START_HERE.md. Preview upgrade_backend.py with --from-stage 1 or 2 and the existing root, then --apply after review. It checks source hashes/conflicts, backs up old code and preserves .env/.venv/var/catalogs/engines/frontend. Install requirements with `.\.venv\Scripts\python.exe -m pip install -r backend/requirements-postgres.txt`. Set `$env:PYTHONPATH = (Resolve-Path 'backend').Path`. For a clean folder first create .venv with python -m venv .venv. Script activation is optional. Backups contain prior code, not a database rollback. A filesystem copy failure can leave a partial upgrade; inspect its record/backup before retrying.

## 7. Run commands

Local: `.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000`. /docs provides examples/Authorize in secure mode; /health is liveness. Stop with Ctrl+C. Deployment: build with backend/requirements-postgres.txt and run `python backend/start_server.py`. It reads PORT/HOST, defaults to public binding only in production, and checks migration 002 before production startup. Actual hosting/TLS/domain/runtime settings remain to be configured on the team's chosen provider.

## 8. Environment variables and configuration

Prior DATA_DIR/STORAGE_FILE/CORS_ORIGINS and PostgreSQL settings retain their meaning. Added AUTH_MODE=demo|supabase (default demo), SUPABASE_URL (HTTPS project root), SUPABASE_PUBLISHABLE_KEY (hidden config value), AUTH_TIMEOUT_SECONDS=5 (1–30), ENABLE_ACCOUNT_ROUTES=false (strict bool), APP_ENV=development|production. Secure mode requires PostgreSQL and provider config. Production rejects demo mode and non-encrypted DB_SSLMODE=disable. The config repr excludes DB URI and publishable key. backend/.env loads without interpolation and without overriding shell variables. No actual credentials are included. configure_db/configure_auth prompt locally; never place passwords/DSNs/access tokens in chat or shared files.

## 9. Input formats

Existing profile/recommendation/progress bodies and opportunity filters remain in api-contracts.md. Secure private requests add the proposed Authorization: Bearer <Supabase access_token> header. The backend sends that token to the configured project's fixed HTTPS /auth/v1/user endpoint with its configured publishable key; it does not accept user-selected verification URLs or follow redirects. Role values in submitted profile/user metadata are never an authorization source. Operator commands accept Auth UUIDs/student IDs and role/student-teacher choices. JSON import retains Stage 2 validated snapshot rules; imported rows are unowned until explicitly linked by an operator. Link commands reject demo IDs/other ownership.

## 10. Output formats

Existing seven responses retain their JSON fields. Demo facilitator output remains fictional-only. Secure facilitator output uses the same students/profile/progress structure but includes only assigned learners. Authenticated profile POST returns the same student_id/profile envelope/status while preserving that account's ID on updates. Optional account/read JSON is documented precisely in auth-contract-proposal.md and disabled by default. Missing/invalid token -> 401 with WWW-Authenticate; wrong role/inactive -> 403; unknown/unowned progress ID -> 404; upstream Auth outage/malformed response -> sanitized 503; storage/validation errors retain prior behavior. No tokens/passwords are returned by the backend.

## 11. Exported functions, components and endpoints

Original app/main.py routes and storage methods remain. SupabaseAuthenticator(settings).verify(token)->verified user UUID or InvalidToken/AuthUnavailable. Principal(user_id,role) is an internal immutable record. PermissionDenied signals role/active failure. IdentityStore wraps the PostgreSQL store: ensure_user(subject)->Principal; set_role(subject,role), set_active(subject,bool); save_profile(subject,dict)->ProfileResponse; owned_profile(subject)->ProfileResponse; save_progress(subject,dict)->ProgressRecord; own_progress(subject)->list; assign_student(teacher,student), unassign_student(...); assigned_students(teacher)->facilitator list; link_profile(subject,student)->link status. Inputs are UUID-normalized where appropriate, SQL values are parameters, and related writes/ownership checks share transactions. No public privilege-granting API exists.

PostgresStore.migrate_auth() adds/rechecks 002; migrate()/check() understand known versions 1/2 without modifying 001. CLI commands: migrate, migrate-auth, check, seed-demo, import-json, set-role, assign-student, unassign-student, enable-user, disable-user and link-profile. Configure helpers are local utilities, not HTTP endpoints. Optional GET /account, GET /profile and GET /progress are proposed additions gated by ENABLE_ACCOUNT_ROUTES in secure mode; use the proposal doc before enabling them.

## 12. Integration with teammates

Member 1 owns login UI/session refresh and the existing API service; review Supabase choice, required headers, profile upsert semantics and optional reads. Member 2 supplies actual career/roadmap module/signatures/requirements/examples. Member 4 supplies actual catalogs and eligibility/filter logic. Member 5 supplies facilitator/offline queue formats and reviews assigned-student/read-only teacher behavior. Operators assign roles/relationships through trusted CLI until an admin UI/API is agreed. Actual teammate integration remains untested; all required files are listed in TEAM_INPUTS.md. Existing engine/catalog placeholders remain explicitly mocks and must not overwrite teammate work.

## 13. Minimal working example

After database config/migrations and approved secure setup: Member 1 signs a student in through Supabase, obtains access_token and sends the existing profile body with a Bearer header. POST /profile returns its owned student_id. POST /progress with that ID saves progress; substituting another student's ID returns 404. After operator promotion/assignment, the teacher's GET /facilitator/students returns the assigned student's progress. Optional own-read routes restore a learner's dashboard if the team enables them. START_HERE.md contains executable setup/operator commands. This example needs actual user tokens; fake fixtures in tests are not usable hosted login credentials.

## 14. Testing instructions and actual results

Run the .venv unittest discovery command from root with backend on PYTHONPATH. Independent tests cover original JSON/API regression, PostgreSQL storage/migration/import, upgrade safety, provider request/status/timeout handling, config guards, missing/wrong token, role spoof attempts, student/teacher route permissions, forged IDs, optional route gating and Authorization CORS. Opt-in real SQL tests use a dedicated disposable database to test roles/ownership/profile upserts/concurrency/assignments/revocation/link protection and authenticated HTTP handler behavior against actual SQL. Only the external Auth response is substituted. The in-process event loop avoids the sandbox socketpair problem; it does not patch application handlers.

Actual run counts, skips and environment are in stage3-verification.json; raw output is stage3-test-results.txt. The build also tests persistence through a real PostgreSQL process restart. No hosted Supabase session, actual frontend or cloud deployment was available to test. These limitations remain despite passing component tests. Negative-case error logs are intentional assertions, not failures.

## 15. Known limitations and incomplete work

Actual Member 2/4 modules are missing; fixture recommendations/opportunities are not real matching/verified data. Member 1/5 login/API/offline contracts and team approvals are missing. Hosted database/Auth and cloud deployment remain unconfigured. Account read routes are gated proposals. Student-submitted scores are validated ranges, not server-graded exams. Offline progress remains last-write-wins and needs the real client event/retry contract. Imported legacy profiles need trusted operator identity verification before linking. Role/assignment admin is CLI-only; no admin UI/password reset UI is supplied. Mentor/employer/paid-module extensions are outside the current seven-endpoint backend contract and need agreed scope/interfaces. One DB/Auth connection per operation is suitable for the prototype, not a load-tested capacity claim. Table RLS/revokes protect database public roles; the backend owner connection relies on the tested application authorization guards.

## 16. Files not to overwrite

Preserve frontend App.jsx/main.jsx/services/api.js/package.json and PWA files; career_engine.py/opportunity_engine.py; all Member 4 catalogs; app/schemas.py; database/schema.sql and already applied migration 001; real .env/.venv/var. The upgrade allowlists exclude these teammate/runtime files. main/config/storage/CLI/tests/docs need a reviewed merge when local versions differ; hash checks stop silent replacement. Migration 002 adds separate identity tables and version metadata rather than changing public/shared tables. No shared repository files were written remotely.

## 17. Assumptions and design decisions

Supabase Auth is a proposed integration choice within the agreed stack, not a claim about an unseen frontend's existing implementation. Default demo mode protects compatibility while review is pending; it is development-only. Roles are database-managed, stable profile ownership is enforced transactionally, teacher reads are assignment-scoped, and private failures never fall back to demo data. Account reads are opt-in because they extend the original contract. API additions/security enablement and SQL deployment require team coordination. The actual signed-in user is determined by provider verification, not a client student_id, decoded-only JWT or editable metadata.

## 18. Exact integration procedure

Preview the guarded upgrade from the correct Stage 1/2 baseline into the independent Member 3 folder; stop the server and apply after review. Install dependencies and retain local config/data. Collect TEAM_INPUTS, agree auth/optional routes and merge actual engine/dataset code using their owners' interfaces. Configure database and provider locally, review/apply migrations, link any legitimate imported profiles, set teacher roles/assignments and test real student/teacher sessions. In the shared repository create a feature branch from the agreed base, inspect/merge source changes individually, exclude secrets/data, run tests, stage reviewed files, commit/push and request relevant owner review. Select hosting with the coordinator, configure production runtime secrets/CORS/PORT, apply reviewed migrations/checks, deploy the exact reviewed source and test the real end-to-end app. No branch, PR, cloud account or deployment was created by this build.

## 19. Integration checklist

- [ ] Member 2/4 real modules/data and requirements received.
- [ ] Member 1/5 login/API/offline formats reviewed.
- [ ] Auth/header/role/assignment/optional-read decisions agreed.
- [ ] Source upgraded/merged with existing teammate files preserved.
- [ ] Real database/Auth configured privately; migrations/check pass.
- [ ] Real student-versus-student and teacher assignment tests pass.
- [ ] Actual engine/data/frontend/offline integration passes.
- [ ] Production runtime/repository/hosting agreed and deployed.
- [ ] Complete hosted journey tested; final limitations recorded.
- [ ] Secrets/runtime data excluded; PR/hand-off reviewed by team.

These boxes remain open because they refer to the actual team environment, not the isolated component tests.

## 20. Final status

| Area | Status | Evidence / remaining dependency |
| --- | --- | --- |
| Existing API/storage compatibility | Implemented/tested | Regression suite and unchanged existing model/catalog/engine files |
| PostgreSQL persistence/migrations/import | Implemented/tested locally | Real SQL tests and database restart |
| Auth verification and failure handling | Implemented/tested at provider boundary | Controlled Auth responses; real project/session check pending |
| Student ownership/teacher assignment | Implemented/tested on PostgreSQL | Real role, ID-forgery, assignment and concurrency checks |
| Account-read additions | Implemented, disabled pending review | auth-contract-proposal.md |
| Production entrypoint/config guards | Implemented | Actual host/runtime/repository still needed |
| Actual career/opportunity/frontend/offline integration | Blocked on missing teammate inputs | TEAM_INPUTS.md |
| Final hosted acceptance/handoff | Pending configured services and real integrations | Cannot be claimed complete from mocks |
