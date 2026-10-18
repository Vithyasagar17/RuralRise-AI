# Member 2 integrated with the current Member 3/5 review

This candidate retains the newer backend/storage/authentication work and Member 5's frontend while integrating Member 2's actual deterministic recommendation engine. Do not overwrite your working project with the uploaded Member 2 ZIP: that ZIP contains the older Stage 2 backend and no frontend.

The current public API still has the same seven default paths and JSON formats. The backend projects the richer engine result onto the agreed six career fields. No new public roadmap route or progress field has been added. Authentication/account-read proposals remain opt-in and are not enabled for the supplied login-free frontend.

## What is included

- Member 2's engine, ten starter career records, thirty internal roadmap modules, fourteen unit tests, examples and documentation, preserved byte for byte.
- Latest Member 3 backend: JSON/PostgreSQL persistence, migrations, optional authentication, ownership, assigned-teacher access and administration tools.
- Member 5's existing frontend, offline queue, facilitator dashboard, PWA and translations, preserved byte for byte.
- A backend-owned compatibility adapter and seven new integration/regression tests.
- Current test evidence and a guarded updater for this specific uploaded Member 2 baseline.

Start in a **separate short directory**, for example `C:\Projects\RuralRise-review`. See REVIEW_START_HERE.md for installation and two-terminal startup, and START_HERE.md for optional database/authentication setup. Those guides contain earlier release context; this document and docs/member2-current-integration.md supersede statements that Member 2's source is missing or recommendations are fixed mocks.

## Run and verify

From the project root in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

In a second terminal, open frontend, run `npm ci`, then `npm run dev`; browse to <http://localhost:5173>. For the installable/offline build use `npm run build` and `npm run preview`. Local port 5173 is already in the backend's CORS defaults. Configure a different real origin only when supplied by the team.

For tests, set `$env:PYTHONPATH = (Resolve-Path backend).Path` from the root and run:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
.\.venv\Scripts\python.exe backend/tests/verify_member5.py
.\.venv\Scripts\python.exe -m backend.tests.demo_engine
```

The full database tests require explicit disposable-database configuration and `backend/requirements-postgres.txt`; otherwise those tests skip. In frontend, run `npm test`, `npm run test:live` with the server running, and `npm run build`. The current evidence distinguishes new executions from carried-forward checks on identical frontend source: docs/member2-current-verification.json.

Member 2 adds **no pip/npm dependency, environment variable or external AI account**. Scores are deterministic fit indicators, not employment probabilities. Career/module content is starter prototype material pending Member 4's verification.

## Updating the supplied Member 2 folder

Review this candidate first. Stop the target backend, then run these commands from the new review folder:

```powershell
python review_member2_upgrade.py --target 'C:\Projects\your-existing-ruralrise-ai' --dry-run
python review_member2_upgrade.py --target 'C:\Projects\your-existing-ruralrise-ai' --apply
```

The helper targets the exact uploaded Member 2 baseline. It refuses changed source/collisions before copying, backs up changed files and preserves engines, datasets, shared JSON schemas, root README/configuration, environment/runtime data and any existing frontend/QA files. It does not automatically add Member 5's frontend to a backend-only target; that shared merge needs Member 1/5 review. The complete review ZIP includes the frontend for testing in its own separate directory. File copies are sequential, and SQL migrations are supplied but never automatically executed.

Do not use the earlier Stage 1/2 or Member 5 baseline updater for this merged folder. Any newer teammate modifications should be merged with their owners rather than forced over a hash conflict.

## Exact remaining requests

1. Members 1/2/4: agree a roadmap HTTP request/response and map roadmap module IDs to real course IDs. See docs/roadmap-integration-proposal.md. The internal roadmap function is implemented; HTTP/UI/progress integration is still pending.
2. Member 1: provide the student screens, login/session flow and frontend origin.
3. Member 4: review the starter career/module content and provide verified lessons/opportunities with stable IDs and sources.
4. Members 1/5: implement/review token headers, active-account queue scoping and authorization-error handling. The supplied frontend cannot yet use secure mode.
5. Team/User: agree offline conflict handling and authorization rules, configure the actual database/Auth locally, and provide repository/base-branch and optional hosting information. Share sanitized checks, not credentials.

Member 2's engine and Member 5's frontend have both been received and tested; no need to request those same files again. This is an integrated review candidate, not a claim that the complete student journey or hosted sign-in is finished.
