> Historical baseline. See [completion-phases.md](completion-phases.md), [completion-contracts.md](completion-contracts.md) and [completion-handoff.md](completion-handoff.md) for this release. Earlier missing-component/status statements are historical.

# RuralRise AI

**Proposed replacement for the shared README — team review pending.**

A React/Vite PWA and FastAPI backend for rural education and livelihood pathways. The current demo provides profile-based deterministic career recommendations, an internal roadmap generator, a facilitator dashboard, offline lessons with queued progress, English/Tamil-draft controls and starter catalogs. Student onboarding/career/roadmap/opportunity screens and verified catalogs still need their owners' contributions. The roadmap HTTP/course mapping awaits team agreement.

The backend includes seven compatible APIs, validation/error handling, JSON persistence and optional PostgreSQL. Reviewed opt-in Supabase authentication supports owned student records and assigned teacher access. The supplied frontend has no login integration yet, so use fictional records in default demo mode.

## Setup and run on Windows

Use Python 3.10+ and Node.js 22.12+. Extract to a short path. In the project folder:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
Set-Location frontend
npm ci
Copy-Item .env.example .env
Set-Location ..
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

In another terminal, run `npm run dev` inside frontend and open <http://localhost:5173>. Backend documentation: <http://127.0.0.1:8000/docs>. For offline/PWA testing use `npm run build` then `npm run preview`; first load must be online.

Frontend `.env`: VITE_API_BASE_URL, default http://127.0.0.1:8000. Backend `.env` defaults: STORAGE_BACKEND=json, AUTH_MODE=demo, APP_ENV=development; local CORS port 5173 is allowed. Templates list remaining variables. Real database/Auth credentials stay local. See START_HERE.md for optional PostgreSQL, migrations, identity configuration and operator setup. Do not enable secure mode until frontend token/session changes are reviewed.

## Tests

From the project root: set `$env:PYTHONPATH = (Resolve-Path backend).Path`, then run `.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v` and `.\.venv\Scripts\python.exe backend/tests/verify_member5.py`. Real database tests require explicit disposable-database configuration. From frontend run `npm test`, `npm run test:live` with the backend running, and `npm run build`.

Current evidence: docs/member2-current-verification.json. Manual QA checklists: tests/test_demo_journey.md, test_mobile_ui.md and test_offline_mode.md. Physical Android/TalkBack and native Tamil review remain necessary.

## Ownership and limits

Member 1: student UI/login/shell. Member 2: matching and roadmap. Member 3: backend/storage/integration. Member 4: sourced knowledge base. Member 5: facilitator/offline/PWA/accessibility/QA. Add the team's actual names and repository URL before submission.

Do not commit credentials, `.env`, `.venv`, node_modules, dist or backend/var. Career scores are rule-based fit indicators, not employment probabilities. Career/module content is starter prototype data, and lessons/opportunities remain demo fixtures pending verification. Progress uses arrival-order upserts; multi-device conflict handling awaits team agreement. No external host or real Supabase login has been verified in this review. See docs/member2-current-integration.md for the current merge findings and remaining inputs.
