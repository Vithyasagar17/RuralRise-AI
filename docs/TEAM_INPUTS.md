> Historical baseline. See [completion-phases.md](completion-phases.md), [completion-contracts.md](completion-contracts.md) and [completion-handoff.md](completion-handoff.md) for this release. Earlier missing-component/status statements are historical.

# Inputs needed to finish Member 3 integration and final acceptance

> **Member 2 update:** The engine, starter career/module datasets, sample outputs and fourteen unit tests have now been supplied and integrated. Member 5's source is also present. Do not request either component again. Remaining roadmap route/course mapping decisions are in roadmap-integration-proposal.md; current status and final missing inputs are in member2-current-integration.md.

> **18 October update:** Member 5's actual facilitator/offline/PWA/i18n source and project guide have been received and tested. Do not request that source again. See `member5-integration-review.md` for remaining account-scoping/session changes, current verification and the specific decisions needed from Members 1/5. Other members' real modules/screens and real-service configuration are still missing.

The backend can be implemented/tested independently with fixtures. Final integration must use the actual teammate components and intended hosted services. Collect the items below together to avoid guessing shared interfaces.

| Owner | Files/information to provide | Purpose |
| --- | --- | --- |
| Member 2 | Actual career/roadmap Python module or component ZIP; requirements; .env.example with placeholders; exported function names/signatures; one valid input and expected output; how a roadmap is returned | Replace the temporary career mock and test real engine/error/fallback behavior |
| Member 4 | Actual careers.json, courses.json and opportunities.json; matching/eligibility module if separate; data dictionary; identifiers; one expected filter/match; source verification status and rules for unknown eligibility | Validate datasets, map existing schemas and test actual search/eligibility results |
| Member 1 | Current frontend package.json, src/services/api.js, profile/API models, login component/session hook if any; frontend dev/hosted origin; confirmation of Supabase Auth versus another existing login flow | Connect the real UI, token headers, loading/errors, account restoration and deployment CORS |
| Member 5 | Facilitator/API service source or exact expected JSON; offline queued progress body/headers; retry/order/version behavior; how selected student_id is stored and how expired sessions refresh | Verify assigned-student view and agree synchronization behavior without silently changing fields |
| Team coordinator | Shared repository URL and agreed base branch; agreed hosting service/account; intended frontend URL; agreement on authentication/read-route proposal and administrative assignment process | Prepare a reviewed branch/deployment and run the shared application |
| User/Member 3 | Configure the real database and Supabase Auth locally; provide sanitized db_tools check output; later execute an actual student/teacher login journey and share status/errors without secrets | Validate the intended services rather than only the isolated test database |

Teammate components can be sent as ZIPs of their owned files with dependencies and examples. Include configuration templates, not real keys, database URIs/passwords, refresh tokens or private student records. A GitHub repository/branch URL is also usable when its contents can be accessed.

## Decisions needing team review before enabling secure mode

1. Supabase Auth handles login/session refresh; the frontend sends Authorization: Bearer <access_token> to private backend endpoints.
2. Application roles are student/teacher and managed by backend operator commands. User-editable role metadata is ignored.
3. Students write only their own profile/progress; teachers read only assigned students and do not modify assessment progress.
4. Authenticated profile POST updates the same owned student_id, retaining the existing response shape/status.
5. Optional GET /account, GET /profile and GET /progress have the precise proposed responses in auth-contract-proposal.md. They are disabled by default.
6. Current progress is a last-write-wins upsert. Agree offline event ordering/idempotency requirements with Member 5 before adding fields/headers or claiming conflict-safe offline sync.

These decisions are proposals, not a statement that the team already approved them. Default demo mode preserves the original integration behavior.

## Acceptance evidence needed for the final handoff

- Actual engine results on at least three realistic profiles, malformed output/provider outage handling and roadmap integration.
- Actual dataset loading/search, verified versus unknown opportunity eligibility and stable course IDs.
- Real student A versus student B access checks and assigned versus unassigned teacher access using the team's login UI.
- Real database/Auth setup and a hosted endpoint test with the frontend's origin.
- Offline completion/reconnect/session-refresh behavior with Member 5's actual queue.
- Shared repository review, deployment URL and final limitations agreed by the team.

Until these inputs/tests exist, the deliverable is a tested backend component/review candidate. It should not be described as a fully integrated or deployed project.
