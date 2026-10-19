# RuralRise AI

Integrated local prototype: React/Vite/PWA frontend, FastAPI backend, Member 2's rule-based career engine, career-linked practice lessons, opportunity filters, facilitator dashboard, offline progress, and optional Supabase login with PostgreSQL ownership and teacher assignments.

Start with [QUICKSTART.md](QUICKSTART.md). The phase-by-phase implementation and team responsibilities are in [docs/completion-phases.md](docs/completion-phases.md). Current test results and remaining launch checks are in [docs/completion-handoff.md](docs/completion-handoff.md).

## What works

- Save a profile through the backend and use the returned student ID throughout the student journey.
- Request real profile-based career rankings, inspect reasons and skill gaps, and choose a pathway.
- Generate a weekly roadmap using the unchanged Member 2 engine; every one of its 30 modules maps to a readable practice lesson and valid progress ID.
- Read saved lessons offline, mark completion locally, reopen the app offline after its first online visit, and synchronize on reconnection.
- Search and filter the supplied opportunities; inspect recorded source, eligibility and verification status, and open an official HTTPS link.
- Use optional microphone input for skills and lesson read-aloud where browser support exists. Text input and reading always remain available.
- In secure mode, sign up/sign in through Supabase Auth, restore an owned profile/progress, update the same profile, and sign out. Teachers see assigned students through backend permissions. Roles cannot be selected by a student.

Demo mode uses fictional information only. Its facilitator view deliberately contains only the two built-in fictional learners; newly created demo profiles are not added to that roster. A demo profile save creates a new ID. Secure mode updates the authenticated student's existing profile.

## Interfaces and source responsibilities

The original seven API paths and their JSON models remain compatible. `/roadmap` and the extra practice catalog are enabled only by `ENABLE_LEARNING_ROUTES=true`; the supplied backend environment template enables this for the integrated UI. Secure frontend restore also requires `ENABLE_ACCOUNT_ROUTES=true`. Defaults in `Settings` retain the original seven-route baseline for existing consumers and tests. Review [docs/completion-contracts.md](docs/completion-contracts.md) with Members 1/2/3/5 before merging shared additions.

`frontend/src/pages` owns screens; `services` owns API/Auth calls; `features/student` owns current student state; existing `features/offline`, `facilitator` and `i18n` retain their responsibilities. Backend HTTP routing stays in `app/main.py`, original schemas in `app/schemas.py`, with the additive roadmap validation in `learning_schemas.py` and `learning_service.py`. Existing SQL migrations and Member 2's engine are unchanged.

## Verification

```powershell
.\.venv\Scripts\python.exe backend/run_tests.py
cd frontend
npm test
npm run build
```

The runner configures both Python import paths. Database integration tests require an explicitly configured disposable PostgreSQL database; they skip otherwise. The optional real Chrome journey is `frontend/scripts/e2e-project-journey.mjs`. See the handoff for prerequisites and current executed evidence.

## Launch boundary

The source provides a working integrated prototype. Hosted Supabase credentials, email settings, database migrations/roles, HTTPS origins and hosting must be configured by the project owner before real users can use it. Local SQL checks do not establish hosted deployment. Tamil remains a visibly labelled draft; student screens and lesson content currently include English. Practice worksheets are introductory prototype content, not accredited training. Opportunity deadlines and eligibility must be checked with providers.

Older handoff files, upgrade tools, manifests and test evidence are retained as historical records. Use the current README and `docs/completion-*` for this release. Old incremental upgrade scripts target their recorded older baselines; do not run them against this completed source folder.
