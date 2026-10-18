# Member 3 integration review: uploaded team project

> **Newer Member 2 merge available:** start with MEMBER2_REVIEW_START_HERE.md and docs/member2-current-integration.md. Member 2's engine is now integrated; earlier missing-engine statements and the updater below refer to the previous Member 5-only baseline.

This folder combines the supplied Member 5 frontend/QA files with Member 3's newer backend. **It is a review candidate, not a completed team application.** Extract it into a separate, short path such as `C:\Projects\RuralRise-review`; do not replace your working team folder wholesale.

The supplied frontend, QA checklists, engine mocks, catalogs and shared JSON schemas are preserved byte for byte. No authentication or extra account routes are enabled by default. The original shared README remains unchanged; a replacement is proposed in `docs/README_TEAM_REVIEW.md` for team review.

## Run the current fictional demo

From this folder in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
Set-Location frontend
npm ci
Copy-Item .env.example .env
Set-Location ..
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

In a second terminal, open `frontend` and run `npm run dev`. Browse to <http://localhost:5173>. For PWA/offline testing use `npm run build` then `npm run preview`, instead of the development server. The default CORS origins already include localhost and 127.0.0.1 on port 5173. Set the actual additional origin in `backend/.env` only when the team supplies it.

This demo requires no external account. Use fictional records only: there is no login in the supplied frontend, and the demo facilitator endpoint shows two built-in fictional students. Newly created students do not appear there until reviewed authentication and assignments are configured.

## Tests

```powershell
# From the project root:
$env:PYTHONPATH = (Resolve-Path backend).Path
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
.\.venv\Scripts\python.exe backend/tests/verify_member5.py

# From frontend, with the backend running:
npm test
npm run test:live
npm run build
```

The cross-component check uses actual Member 5 API/queue modules, an IndexedDB emulator and real ASGI handlers. It is separate from the live TCP tests and browser/phone tests. PostgreSQL tests require a disposable database and explicit opt-in; see `STAGE2_SETUP.md`. Recorded results and limitations are in `docs/member5-integration-review.md` and `docs/member5-verification.json`.

## Bring only our changes into the supplied team folder

Stop its backend first. From this new review folder:

```powershell
python review_upload_upgrade.py --target 'C:\Projects\your-existing-ruralrise-ai' --dry-run
python review_upload_upgrade.py --target 'C:\Projects\your-existing-ruralrise-ai' --apply
```

Use this helper for the **specific team ZIP reviewed on 18 October**, not an arbitrary newer checkout. It checks the uploaded source hashes and refuses conflicting modifications before copying. It preserves frontend, QA files, root README/configuration, schemas, datasets, engines, `.env`, virtual environments and runtime records. Changed files are backed up before copying; this remains a sequential filesystem operation. Review the printed plan with the relevant owners before applying it to a shared checkout. A new migration file is only supplied; the updater does not execute SQL or configure a hosted account.

## Before real student data

`START_HERE.md` documents the backend's opt-in PostgreSQL/Supabase authentication, owned profiles, assigned teacher access and administrator commands. Do not turn on secure mode with this frontend yet: it has no login/token integration. Members 1 and 5 must review `docs/member5-integration-review.md` and `docs/offline-sync-contract-proposal.md` first.

Remaining external inputs: Member 1 student/login screens; Member 2 real engine/roadmap; Member 4 sourced datasets; approval of authentication and offline conflict handling; real database/Auth setup; repository and optional hosting target. No API keys, passwords or private student data should be sent in chat or included in handoff ZIPs.
