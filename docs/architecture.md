# Architecture and ownership

> Stage 1 baseline below. Stage 2 adds optional PostgreSQL storage in `app/postgres_store.py`, automatic `backend/.env` loading, `app/db_tools.py`, and the isolated `database/migrations/001_backend_storage.sql` migration. Current instructions and limitations are in `../STAGE2_SETUP.md` and `stage2-handoff.md`. The seven public API contracts and fictional-only facilitator behavior remain the same. The earlier database/schema.sql scaffold is not the Stage 2 migration.

Only Member 3's backend has been implemented in this package. No teammate source files or shared Git repository were available. All files are new locally; ownership below comes from the supplied project prompts.

| Area | Owner | Implementation in this package |
| --- | --- | --- |
| React/Vite/PWA frontend, API service | Member 1 | None; frontend env example only |
| Career engine and roadmap | Member 2 | Temporary deterministic mock in `backend/app/career_engine.py` |
| FastAPI, schemas, storage, CORS, integration | Member 3 | Implemented and independently tested |
| Career/course/opportunity datasets, matching | Member 4; coordinate careers with Member 2 | Fictional fixtures and temporary search filter only |
| Facilitator UI, voice, offline queue, PWA, QA | Member 5 | Backend supports fictional overview and progress upsert; no UI or offline queue |

`main.py` validates HTTP input with `schemas.py`, calls the career/opportunity adapters, and validates their outputs. Catalogs are loaded from `backend/data` on each relevant request. `database.py` persists profiles and progress in `backend/var/demo-store.json` by default. UTF-8 JSON writes use a same-directory temporary file, flush, fsync and atomic replacement; an RLock serializes writers inside one process. There is no cross-process lock or transaction spanning multiple server instances.

Verification: 24 API/storage tests passed using HTTPX's in-memory ASGI transport. The test-only InProcessEventLoop uses a threading.Event wakeup to avoid the socketpair that stalls in this Windows sandbox. It does not change production application code. Real Uvicorn startup was attempted and timed out; no live HTTP pass or real process-restart test is claimed. The supplied smoke script must be rerun where localhost sockets work.

`GET /health` is liveness only. It can return 200 while storage or datasets are unavailable. Affected endpoints return 503 instead of silently resetting corrupt data or inventing fallback information.

`POST /profile` creates an identity on every call; no update endpoint or profile deduplication is implemented. Progress is an upsert keyed by `(student_id, course_id)`. Repeating a progress update does not add duplicate rows, but changes `updated_at`. Requests have no client event version: late offline updates may replace newer progress. Member 5 must resolve synchronization ordering with Member 3 before a real offline integration.

`GET /facilitator/students` returns only built-in fictional demo identities. It never enumerates submitted profiles. There is no user authentication or authorization. CORS restricts browser origins; it does not authenticate callers. Use localhost and fictional data only until the team implements identity and record-level access controls.

`database/schema.sql` is a proposed migration scaffold, not an operational database. It enables row-level security without public policies, but identity mapping, roles, seeding, migration execution and a PostgreSQL storage adapter are unimplemented. Do not apply it blindly. Demo IDs such as `demo-student-001` are not UUIDs and cannot be copied into its UUID columns; migration must generate UUIDs and map references.

## Interfaces requiring coordination

The seven endpoint paths, profile fields and recommendation JSON keys come from the shared prompts. Course/progress/facilitator shapes, defaults, status codes, validation rules, SQL and the opportunity adapter signature fill gaps in those prompts. They are documented proposals, not previously approved team decisions. No existing shared interface was changed. Review them before frontend or engine integration. Keep public JSON stable; adapt teammate implementations behind these boundaries after agreement.
