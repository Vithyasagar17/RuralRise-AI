# Review of the uploaded team project — 18 October 2026

Sources: the supplied `ruralrise-ai.zip`, the 15-page `RuralRise-AI-Project-Guide.pdf`, and Member 3's newer backend candidate. The upload contains Stage 2 backend code and Member 5's actual facilitator/offline/i18n/PWA implementation. It contains no Member 1 onboarding/career/roadmap/opportunity screens, no real Member 2 engine and no real Member 4 catalogs.

## Completed in this review

- Compared the uploaded source with the backend candidate. All seven default API paths, JSON schemas, engine adapters and data files remain compatible.
- Added the uploaded frontend and QA checklists unchanged to a separate review bundle.
- Added `backend/tests/verify_member5.py` and its JavaScript companion: they run actual frontend clients, dashboard normalizers and the offline queue against isolated backend handlers. They verify profile creation, recommendations, queue deduplication, synchronization, facilitator visibility, saved profile IDs and 404/422 handling.
- Exercised the supplied frontend unit suite, production/PWA build and live API suite against the newer backend. See recorded evidence; the guide's earlier test totals are historical and were not treated as new test results.
- Supplied a guarded updater for this exact uploaded baseline, complete file hashes, source/dependency/setup documentation and separate proposals for shared changes.

No frontend/QA source was modified. No hosted database/Auth configuration, repository push or deployment was performed. The shared README and public schemas remain untouched. The guide's authentication checklist is addressed by the existing opt-in backend implementation; it is not yet a working sign-in experience in the supplied UI.

## Findings and owners

| Finding | Current behavior and required action | Owner |
| --- | --- | --- |
| No login token in requests | `features/common/apiClient.js` sends Content-Type only. Secure private routes correctly return 401. Add the reviewed login/session token integration before enabling secure mode. | Members 1/5; Member 3 validates |
| Queue sync is not scoped by the lesson hook | `useProgressSync.js` filters its displayed records by studentId, but calls `syncPendingProgress` without studentId. On a shared device this can attempt another student's pending rows. Backend ownership rejects them in secure mode; Member 5 must pass the active student ID, skip sync without an active account, and handle account changes/in-flight batches. | Member 5 |
| Auth failures lack session recovery | The queue treats 401/403 as permanent failures. Refresh a 401 session once through the login owner, then resume only that account's records; pause rather than discard on logout. Do not persist bearer/refresh tokens inside queue entries. | Members 1/5 |
| Dashboard may fall back to mocks | `loadFacilitatorData` defaults to auto and can show fictional data after an authorization failure. For a signed-in teacher use explicit API mode and visible login/permission errors. | Member 5 |
| Late uploads can overwrite newer progress | Current upsert ordering is arrival order. Local revisions protect same-device queue state, but do not establish ordering across phones. A shared interface decision is required; see the separate proposal. | Members 3/5 |
| Demo picker is temporary | Member 1 must supply the actual returned/owned student_id to OfflineLessons. Do not use a demo ID as an authenticated student's identity. | Members 1/5 |
| Shared README is stale | It still says no frontend and contains historical verification limits. Proposed replacement: README_TEAM_REVIEW.md. Review with the team before adoption. | Coordinator/Member 3 |
| Real data/engine/screens absent | Keep mocks clearly labelled. Final matching, sourced content and the complete student journey cannot be accepted yet. | Members 1/2/4 |

## Team review decisions

1. Confirm the Supabase Auth/Bearer-header proposal and ownership/teacher assignment rules in `auth-contract-proposal.md`.
2. Review whether to enable optional GET /account, GET /profile and GET /progress for session restoration. They remain disabled by default.
3. Agree offline conflict behavior before adding any timestamp, version, header or response field. No such additions are enabled in this bundle.
4. Adopt the proposed README after review. Supply the exact hosted/frontend origin if different from the already allowed local port 5173.

## Verification boundaries

See `member5-verification.json` for actual executed counts, runtime versions, source preservation and first-attempt failures. Auth provider responses remain substituted in automated tests; hosted Supabase login is unverified. Desktop unit/build/live-API checks do not establish installation, airplane-mode reopening, TalkBack or behavior on a physical low-end Android phone. Member 5's guide reports earlier browser checks; those are prior teammate evidence, not checks rerun here.

## Final inputs still needed

- Member 1: student screens, API service, chosen login/session flow, real frontend origin.
- Member 2: actual career/roadmap module, requirements and sample expected input/output.
- Member 4: verified datasets, stable IDs, filter rules and source verification status.
- Member 5: agreement/fix for active-account queue scoping, authorization failures and the proposed conflict flow; physical phone/Tamil review.
- Coordinator/User: shared repository/base branch, reviewed identity/database decisions, local real-service configuration and optional hosting target. Supply sanitized check results rather than credentials.

Member 5's source and original payloads have now been received and exercised; there is no need to request those same files again.
