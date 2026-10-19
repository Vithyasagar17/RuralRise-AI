# Run the integrated project

Requirements: Python 3.11+ (verified with 3.13.7), Node 22.12+ (verified with 22.19.0), npm, and two terminals. Git activation is unnecessary. Extract the ZIP to a new folder; do not overwrite a running checkout or copy its local secrets into Git.

## Windows PowerShell: first setup

Open the extracted project folder in PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1
```

This creates `.venv`, installs the pinned dependencies, and copies the two environment templates only when `.env` files are absent. It does not overwrite existing configuration. Alternatively run:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
cd frontend
npm ci
cd ..
```

Only use the manual Copy-Item commands in a fresh folder, since they overwrite existing files. With older `.env` files, add `ENABLE_LEARNING_ROUTES=true` to `backend/.env` yourself. Keep `AUTH_MODE=demo`, `APP_ENV=development`, `STORAGE_BACKEND=json` and `VITE_AUTH_MODE=demo` for the fictional local demo.

## Start both terminals

Terminal 1, project root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Terminal 2, project root:

```powershell
cd frontend
npm run dev
```

Open http://localhost:5173. Backend documentation is http://127.0.0.1:8000/docs and liveness is `/health`. A 404 at backend `/` is expected. If Vite chooses a different port, stop the process using 5173 or update `CORS_ORIGINS` to the actual origin and restart the backend. Stop servers with Ctrl+C.

## Try the complete demo

1. Open My profile, enter fictional details and interests, and save. Confirm the server student ID.
2. Open Career recommendations, inspect the actual fit scores/reasons, and choose View learning plan.
3. Open a module. Wait for the message that lessons were saved for offline reading.
4. Test offline using the production preview: stop Vite dev, run `npm run build`, then `npm run preview`. Visit online once and wait for offline support to become ready. Disable networking, reload, read a saved module and mark it complete. Reconnect and inspect its sync badge.
5. Open Opportunities and test filters and official source details.
6. In demo mode, facilitator visibility covers only built-in fictional learners. To demonstrate this screen, use Offline lessons before creating a profile, select Demo Student, complete a lesson and then open Facilitator dashboard. A newly created fictional profile is intentionally excluded from this public roster.

Use a consistent hostname: localhost and 127.0.0.1 have different browser storage. Offline first launch cannot work before assets and content have been downloaded. Browser storage deletion/private mode may remove saved data. Microphone and voices depend on browser/device support; they are optional.

## Test and build

```powershell
.\.venv\Scripts\python.exe backend/run_tests.py
cd frontend
npm test
npm run build
```

The 24 SQL integration checks skip unless a disposable test database is explicitly configured. Never point the test suite at a production database. Standard API tests use isolated JSON storage.

## Secure accounts and PostgreSQL

Keep secrets in local `backend/.env` or the host's environment. Frontend `VITE_*` values are public in the built JavaScript; they must never contain a database password, Supabase secret key or service-role key.

In `backend/.env` configure:

```dotenv
STORAGE_BACKEND=postgres
DATABASE_URL=postgresql://USER:URL_ENCODED_PASSWORD@HOST:5432/postgres
DB_SSLMODE=require
AUTH_MODE=supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
ENABLE_ACCOUNT_ROUTES=true
ENABLE_LEARNING_ROUTES=true
APP_ENV=development
```

Use the actual connection string supplied by your database provider and URL-encode special password characters. Configure explicit frontend origins in `CORS_ORIGINS`. For hosted production set `APP_ENV=production`, use HTTPS frontend/API URLs, and use the provider's required encrypted database settings. Do not apply `database/schema.sql`; the operational migrations are the versioned files in `database/migrations` and must be run through the CLI:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-postgres.txt
$env:PYTHONPATH = (Resolve-Path backend).Path
.\.venv\Scripts\python.exe -m app.db_tools migrate-auth
.\.venv\Scripts\python.exe -m app.db_tools check
```

`migrate-auth` applies migrations 001 and 002 with checksum tracking. Back up an existing database before migration. Normal API startup does not perform DDL. Secure mode never silently falls back to JSON.

In `frontend/.env` configure the same project:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Restart Vite after environment changes; rebuild the frontend for deployment. Enable the project's email/password provider, configure its site/confirmation redirect URL, and check confirmation email delivery. Confirmation-required signup shows instructions to confirm then sign in; it does not pretend a session exists. Only email/password login is implemented, without social login or a password-reset UI.

Sign up once as a fictional test student, then create a profile. A new authenticated user defaults to student. A coordinator using the backend CLI can assign a facilitator role and student assignment after obtaining the verified Supabase user UUID and student ID:

```powershell
.\.venv\Scripts\python.exe -m app.db_tools set-role --user-id TEACHER_USER_UUID --role teacher
.\.venv\Scripts\python.exe -m app.db_tools assign-student --teacher-id TEACHER_USER_UUID --student-id STUDENT_PROFILE_ID
```

Use actual IDs; these uppercase values are placeholders. Never put this database privilege in the frontend. Sign in as the teacher and confirm that only assigned students appear. `unassign-student`, `disable-user` and `enable-user` are available to the coordinator. Test a student account, another student, an unassigned teacher and an assigned teacher before launch. See `docs/completion-handoff.md` for the hosted checks that have not been performed here.
