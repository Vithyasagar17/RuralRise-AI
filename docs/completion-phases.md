# Completion phases and team roadmap

Baseline: the uploaded `RuralRise-AI-main.zip`, reviewed 19 October 2026. It included Member 1's student UI, Member 2's engine/catalogs, Member 3's backend/storage/security work, Member 4's six opportunity records, and Member 5's facilitator/offline/PWA features. The backend had working endpoints, but student pages still used local/sample data and secure frontend sessions were not connected. This release integrates those components in a separate source copy.

| Phase | Implementation in this release | Acceptance evidence | Team review owner |
| --- | --- | --- | --- |
| 1. Shared student state and API integration | Profile POST, authoritative student ID, saved profile restore, actual career rankings/reasons, real opportunity filters and official links; no hardcoded student-page rankings | Profile-to-career component test, failed-save check, real browser POST journey | Member 1 + Member 3 |
| 2. Learning pathway and lessons | Additive gated POST `/roadmap`, Member 2 engine unchanged, weekly hours reflected in plan, 30 mapped worksheets plus original 2 lessons, actual progress IDs | All 10 careers generate 3 mapped lessons; all 30 completions persist; invalid/unbounded module data rejected before engine | Members 2/3; Member 4 reviews educational content |
| 3. Offline and device safety | Backend-scoped IndexedDB, student-scoped display/sync, identity-switch checks, retained auth failures, revision protection, saved roadmap reuse, cached lesson reading, server-progress hydration | Queue regression tests, offline reload in real Chrome, automatic reconnect and backend disk confirmation | Member 5 + Member 3 |
| 4. Secure sessions and roles | Optional Supabase email/password sign-up/sign-in, confirmation handling, refresh/logout, owned profile/progress reads, role-specific navigation, assigned teacher roster | Frontend mocked-provider session tests; real PostgreSQL ownership tests; external Auth verification mocked | Members 1/3/5 + coordinator configures provider |
| 5. Usability and regression | Phone navigation restored, responsive screens, focus-trapped dialogs, keyboard close, no external font dependency, optional microphone input/read-aloud with text fallback | Frontend suite, production/PWA build, real mobile-size Chrome journey and automated accessibility check | Members 1/5; native Tamil/physical phone review by team |
| 6. Source and handoff | Pinned dependencies/lockfile, safe setup script, env templates, contracts, source changes manifest, executed test logs and explicit known issues | Current handoff and source manifest in this bundle | Member 1 coordinates merge; all owners review their files |
| 7. Hosted acceptance and launch | Needs the project's Supabase configuration, real confirmed test users, hosting target/origins, deploy/rebuild and external smoke checks | Not performed: no hosted project credentials or deployment target supplied | Coordinator + Member 1, with Members 3/5 testing |

These are dependency phases, not a claim that production launch can occur without external setup. Phases 1–6 are source implementation/verification work. Phase 7 is the remaining project-specific execution. Do not claim fully completed production, full Tamil localization, accredited learning or verified application availability from this bundle.

## How the team should work now

1. Member 1 creates an integration branch from the team's current main and compares this source copy with that branch. Do not replace newer teammate changes blindly. Review `docs/completion-source-changes.json` and the additive contracts first.
2. Member 2 checks recommendation examples and weekly roadmap allocations. Member 4 reviews the 30 worksheets, the ten starter careers and all opportunity requirements/official URLs. Keep stable IDs. Correct content through catalog updates without changing API field names.
3. Member 3 checks backend flags, database configuration, versioned migration checksums, role assignment, actual data persistence and sanitized error responses. Keep JSON mode fictional/local only and production mode secured.
4. Member 5 reviews account-scoped IndexedDB behavior, pending edits, duplicate/retry handling, shared-device logout behavior, offline shell caching, Tamil draft strings and optional voice fallback. Run a physical low-end Android/TalkBack check.
5. Members 1/3 run the full journey after merging, then configure the hosted services and repeat it using two students, an unassigned teacher and an assigned teacher. Record actual pass/fail evidence rather than copying local totals.
6. After the checks pass, tag the agreed release commit and hand over that commit, setup instructions, env variable names, dependency lockfiles, test results and known issues. Never include actual `.env` files, tokens, database snapshots or dependency folders.

## Inputs still needed to execute launch

- The chosen frontend and API hosting targets and their public HTTPS origins; deployment account access through the normal secure workflow.
- Supabase project URL and its **public** publishable key; database connection string and private credentials must be configured locally/on the host, not sent in chat or committed.
- Confirmation email/site URL settings and real fictional test-user accounts; coordinator-assigned teacher UUID/student mapping.
- Educational/catalog review and a native Tamil reviewer. English remains present in student screens/content; draft Tamil does not establish translation completeness.
- Team agreement on the documented single-device prototype policy or a separately reviewed cross-device progress version/conflict protocol before broader multi-device use.
