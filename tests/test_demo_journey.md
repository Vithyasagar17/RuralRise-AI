# QA checklist — complete student journey

Use this before every demo and after every merge. Mark each line **Pass / Fail / Blocked**,
and add the date, the device or browser, and your name. Only mark **Pass** after you have
actually seen the result. Write down any failure as an issue for the owner.

Status column below = state on **18 Oct 2026**.
"Blocked" means another member's part does not exist in the folder yet.

**Setup:** backend running (`README.md` at repo root), frontend `npm run dev` or
`npm run build && npm run preview`. Open <http://localhost:5173>. Use fictional data only.

## A. Student onboarding (owner: Member 1 UI, Member 3 `POST /profile`)

| # | Step | Expected | Status 18 Oct |
| --- | --- | --- | --- |
| A1 | Open onboarding, fill all required fields | Form accepts input; every field has a visible label | Blocked (Member 1 UI not in folder) |
| A2 | Submit with a required field empty | Clear message next to the field; input kept | Blocked |
| A3 | Submit valid profile | `201`, `student_id` returned and kept for later screens | Blocked (API returns 201 — Member 3 tests) |
| A4 | Hours = 0, 200 or "five" | Rejected with readable message (backend 422) | Blocked |
| A5 | Keyboard only: Tab through form, submit with Enter | All controls reachable, focus visible | Blocked |

## B. Career recommendations (Member 1 UI, Member 2 engine)

| # | Step | Expected | Status 18 Oct |
| --- | --- | --- | --- |
| B1 | Request recommendations for a saved profile | List of careers with title, reasons, next steps | Pass at API level (live contract test); UI Blocked |
| B2 | `match_score` shown | Integer 0–100; not presented as probability. Backend mock returns 0 (placeholder) | Pass (facilitator details) |
| B3 | Recommendation service down (503) | "Recommendations could not be loaded" + reason; no fake data | Pass (facilitator, automated) |

## C. Learning roadmap (Member 1 UI, Member 2)

| # | Step | Expected | Status 18 Oct |
| --- | --- | --- | --- |
| C1 | Open roadmap from recommendation | Ordered steps/modules | Blocked (not built) |
| C2 | Roadmap links to lessons | Lesson opens | Blocked |

## D. Opportunity listing (Member 1 UI, Member 4 data)

| # | Step | Expected | Status 18 Oct |
| --- | --- | --- | --- |
| D1 | List opportunities | Title, category, description, deadline, source, verification | Pass in facilitator view; student UI Blocked |
| D2 | Missing deadline / URL | "Not verified" / "No verified official link"; nothing invented | Pass |
| D3 | Every real record has a verified source & `last_verified` date | Member 4 confirms | Blocked (only fictional fixtures exist) |

## E. Lesson completion (offline lesson reader)

| # | Step | Expected | Status 18 Oct |
| --- | --- | --- | --- |
| E1 | Open "My lessons", open a lesson | Title, skill, lesson text, practical task | Pass (Chrome + automated) |
| E2 | Mark lesson as complete (online) | "Synced successfully"; backend has the record | Pass |
| E3 | Mark as not complete | Button returns to "Mark lesson as complete"; synced `completed:false` | Pass (automated) |
| E4 | Tap complete twice quickly | Exactly one POST | Pass (automated) |
| E5 | No student selected | Warning; cannot save | Pass (automated) |

## F. Facilitator dashboard

| # | Step | Expected | Status 18 Oct |
| --- | --- | --- | --- |
| F1 | Open dashboard | "Live data from the RuralRise server", overview numbers, student cards | Pass |
| F2 | Card shows name/ID, education, interests, progress bar, status, last activity | All visible, readable at 360 px | Pass |
| F3 | Search "electronics"; filter "Not started" | Count updates ("Showing X of Y") | Pass (automated) |
| F4 | View details → profile, modules (✓/○), pathways, next steps, opportunities | All sections present; focus moves to name heading | Pass |
| F5 | Back to all students | List returns, focus back on the card button | Pass |
| F6 | Share an opportunity | Share sheet / "Copied" / text to copy; includes eligibility reminder | Pass (clipboard path automated) |
| F7 | Backend stopped, reload dashboard | Yellow "Server not reachable… fictional demo data" notice | Pass (automated) |
| F8 | Progress synced from a student appears after Refresh | Module shows "Completed" | Pass (Chrome e2e) |
| F9 | Real student data protected | Requires login + roles | **Not implemented (team decision needed)** |

## G. Small-screen usability → see `test_mobile_ui.md`

## H–J. Offline access, local persistence, reconnection → see `test_offline_mode.md`

## K. API errors

| # | Situation | Expected | Status 18 Oct |
| --- | --- | --- | --- |
| K1 | Backend not running | Dashboard: labelled demo data; Lessons: saved copy or "No lessons saved yet" | Pass |
| K2 | `POST /progress` → 503 | "Synchronisation failed — will try again when online"; progress kept | Pass (automated) |
| K3 | `POST /progress` → 404 unknown student | "Synchronisation failed — server did not accept…"; not auto-retried | Pass (automated + live 404 check) |
| K4 | `POST /progress` → 422 | Same as K3 | Pass (automated + live 422 check) |
| K5 | Slow server (>10 s) | Timeout message, retry later | Pass (automated) |
| K6 | Server answers 200 but not JSON | "The server sent information that could not be read." | Pass (automated) |

## L. Missing or malformed data

| # | Situation | Expected | Status 18 Oct |
| --- | --- | --- | --- |
| L1 | Student without `student_id` | Skipped; "Records skipped…: 1" | Pass (automated) |
| L2 | Missing name / education / interests | "Not provided" + "Some profile details are missing" | Pass (automated) |
| L3 | Progress row with `completed:"yes"` or score 120 | Row ignored / score hidden | Pass (automated) |
| L4 | Progress for a course not in `/courses` | Not counted in %; note shown | Pass (automated) |
| L5 | `/facilitator/students` returns wrong shape | Error state, no crash | Pass (automated) |
| L6 | `official_url` = `javascript:` | Not rendered as a link | Pass (automated) |
| L7 | `/courses` unavailable | Counts only, no % guessed; uses device copy if any | Pass (automated) |

## Language and accessibility (all screens)

| # | Check | Status 18 Oct |
| --- | --- | --- |
| X1 | Language selector labelled; choice remembered after reload; `<html lang>` updates | Pass |
| X2 | Tamil shows "Draft translation" notice until a native speaker reviews it | Pass (notice); **Tamil review: Not done** |
| X3 | axe-core WCAG 2 A/AA scan: facilitator list, details, lessons | Pass (0 violations) |
| X4 | Status never shown by colour alone (✓ ○ ◐ ● ! + text) | Pass |
| X5 | Buttons ≥ 44 px tall; base text ≥ 17 px | Pass |
| X6 | Screen-reader walk-through (TalkBack on Android) | **Not done — recommended** |
