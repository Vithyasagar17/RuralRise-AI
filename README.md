# RuralRise AI — Member 3 backend

> **Stage 2 (database storage) is included. Start with [STAGE2_SETUP.md](STAGE2_SETUP.md).** It documents PostgreSQL/Supabase setup, a guarded upgrade for your existing folder, JSON import and the new tests. The original Stage 1 instructions below remain useful for JSON mode; Stage 2 now loads `backend/.env` automatically. All seven API paths and request/response schemas are preserved. Authentication and real teacher permissions remain unfinished.

Runnable FastAPI integration component using the agreed Python/FastAPI/Pydantic/Uvicorn stack. This package contains no frontend and does not replace the work of Members 1, 2, 4 or 5.

Career recommendations now use Member 2's deterministic rule-based engine and a ten-pathway starter catalog. Career and roadmap content still requires review by Member 4; opportunity records are fictional fixtures, facilitator mode exposes only two fictional identities, and production authentication/authorisation remains unfinished. PostgreSQL storage support is included as described in STAGE2_SETUP.md. The roadmap function is implemented internally, but there is not yet a public roadmap HTTP endpoint.

## Start on Windows PowerShell

Open PowerShell in this `ruralrise-ai` folder:

```powershell
python --version
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Verified with Python 3.13.7. Activation is unnecessary. Open <http://127.0.0.1:8000/docs> or <http://127.0.0.1:8000/health>. Stop with Ctrl+C. Use one server process; the JSON storage lock is process-local. No database, Node, API key or external AI service is needed.

## Test

From the same folder:

```powershell
$env:PYTHONPATH = (Resolve-Path 'backend').Path
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
```

After the Member 2 engine merge, the combined suite discovered 74 tests: 52 passed and 22 were skipped because real PostgreSQL integration was not configured and the optional PostgreSQL test dependency was unavailable. See `docs/member2-integration-test-results.txt`. `docs/test-results.txt` is the historical pre-merge Stage 2 baseline. Tests use a test-only event loop for in-process API checks. A live Uvicorn browser/HTTP smoke test still needs to be run on a machine permitting localhost sockets; see `docs/smoke-results.json` for the earlier baseline attempt.

## Integration

Read `docs/integration-guide.md` for the original 20-section backend handoff and its Member 2 integration addendum, `docs/ai-engine-integration.md` for the career engine, `docs/scoring-algorithm.md` for the scoring method, `docs/api-contracts.md` for requests and responses, and `docs/architecture.md` for ownership boundaries. Merge files individually on a feature branch. The PostgreSQL migration and fixture opportunity/course data remain development artefacts and require their documented review before production use.

The seven specified endpoint paths and the six-field career response contract are preserved. Member 2's full engine is in `backend/app/career_engine.py`; career roadmap modules are in `backend/data/career_learning_modules.json`. The existing `backend/data/courses.json` was kept unchanged because it backs the strict `/courses` and progress contracts. See `docs/ai-engine-integration.md` and `docs/scoring-algorithm.md`. This merged ZIP is a working copy only; it has not been pushed to the team GitHub repository.
