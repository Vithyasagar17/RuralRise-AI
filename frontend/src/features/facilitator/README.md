# Facilitator dashboard

A teacher/facilitator view of a group of students: progress, career interests,
recommended pathways, suggested next steps, and opportunities to share.
Self-contained: it brings its own styles, data access, mock data and tests.

## Use it

```jsx
import { FacilitatorDashboard } from './features/facilitator';

<FacilitatorDashboard />                      // live backend; labelled mock data if unreachable
<FacilitatorDashboard dataSource="api" />     // live backend only; shows an error instead of mock data
<FacilitatorDashboard dataSource="mock" />    // fictional data, no network
<FacilitatorDashboard isAuthorized={false} /> // "no permission" view, loads nothing
```

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `dataSource` | `'auto' \| 'api' \| 'mock'` | `'auto'` | Where data comes from (see above). |
| `isAuthorized` | `boolean` | `true` | Connect this to the team's login/role check when it exists. **The backend has no authentication yet.** |
| `fetchImpl` | `function` | `fetch` | Replacement `fetch`, for tests. |

Wrap the app in `<LanguageProvider>` (from `features/i18n`) for language
switching. Without it, the dashboard still works in English.

## Backend endpoints used (Member 3 contract, unchanged)

| Call | Used for |
| --- | --- |
| `GET /facilitator/students` → `{students:[{student_id, profile, progress}]}` | Student list, interests, progress |
| `GET /courses` → `[Course]` | Module list and completion percentage |
| `GET /opportunities` → `[Opportunity]` | "Opportunities you can share" |
| `POST /recommendations` (StudentProfile) → `{careers:[...]}` | "Recommended learning pathways" in the details view |

The base URL comes from `VITE_API_BASE_URL` (`frontend/.env`), default `http://127.0.0.1:8000`.

## Behaviour worth knowing

- **Completion %** = completed modules that exist in `GET /courses` ÷ number of courses.
  If the course list cannot load, the dashboard tries the copy saved by the
  offline lesson reader. If neither is available it shows counts only and never
  guesses a percentage.
- **Status**: *Not started* (no module completed), *In progress*, *All modules completed*.
- **Suggested next steps** are simple, explainable rules (next incomplete
  module, inactive for 14+ days, missing interests), plus the `next_steps`
  text returned by the recommendation engine. They are not AI decisions.
- **Opportunities**: missing deadlines, links or verification dates are shown
  as "Not verified". Nothing is invented. Only `http(s)` links are shown as links.
  "Lists Class 12" means the catalogue tag matches. It is **not** an eligibility decision.
  "Share" uses the phone share sheet, then the clipboard, then shows text to copy by hand.
- **Bad data**: records without `student_id` are skipped (and counted), missing
  profile fields show "Not provided" plus a warning, and invalid progress rows are ignored.

## Files

| File | Purpose |
| --- | --- |
| `FacilitatorDashboard.jsx` | Main component: overview cards, search/filter, list ↔ details |
| `StudentList.jsx`, `StudentProgressCard.jsx` | Responsive student cards |
| `StudentDetails.jsx` | One student: profile, modules, pathways, next steps, opportunities |
| `OpportunityShareList.jsx` | Opportunity cards with Share button |
| `ProgressBar.jsx` | Accessible progress bar |
| `facilitatorApi.js` | API calls + `loadFacilitatorData()` with mock fallback |
| `useFacilitatorData.js` | React hook wrapping `loadFacilitatorData()` |
| `facilitatorUtils.js` | Pure functions: validation, progress maths, next steps |
| `facilitatorMockData.js` | Fictional data in the exact backend JSON shapes |
| `facilitator.css` | Styles (prefix `rr-fac-`), mobile-first |
| `index.js` | Public exports |
| `*.test.js(x)` | Tests (`npm test`) |
