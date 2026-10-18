# Stage 2 — PostgreSQL/Supabase persistence

> Historical Stage 2 setup. For the current authentication/access candidate, start with START_HERE.md and use upgrade_backend.py. The original Stage 2 upgrader is intended for its original archive; schema version may now be 2 after the separately reviewed authentication migration.

This release adds a PostgreSQL storage adapter behind the existing seven APIs. It preserves StudentProfile, recommendation, progress and facilitator JSON formats. JSON mode still works. Career/opportunity mocks and teammate catalogs are preserved by the upgrade utility. Authentication and real teacher authorization are the next stage.

## Upgrade your existing working folder

1. Stop Uvicorn using Ctrl+C.
2. Extract this Stage 2 archive into a **separate folder**, and open PowerShell in its inner `ruralrise-ai` directory. Keep your existing working folder where it is.
3. Preview the guarded upgrade. For the existing folder you showed in chat:

```powershell
python upgrade_stage1.py --target 'C:\Users\Vithyasagar\Downloads\RuralRise_AI_Member3_Backend_Handoff\ruralrise-ai' --dry-run
```

4. Review the listed files, then apply:

```powershell
python upgrade_stage1.py --target 'C:\Users\Vithyasagar\Downloads\RuralRise_AI_Member3_Backend_Handoff\ruralrise-ai' --apply
```

The utility checks original-file hashes before any source copying and refuses to overwrite changed source or conflicting new filenames. It backs up previous code under `backend/var/stage2-upgrade-<timestamp>/`. It preserves `.venv`, `backend/.env`, `backend/var/demo-store.json`, catalogs, career_engine.py, opportunity_engine.py and frontend files. If it reports a conflict, manually review/merge that named file; do not force an overwrite. File copies are sequential, not a filesystem transaction; if a copy fails, inspect the backup/upgrade-record before retrying. You can alternatively use this new folder as a clean working copy and retain the old one as a backup, but it will need its own virtual environment and a copied JSON snapshot if you want to import old progress.

5. Return to your existing working folder and install database dependencies:

```powershell
Set-Location 'C:\Users\Vithyasagar\Downloads\RuralRise_AI_Member3_Backend_Handoff\ruralrise-ai'
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-postgres.txt
$env:PYTHONPATH = (Resolve-Path 'backend').Path
```

The PostgreSQL requirements include the base requirements, python-dotenv 1.0.1 and psycopg2-binary 2.9.12. The prior backend stack is unchanged.

## Create/configure your database

Use your team's agreed PostgreSQL/Supabase database. No account or hosted database was created for you by this release. For a new Supabase project, create it through the Dashboard, retain its database password privately, and open **Connect**. For a persistent backend on an IPv4-only development network, select **Session pooler** and copy the provided PostgreSQL URI; copy the exact host/username instead of constructing them. Direct connection is also valid when your network supports the project's address family. Official connection guide: <https://supabase.com/docs/guides/database/connecting-to-postgres>.

Configure locally using a hidden-input wizard:

```powershell
.\.venv\Scripts\python.exe -m app.configure_db
```

Paste the URI when prompted. The terminal intentionally does not display your input. If it contains `[YOUR-PASSWORD]`, the wizard asks for the password separately and URL-encodes it automatically. Choose the default SSL mode `require` for Supabase. The wizard writes only database settings to `backend/.env`; existing unrelated env settings are preserved. Do not send the URI/password in chat or commit that file.

For an existing local PostgreSQL server, provide its real connection URI and choose `disable` only for that local non-TLS server. The code supports both providers through the same SQL adapter. `require` encrypts traffic; for certificate/hostname verification choose `verify-full` and provide the provider's root certificate via `sslrootcert` in the URI. A Supabase publishable/anon/service key is not a PostgreSQL connection URI and is not used by this adapter.

The resulting configuration contains these values (placeholders only):

```dotenv
STORAGE_BACKEND=postgres
DATABASE_URL='postgresql://USER:ENCODED_PASSWORD@ACTUAL_HOST:5432/postgres'
DB_SSLMODE=require
DB_CONNECT_TIMEOUT=5
DB_STATEMENT_TIMEOUT_MS=10000
```

