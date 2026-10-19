> Historical handoff. Current implementation, setup and verification are in [README.md](README.md), [QUICKSTART.md](QUICKSTART.md) and [docs/completion-handoff.md](docs/completion-handoff.md). Do not run older incremental upgraders against this full source release.

# Member 3 backend — authentication/access review candidate

> **Latest:** MEMBER2_REVIEW_START_HERE.md covers the actual Member 2 engine merged into this backend and the Member 5 frontend. It supersedes earlier missing-engine/source statements and identifies the correct baseline-specific updater.

> **Updated integration review:** Member 5's actual frontend and the project guide have now been supplied. Start with `REVIEW_START_HERE.md` for the combined review bundle, current results and exact remaining fixes. Statements below about missing Member 5 source describe the earlier backend-only release; the new review supersedes them.

The independently implementable backend code now includes APIs, JSON/PostgreSQL persistence, migrations/imports, Supabase access-token verification, backend-managed student/teacher roles, profile ownership/update, assigned-student access, administrative setup commands and a deployment entrypoint.

**This is ready for component review and local integration. It is not a claim that the team's project is fully integrated or deployed.** Member 2/4 source, Member 1/5 contracts, the actual Supabase configuration and a hosting/repository target are still required to verify the final handoff. Read `docs/TEAM_INPUTS.md` for the exact request to each teammate.

## Preserve current interfaces while the team reviews security

The default AUTH_MODE=demo keeps the original seven APIs and JSON bodies. It uses fictional facilitator records and remains development-only. AUTH_MODE=supabase is an opt-in proposal: it requires `Authorization: Bearer <Supabase access_token>` on POST /profile, POST /recommendations, POST /progress, and GET /facilitator/students. Public /health, /courses and /opportunities stay public.

Review `docs/auth-contract-proposal.md` with Members 1 and 5 before enabling secure mode. Optional GET /account, GET /profile and GET /progress are also disabled until explicitly enabled with ENABLE_ACCOUNT_ROUTES=true after review. No teammate engine, catalog, frontend file or existing schema model was replaced in this build.

## Upgrade from your existing Stage 1 or Stage 2 folder

1. Stop Uvicorn. Extract this candidate into a **separate directory**.
2. Open PowerShell in the new candidate's inner `ruralrise-ai` folder.
3. If you already applied Stage 2, use --from-stage 2 below. If your working folder still contains only the original Stage 1 code, use --from-stage 1.

```powershell
python upgrade_backend.py --from-stage 2 --target 'C:\Users\Vithyasagar\Downloads\RuralRise_AI_Member3_Backend_Handoff\ruralrise-ai' --dry-run
python upgrade_backend.py --from-stage 2 --target 'C:\Users\Vithyasagar\Downloads\RuralRise_AI_Member3_Backend_Handoff\ruralrise-ai' --apply
```

The upgrade compares release/original hashes and stops on source conflicts. Prior code is backed up under the printed backend/var/stage2-upgrade-<timestamp> directory (the reused backup helper retains that folder prefix). It preserves .env, .venv, saved data, both engine modules, all catalogs, shared schema files and frontend work. Sequential file copies are not a filesystem transaction; inspect the backup record if a copy fails. If an original file differs, merge it with its owner rather than forcing the utility.

4. Return to the existing working folder, install requirements and set PYTHONPATH:

```powershell
Set-Location 'C:\Users\Vithyasagar\Downloads\RuralRise_AI_Member3_Backend_Handoff\ruralrise-ai'
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-postgres.txt
$env:PYTHONPATH = (Resolve-Path 'backend').Path
```

The consolidated guide is this file. Older Stage 1/2 guides/manifests are historical release references and their old upgrade commands should be used only from their original release archives. This candidate uses upgrade_backend.py and backend-upgrade-manifest.json.

## Configure PostgreSQL first

Use the team's actual PostgreSQL/Supabase database. No hosted account or credentials were supplied to this build.

```powershell
.\.venv\Scripts\python.exe -m app.configure_db
.\.venv\Scripts\python.exe -m app.db_tools migrate
.\.venv\Scripts\python.exe -m app.db_tools check
```

The wizard prompts privately for the URI and handles a [YOUR-PASSWORD] placeholder. For Supabase, copy the actual URI from Connect; Session pooler is suitable for an IPv4-only development network. Choose SSL require (or verify-full with the provider root certificate). Use disable only with a local non-TLS development server; production refuses it. See the official connection guide: <https://supabase.com/docs/guides/database/connecting-to-postgres>.

The original database/schema.sql is historical. Migration 001 creates the isolated ruralrise_backend schema. Migration 002 adds identity/ownership/assignment tables without changing old IDs or public/shared tables. Ask the team to review new migrations before applying to a shared database. Existing untracked schemas or changed checksums cause setup to stop.

For an existing JSON snapshot, back it up and use the Stage 2 import command. Import validates references/timestamps and is atomic/insert-only; existing DB rows win. Imported profiles are initially unowned. They are not automatically claimed by a person merely because that person knows a student ID.

```powershell
.\.venv\Scripts\python.exe -m app.db_tools import-json --file backend/var/demo-store.json --dry-run
.\.venv\Scripts\python.exe -m app.db_tools import-json --file backend/var/demo-store.json
```

Skip those two commands if no snapshot exists. The source is not changed. Backup instructions and detailed import semantics are in STAGE2_SETUP.md.

## After team approval, configure secure mode

