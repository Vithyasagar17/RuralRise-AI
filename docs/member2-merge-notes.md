# Member 2 + Member 3 merge notes

## What was combined

- Member 3's Stage 2 backend source, database/storage code, configuration, schemas, opportunity functionality, PostgreSQL upgrade logic, and existing route set were retained.
- The placeholder `backend/app/career_engine.py` was replaced with Member 2's deterministic recommendation and roadmap engine.
- `backend/app/main.py` received a narrow compatibility adapter at `/recommendations`: it accepts the engine's richer internal result and projects only the existing six fields (`career_id`, `title`, `match_score`, `reasons`, `missing_skills`, `next_steps`) into Member 3's `RecommendationResponse` schema.
- `backend/data/careers.json` now contains ten starter career records. To preserve existing identifiers from Member 3's fixtures, the first three legacy IDs remain `solar-technician`, `agriculture-assistant`, and `craft-enterprise`; each record includes both `id` and `career_id` for loader/engine compatibility.
- Member 3's `backend/data/courses.json` was not changed. Its shape and `demo-safety`/`demo-planning` IDs remain in use by `/courses` and progress storage.
- Added `backend/data/career_learning_modules.json` with thirty structured starter learning modules for the internal roadmap function.
- Added Member 2's sample profiles, engine tests, expected profile results, demo script, JSON demo output, scoring guide, and integration guide.
- Updated `backend/tests/test_api.py` to verify the real deterministic result instead of the old zero-score mock. The six-field HTTP response contract remains unchanged.
- Updated README/API docs and appended an integration addendum to `docs/integration-guide.md`.

## Intentionally unchanged

- `backend/app/schemas.py`
- `backend/app/database.py`, `backend/app/postgres_store.py`, `backend/app/config.py`
- `backend/app/opportunity_engine.py`
- `backend/data/courses.json`
- `backend/data/opportunities.json`
- PostgreSQL migrations, configuration files and the seven existing endpoint paths

## Important limitation

The roadmap generator is callable as a Python function, but this merged package does not add a roadmap HTTP endpoint. Member 3 should agree a route and Pydantic request/response models with Members 1, 2, and 4 before exposing it. Career/course module content is prototype data and requires Member 4's source and eligibility review.

## Verification

The merged repository test command discovered 74 tests: 52 passed, 22 were skipped for optional real-PostgreSQL tests/dependencies. See `member2-integration-test-results.txt` for exact command and scope. This is a local ZIP-level merge only; no GitHub branch or pull request was created.

The original `docs/file-manifest.json`, `docs/stage2-release-manifest.json`, Stage 2 test logs, and upgrade manifests remain historical evidence for Member 3's unmodified Stage 2 release. `docs/combined-file-manifest.json` is the checksum manifest for this merged package.