Shell environment variables override `.env`. If this terminal has older settings, open a fresh terminal and set PYTHONPATH again, or remove only the stale task settings with `Remove-Item Env:STORAGE_BACKEND, Env:DATABASE_URL, Env:DB_SSLMODE -ErrorAction SilentlyContinue`. Relative DATA_DIR/STORAGE_FILE paths still resolve under backend. JSON remains the default if STORAGE_BACKEND is omitted. A selected PostgreSQL backend never falls back to JSON after a failure.

## Apply the reviewed migration and seed demo learners

Share the migration with your team before applying it to a shared database. It creates only the separate `ruralrise_backend` schema. It does not alter public tables or the old `database/schema.sql` scaffold. It intentionally stops on an existing untracked schema or changed migration checksum. The connection role must own/create that schema and its tables; the normal Supabase database owner connection can do this. No application roles are created and no public table policies are granted.

From your working root, with PYTHONPATH already set:

```powershell
.\.venv\Scripts\python.exe -m app.db_tools migrate
.\.venv\Scripts\python.exe -m app.db_tools seed-demo
.\.venv\Scripts\python.exe -m app.db_tools check
```

Expected first migration output: `{"migration_version":1,"applied":true}` (spacing may differ). Running the same migration again returns applied=false. First demo seed inserts two fictional profiles; repeating it inserts zero and does not overwrite rows. The check command should report backend=postgres, schema=ruralrise_backend, migration_version=1 and row counts. Connection credentials are never printed. Missing tables, failed connections and denied database privileges produce a nonzero setup exit or HTTP 503, not a fake success.

**Use `database/migrations/001_backend_storage.sql` through the supplied command. Do not run the original `database/schema.sql`.** The migration uses text IDs compatible with existing UUID strings and demo-student-001/002, so this release does not rename client IDs.

## Import the progress you already saved

Your earlier demo score is still in `backend/var/demo-store.json`. Stop all JSON writers first. Keep a local backup, validate it, then import it:

```powershell
Copy-Item -LiteralPath 'backend/var/demo-store.json' -Destination 'backend/var/demo-store.before-postgres.json'
.\.venv\Scripts\python.exe -m app.db_tools import-json --file backend/var/demo-store.json --dry-run
.\.venv\Scripts\python.exe -m app.db_tools import-json --file backend/var/demo-store.json
.\.venv\Scripts\python.exe -m app.db_tools check
```

Only run the copy if the destination backup does not already exist, or choose a new backup filename. If the source file does not exist because no JSON data was saved, skip import; demo seeding is enough for a new database.

The import validates the full file, student references, course IDs, unique keys and timezone-aware timestamps before writing. Missing/invalid input stops the import. Valid profiles and progress are imported in one transaction. IDs and timestamps are preserved. Existing database rows win: repeat imports skip matching keys and do not overwrite newer scores. A database failure rolls back the import. The source JSON file is not changed. Unknown/removed course IDs must be resolved with Member 4 before import. The importer is for this prototype snapshot, not an unrestricted production data migration.

## Start and verify PostgreSQL mode

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Open <http://127.0.0.1:8000/docs>. Execute GET /facilitator/students to check imported demo-safety progress. Then POST /progress using the same JSON as before, for example demo-student-001/demo-safety/completed=true/score=90. Retrieve the facilitator response; stop/restart Uvicorn and retrieve it again. Run db_tools check in another terminal to confirm database row counts. Do not infer database readiness from /health alone; it remains a liveness endpoint.

POST /profile creates new database profiles. They are intentionally excluded from the fictional facilitator listing. No profile-read/edit HTTP route was added; internal adapter retrieval methods are available for tests and later authenticated integration. All seven public routes remain unchanged. This is still a fictional-data prototype until authentication and student/teacher permissions are implemented. The private schema/RLS setup prevents public database roles from reading its tables, but it does not authenticate callers of this FastAPI app.

