# Authentication and account-read contract proposal — review before enabling

This is a proposed opt-in extension to the agreed Member 3 APIs. Share with Members 1/5 and the coordinator before enabling AUTH_MODE=supabase or ENABLE_ACCOUNT_ROUTES=true in the shared application.

## Existing routes

| Route | Demo/default behavior | Proposed secure behavior |
| --- | --- | --- |
| GET /health | Public liveness | Same |
| GET /courses | Public catalog | Same |
| GET /opportunities | Public catalog search | Same |
| POST /profile | Creates a profile from agreed body | Student token required; save/update that account's single owned profile |
| POST /recommendations | Accepts agreed profile, calls current engine | Student/teacher token required; same body/response |
| POST /progress | Saves for known saved/demo ID | Student token required; student_id must belong to that token's account |
| GET /facilitator/students | Two fictional learners | Teacher token required; returns assigned students only |

All existing JSON field names/envelopes stay the same. Existing public request/response schemas in schemas.py were not modified. Secure profile POST keeps status 201 for compatibility even when updating; student_id remains stable across authenticated retries/updates. Demo mode remains create-per-POST so existing tests/fixtures continue to work.

The frontend obtains a Supabase Auth access token through its own login/session flow. Private backend requests include:

```http
Authorization: Bearer <current-access-token>
Content-Type: application/json
```

Do not send database credentials, Supabase service-role keys, passwords or refresh tokens to these APIs. The backend's own project publishable key is configured server-side for the Auth verification request. Roles come from the application's database, not the user_metadata/app_metadata values supplied by a caller.

## Proposed optional read methods

Only available if both AUTH_MODE=supabase and ENABLE_ACCOUNT_ROUTES=true after review:

| Method/path | Authorized caller | Response |
| --- | --- | --- |
| GET /account | Logged-in student/teacher | `{"user_id":"AUTH_UUID","role":"student"}` or role teacher |
| GET /profile | Student | Same `{"student_id":"...","profile":{...}}` shape returned by POST /profile |
| GET /progress | Student | `{"progress":[{"student_id":"...","course_id":"...","completed":true,"score":80,"updated_at":"..."}]}` |

Before a student saves a profile, the two profile/progress reads return 404 with `No profile has been saved for this account.` These APIs do not accept another student's ID in query/body to select a private account. The server resolves ownership from the verified token.

## Errors

- 401 with WWW-Authenticate: Bearer: missing/invalid token, wrong header scheme or disallowed anonymous Auth account.
- 403: authenticated account has the wrong application role or is inactive.
- 404 for a progress write: unknown/unowned student_id; the response does not distinguish another student's existing ID from an unknown ID.
- 422: existing input-validation behavior, including extra profile fields such as an attempted role.
- 503: Auth service outage/malformed upstream response or database unavailability. No demo/JSON fallback.

The frontend should refresh an expired access token through its existing Supabase session lifecycle, then retry only appropriate requests. It must not turn a 401/403/503 into a fake success or switch a private route to demo data for a signed-in user.

## Teacher assignment and administration

Trusted operator CLI commands manage application roles, active state, legacy profile links and assignments; no public privilege-granting HTTP endpoint is introduced. Teacher UUIDs come from actual Supabase Auth accounts. Students create owned profiles through authenticated POST /profile. Teacher dashboard GET /facilitator/students exposes only the teacher's assigned learners with their progress; an unassigned teacher gets `{"students":[]}`.

## Current limitations

Scores are submitted progress values validated as integers 0–100; they are not server-graded quiz results or a verified skills certificate. Offline updates remain last-write-wins until Member 5's actual event/retry format is agreed. Public course/opportunity catalogs and career outputs still depend on Member 2/4 components; the shipped fixtures are explicitly mocks.

Token verification follows Supabase's documented server /user check using the configured project's HTTPS endpoint. It uses no custom JWT cryptography. Each private request checks the provider and the application's current role/active state. Automated provider-boundary tests use controlled responses; a real project/session test remains required. Sources: <https://supabase.com/docs/guides/auth/jwts> and <https://supabase.com/docs/reference/python/auth-getuser>.