Member 1 owns the login UI/session lifecycle using Supabase Auth. The frontend sends the access token in the Authorization header; passwords/refresh tokens stay in the Auth flow and are not handled by this backend. On each private request the backend verifies the token with the configured Supabase Auth /user endpoint, then reads the app role/active state from backend-managed database records. User-editable metadata is not trusted for roles.

```powershell
.\.venv\Scripts\python.exe -m app.configure_auth
.\.venv\Scripts\python.exe -m app.db_tools migrate-auth
.\.venv\Scripts\python.exe -m app.db_tools check
```

The wizard asks for the project URL and a hidden publishable key. It sets AUTH_MODE=supabase and leaves optional account-read routes disabled. To enable reviewed account reads, set ENABLE_ACCOUNT_ROUTES=true in backend/.env. With migration 002 applied, check returns migration_version=2. Never edit a previously applied SQL file to resolve a checksum conflict; review it with Member 3.

Required configuration (placeholders):

```dotenv
STORAGE_BACKEND=postgres
DATABASE_URL='postgresql://USER:ENCODED_PASSWORD@HOST:5432/postgres'
DB_SSLMODE=require
AUTH_MODE=supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PROJECT_PUBLISHABLE_KEY
AUTH_TIMEOUT_SECONDS=5
ENABLE_ACCOUNT_ROUTES=false
APP_ENV=development
```

backend/.env loads automatically; shell variables override it. Restart the server after changes and check/remove stale task environment values if needed. Real passwords, DSNs, tokens and keys belong in local/runtime configuration, not chat, Git or handoff archives.

## Assign roles and students through trusted operator commands

New verified accounts default to student. After a student signs in and posts their profile, retain the returned student_id. Reposting the authenticated profile updates that same profile/ID, so retries do not create another owned profile. The response remains the existing student_id/profile envelope and HTTP 201 for compatibility.

The operator obtains a teacher's Supabase user UUID from that person's actual Auth account and promotes it locally. Replace the placeholders in these commands:

```powershell
.\.venv\Scripts\python.exe -m app.db_tools set-role --user-id TEACHER_AUTH_UUID --role teacher
.\.venv\Scripts\python.exe -m app.db_tools assign-student --teacher-id TEACHER_AUTH_UUID --student-id SAVED_STUDENT_ID
```

These commands require the backend database credential. There is no public role-promotion/assignment API. A student cannot self-promote through profile fields or metadata. Teachers have read access to assigned learners only; they cannot submit a student's learning progress. Students write/read their own records only. Forbidden writes using someone else's student_id return the same 404 as an unknown student, avoiding an ID-existence leak.

Administrative maintenance:

```powershell
.\.venv\Scripts\python.exe -m app.db_tools unassign-student --teacher-id TEACHER_AUTH_UUID --student-id SAVED_STUDENT_ID
.\.venv\Scripts\python.exe -m app.db_tools disable-user --user-id AUTH_UUID
.\.venv\Scripts\python.exe -m app.db_tools enable-user --user-id AUTH_UUID
```

To associate an imported, non-demo, currently unowned profile with a verified student's Auth UUID, an operator can use `link-profile --user-id AUTH_UUID --student-id EXISTING_STUDENT_ID`. It refuses another owner's profile, a user who already owns a different profile, and built-in demo records. Verify identity externally before an operator links a legacy profile; this is not a public student claim mechanism.

## Run and test

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Open <http://127.0.0.1:8000/docs>. In secure mode, Swagger's Authorize control accepts a real signed-in user's access token. Without a token, private routes return 401; a student calling the teacher endpoint returns 403. A teacher with no assignments gets an empty students list, not all database records. Auth-provider outages return 503, not an unauthenticated fallback. Roles/active state are read on every request.

Run tests separately:

```powershell
$env:PYTHONPATH = (Resolve-Path 'backend').Path
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
```

Real PostgreSQL suites require a separately configured disposable test database and RURALRISE_ALLOW_DATABASE_TESTS=1, as documented in STAGE2_SETUP.md. Otherwise they skip deliberately. Actual evidence for this candidate is docs/stage3-test-results.txt and docs/stage3-verification.json. Hosted Supabase Auth responses are substituted in automated tests; actual project/session verification remains a required integration check with Member 1.

## Deployment preparation

The backend has a provider-neutral Procfile and `python backend/start_server.py` entrypoint. On a host chosen by the team, install backend/requirements-postgres.txt, configure runtime secrets, set APP_ENV=production, AUTH_MODE=supabase, STORAGE_BACKEND=postgres, encrypted DB_SSLMODE and the real CORS_ORIGINS. Apply/review migrations and run db_tools check first. The entrypoint reads the host's PORT, binds publicly in production, and refuses production demo mode or a database below migration 002. HTTPS termination/domain setup belongs to the selected hosting environment.

No host account, shared repository URL or deployment authorization/configuration was supplied. No cloud deployment was created. Before final acceptance verify real login, student A versus student B, assigned versus unassigned teachers, database restart, valid/invalid engine output, real opportunity filters and Member 5's offline queue replay on the hosted application.

## What remains before final handoff

- Team approval of the authorization header, login ownership, proposed account reads, role management and assignment process.
- Actual Member 2/4 modules/data and Member 1/5 integration expectations; mocks remain until those arrive.
- User's real database/Auth setup and a real student/teacher session test.
- A real repository/hosting target and deployed end-to-end test.
- Any offline event-ordering/idempotency contract required by Member 5; current progress remains a last-write-wins upsert.

Backend API/storage/access-control code and independent tests are provided. These external integration/configuration steps cannot be truthfully marked complete from mock modules or unconfigured services.
