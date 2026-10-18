# RuralRise AI — Quick start (full app, Windows)

You need: **Python 3.10+** and **Node.js 22.12+** (check with `python --version` and `node -v`).
No API keys, accounts or database are needed.

**Unzip to a short folder**, for example `C:\Projects\ruralrise-ai`. Windows limits file paths
to 260 characters, and a deeply nested folder can make installs or one backend test fail.
Then open PowerShell in the `ruralrise-ai` folder.

## 1. Install (once)

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
cd frontend
npm ci
cd ..
```

`npm ci` installs the exact versions in `package-lock.json`. Expected output: `found 0 vulnerabilities`.

## 2. Run (two terminals)

**Terminal 1, backend** (from `ruralrise-ai`):

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Check it at <http://127.0.0.1:8000/health> (`{"status":"ok"}`). API documentation: <http://127.0.0.1:8000/docs>.

**Terminal 2, frontend** (from `ruralrise-ai\frontend`):

```powershell
npm run dev
```

Open <http://localhost:5173>. Stop either one with **Ctrl+C**.

## 3. Offline / installable version (for the demo)

The service worker exists only in a production build. Stop `npm run dev`, then in `frontend`:

```powershell
npm run build
npm run preview
```

Open <http://localhost:5173> once while online. After that you can turn the network off; lessons still open and progress syncs when you reconnect.
Keep port **5173**: the backend only accepts browser requests from that port.

## 4. Tests

| What | Folder | Command |
| --- | --- | --- |
| Frontend unit/component | `frontend` | `npm test` |
| Frontend against the running backend | `frontend` | `npm run test:live` |
| Backend | `ruralrise-ai` | `$env:PYTHONPATH = (Resolve-Path 'backend').Path; .\.venv\Scripts\python.exe -m unittest discover -s backend/tests` |
| Real-browser offline journey (optional, needs Google Chrome + running backend) | `frontend` | `npm install --no-save playwright-core@1.64.1 axe-core`, then `npm run build`, then `node scripts/e2e-offline-journey.mjs . e2e-screenshots` |

## Troubleshooting

- **`running scripts is disabled`**: run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.
- **Dashboard shows "Server not reachable … fictional demo data"**: the backend is not running, or the page is not on port 5173.
- **`Port 5173 is in use`**: stop `npm run dev` before `npm run preview`.
- **Optional PostgreSQL / Supabase storage**: see `STAGE2_SETUP.md`.

More detail: `frontend/src/features/*/README.md`, `docs/api-contracts.md`, `docs/architecture.md`, `tests/*.md`.
