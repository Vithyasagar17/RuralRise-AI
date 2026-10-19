# Additive integration contracts

These changes are implemented in a separate source copy for team review. No team repository was pushed or merged. The user authorized whole-project implementation; this document identifies shared additions for Members 1/2/3/5 to review before merging.

## Existing API compatibility

The seven original paths and request/response models in `app/schemas.py` are unchanged. With default `Settings(enable_learning_routes=False, enable_account_routes=False)`, OpenAPI still contains exactly those seven paths, and `/courses` still contains its original two lessons.

The integrated backend `.env.example` sets `ENABLE_LEARNING_ROUTES=true`. This adds a path and catalog entries without adding fields to existing responses. Existing course IDs remain valid. It is an explicit deployment switch, not automatic mutation of teammates' interfaces.

| Interface | Enabled behavior |
| --- | --- |
| POST `/roadmap` | Added only with `ENABLE_LEARNING_ROUTES=true`; body `{ "profile": <unchanged StudentProfile>, "career_id": "solar-technician" }`. In secure mode requires a verified bearer session. |
| Roadmap success | Validated Member 2 output with `career_id`, `career_title`, `learning_goals`, `required_skills`, `missing_skills`, `modules`, `weekly_plan`, `estimated_learning_time`, `assessment_criteria`, `next_steps`, `warnings`. Full exact schema is in `learning_schemas.py` and generated `/docs`. |
| Roadmap errors | 404 unknown career; 422 invalid request; 503 missing/invalid catalog or invalid engine output. No invented fallback roadmap. |
| GET `/courses` | With learning enabled, returns original lessons followed by 30 items from `practice_courses.json`. Every item retains exactly `id,title,skill,difficulty,lesson,practical_task`. |
| POST `/progress` | Same original body and upsert semantics; accepts module IDs present in the extended course catalog. |
| Module-to-course identity | `roadmap.modules[].module_id === courses[].id === progress.course_id`. No temporary demo mapping. All ten pathways have three mapped modules. |
| Secure restore reads | Existing gated GET `/account`, GET `/profile`, GET `/progress` require `ENABLE_ACCOUNT_ROUTES=true` and `AUTH_MODE=supabase`. A teacher cannot use student-only profile/progress reads. A new student's GET profile returns 404 until first save. |

Module durations are checked for finite positive bounds before invoking the unchanged roadmap engine, preventing invalid datasets from producing unbounded weekly plans. Missing mappings fail closed. The original `courses.json`, Member 2 engine and SQL migrations are preserved.

## Authentication boundary

The frontend sends email/password directly to the configured Supabase Auth REST endpoint, stores the session in per-tab `sessionStorage`, and attaches access tokens to private API calls. It refreshes an expired session and retries one backend 401 once. Public catalogs receive no bearer token. Queue entries never contain authentication tokens or passwords. A logout clears the session and cached profile/account view; saved progress remains scoped to that student for later sign-in. Server-side role and ownership checks are authoritative; a role in browser storage or user metadata is not a permission.

After an online verified student session, the same tab may reopen cached student lessons offline. A visible notice distinguishes that cached account view from current online verification. No cached teacher roster is used offline. Offline cached access cannot observe immediate remote revocation; the backend rechecks authorization before any sync.

## Offline and concurrency policy

IndexedDB is scoped by API base URL; progress display and sync are additionally scoped by student ID. Legacy `ruralrise-offline` queues remain untouched and are not automatically replayed into the new database. Preserve/export old pending work separately if migrating a device.

A local revision prevents an older in-flight response from marking a newly edited local row as synced. Only `{saved:true}` confirms synchronization. New work added during a shared sync request triggers another pass. 401/403 pause and retain the affected queue; transient network/5xx errors remain retryable; 404/422 require explicit retry after fixing IDs/input. Owner-only server progress reads hydrate completed lessons without replacing pending local edits. No private responses are cached by the service worker.

**Cross-device conflict limitation:** the original progress API has no client event version or conditional update. The server remains last-arrival-wins. A delayed offline edit from one device may replace a newer edit on another device. Existing contracts were preserved rather than silently adding event/version fields. A future conflict/version protocol needs a separately reviewed shared contract. Use one device per student during the prototype evaluation.

## Data and language

Practice lessons are prototype-authored worksheets, without external accreditation or completion certificates. Supplied careers, roadmap metadata and opportunities retain their provenance/status. Blank or unknown eligibility is not a universal eligibility claim. Current opportunity pages show missing verification/deadlines honestly. The language selector covers existing facilitator/offline strings; Tamil remains a draft, and student screen/content localization needs native review and completion before claiming a fully Tamil product.