## Tests and current verification

Run the independent suite after installing PostgreSQL requirements:

```powershell
$env:PYTHONPATH = (Resolve-Path 'backend').Path
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
```

The JSON/API regression tests and Stage 2 configuration/adapter/import/upgrade tests run without a database. Real PostgreSQL integration tests are opt-in and are skipped by default. Adapter tests use mocks for controlled error/transaction cases; they are not a substitute for real SQL verification. See `docs/stage2-test-results.txt` and `docs/stage2-verification.json` for this release's actual executed results and limitations.

**Build verification: all 60 tests passed with zero skips against an isolated local PostgreSQL 17.5 server.** This includes ten real database integration tests. A separate check saved score 87, restarted PostgreSQL itself, and read back score 87. The test server was stopped cleanly. Your own hosted Supabase connection is still to be configured and verified; no account or credentials were supplied.

To run real integration tests yourself, use a **dedicated disposable test database**, not your application/team database. The suite creates the isolated schema, seeds fictional records and writes test profiles/progress. Each test deletes only its own generated IDs; demo rows and schema remain. Configure a separate test URI privately in this terminal:

```powershell
# Enter a dedicated test database URI through a hidden prompt.
$testDatabaseSecret = Read-Host 'Dedicated test PostgreSQL URI' -AsSecureString
$testDatabaseCredential = [System.Net.NetworkCredential]::new('', $testDatabaseSecret)
$env:RURALRISE_TEST_DATABASE_URL = $testDatabaseCredential.Password
$testDatabaseCredential = $null
$testDatabaseSecret = $null
$env:RURALRISE_ALLOW_DATABASE_TESTS = '1'
$env:RURALRISE_TEST_DB_SSLMODE = 'require'
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -p test_postgres_integration.py -v
Remove-Item Env:RURALRISE_TEST_DATABASE_URL, Env:RURALRISE_ALLOW_DATABASE_TESTS, Env:RURALRISE_TEST_DB_SSLMODE
```

For a non-TLS local disposable database, use RURALRISE_TEST_DB_SSLMODE=disable instead. This explicit test configuration is intentionally separate from DATABASE_URL. Tests do not drop schemas or tables. Check output for actual pass/skip/failure counts.

## Troubleshooting and rollback

- `ModuleNotFoundError: app`: set PYTHONPATH to backend from the repository root; Uvicorn separately needs --app-dir backend.
- Missing driver: reinstall backend/requirements-postgres.txt using the same .venv interpreter.
- Supabase connection timeout/address-family error: copy the exact Session pooler URI when using an IPv4-only network, and check the project is active. Confirm its username/password/host rather than guessing them.
- Password punctuation: use the wizard with the `[YOUR-PASSWORD]` placeholder so encoding happens once. Do not encode an already encoded full URI again.
- SSL failure: check DB_SSLMODE, provider requirements and certificate path. Do not disable remote encryption to hide the error.
- Missing migration/permission errors: run migrate/check with the intended database owner connection. Do not expose owner credentials to the frontend.
- Migration checksum/untracked-schema conflict: stop and review with Member 3/the team; the tool never deletes or alters an existing untracked schema.
- 404 progress with a demo ID: run seed-demo, then check the course ID still exists in the JSON catalog.
- Old progress missing after switch: JSON data does not move automatically. Run the validated import once. Reruns skip existing database rows.
- 503 during a database outage: restore connectivity/configuration. Data was not diverted into a second JSON store.

To return temporarily to JSON mode, stop the server and set STORAGE_BACKEND=json in backend/.env, remove any conflicting shell value, then restart. PostgreSQL rows remain untouched. New database updates are not copied back into the old JSON snapshot; this is a mode switch, not reverse synchronization. For code rollback use the printed upgrade backup or the original release in a separate folder; inspect upgrade-record.json for files that were new versus replaced. No destructive database rollback command is included.

The next stage is authentication, student/teacher authorization and real assigned-student lookup, followed by teammate engine/data integration. Stage 2 does not claim those features.
