# Member 2 merge into the newer backend/frontend candidate

Reviewed 18 October 2026. Inputs: RuralRise_AI_Merged_With_Member2.zip and the already reviewed Member 3/5 candidate. The new upload has the actual engine, ten starter careers and thirty internal roadmap modules, but uses the older Stage 2 backend and contains no frontend. Its historical test report (52 passed, 22 skipped) was not treated as evidence for the newly assembled project.

## Merge performed

Member 2's engine, starter career/module data, sample profiles/expected results, demo, unit tests and documents were copied unchanged. The latest backend retained authentication, ownership, teacher assignments, database tooling, account-route gates and deployment preparation. Member 5's frontend, QA checklists, public API schemas, lesson/opportunity fixtures and SQL migrations were preserved.

Added `backend/app/recommendation_adapter.py`; the existing recommendations handler now calls it. It accepts Member 2's internal envelope or the historical list adapter, projects the six public fields and applies the existing strict Pydantic model. Invalid envelopes/records/scores result in the existing sanitized 503 response. Rich internal diagnostics do not leak into the response. No route, public field, dependency or environment variable was added.

The previous mock-only assertions in test_api.py were updated to the real-engine assertions already supplied in Member 2's merge. Seven new tests exercise four supplied profiles through HTTP handlers, exact public projection, legacy adapter compatibility, malformed results, honest empty results, strict HTTP inputs and career/module references. All supplied Member 2 unit tests are retained unchanged.

## Interfaces and limits

`POST /recommendations` still accepts StudentProfile and returns only `{"careers":[{career_id,title,match_score,reasons,missing_skills,next_steps}]}`. Member 2's lenient Python entry point does not relax HTTP validation: names/required fields, interest lists, hours and extra-field rejection retain the existing API rules. Internal sample `profile_id` must be removed before submitting a profile through HTTP.

The four complete sample profiles are compared against the supplied expected ranking/score snapshots. The fifth partial sample is valid for the internal engine but intentionally fails the stricter HTTP profile contract. Scores depend on profile tags and are not probabilities; the backend does not make job-placement guarantees.

The internal roadmap is working Python code. It is not an HTTP route. Its modules (for example solar-001) are not entries in `/courses` (currently demo-safety and demo-planning), so sending a roadmap module ID to POST /progress returns 404. Career/module material is prototype content needing Member 4 review. No IDs were silently aliased and no fictional course was replaced.

## Current evidence

Read member2-current-verification.json and member2-backend-test-results.txt. The report records current backend/PostgreSQL results, actual engine sample checks, newly executed live frontend/API and queue integration checks, byte preservation and guarded upgrade verification. Frontend unit/build evidence may be carried forward from the preceding review only when the complete frontend source and lockfile are byte-identical; it is labelled accordingly.

Actual hosted Supabase login remains unverified. The current frontend still lacks bearer-token integration. Member 5's active-student queue scoping/session recovery findings and the offline conflict proposal remain open; see member5-integration-review.md and offline-sync-contract-proposal.md. Prior reports remain historical and do not supersede this review.

## Next coordination

- Members 1/2/4: review roadmap-integration-proposal.md and settle the public route plus course/content/progress mapping.
- Member 1: supply actual screens/login/session integration; retain the existing Member 5 PWA/language/offline hooks.
- Member 4: validate/source careers, lessons, opportunities and prerequisites. Preserve matching id/career_id values for this engine/catalog integration.
- Member 5: address active-account sync, 401 recovery and signed-in dashboard behavior with the login owner before secure mode.
- Coordinator/User: approve contracts, configure real database/Auth privately, supply repository/base branch and optional host, and perform a real student/assigned-teacher session journey.

Do not replace the current project with the older uploaded backend or use a historical updater against a newer checkout. The new updater only copies reviewed backend-owned files/additive review documents; shared frontend/root-file adoption remains a team-reviewed merge.
