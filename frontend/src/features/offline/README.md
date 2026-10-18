# Offline learning + PWA

## What works offline (tested in real Chrome with `scripts/e2e-offline-journey.mjs`)

1. The student opens the app while connected.
2. The app shell (HTML/JS/CSS/icons) is precached by the service worker, and
   lesson content (`GET /courses`) is saved in IndexedDB.
3. The device goes offline. In the test, the web server was also stopped.
4. The app reopens from the cache, and saved lessons can be read.
5. The student marks a lesson complete.
6. Progress is saved in IndexedDB: **"Saved locally — waiting to synchronise"**.
7. The device reconnects.
8. Pending progress is sent to `POST /progress` automatically. This happens on
   reconnect, when the app opens, when the app returns to the foreground, or
   when the user presses **Sync now**.
9. The UI confirms: **"Synced successfully"**. On failure it shows **"Synchronisation failed"**.

## Two separate storage mechanisms (on purpose)

| What | Where | Why |
| --- | --- | --- |
| App shell (HTML, JS, CSS, icons, manifest, offline.html) | Service worker precache (vite-plugin-pwa / Workbox) | Lets the app open with no network |
| Lesson content | IndexedDB `ruralrise-offline` → `lessons` | Explicit copy; the app knows it is a *saved copy* and says so |
| Pending progress | IndexedDB `ruralrise-offline` → `pendingProgress` | Caching HTML does **not** save progress. Writes need a durable queue |

API responses are **not** cached by the service worker. A cached response would
make old data look "live". This was found and fixed during browser testing.

## Duplicate and failure handling

- There is one queue record per `(student_id, course_id)`, the same key as the backend upsert.
  Tapping twice never sends twice. Identical updates that are already
  pending or synced are ignored.
- A record becomes "synced" only after the server answers `{"saved": true}`.
- If the student changes the same lesson during an upload, the newer change
  stays pending (revision check).
- Network, timeout and 5xx failures are retried automatically. 404 and 422 (unknown
  student or course, invalid data) are not retried automatically, because a retry
  cannot succeed. The user can still press **Sync now**.
- Only one sync runs at a time: single-flight within a tab, plus the Web Locks
  API across tabs where the browser supports it.

## Use it

```jsx
// Whole screen:
import { OfflineLessons, OfflineBanner } from './features/offline';
<OfflineBanner />                                             // once, in the app shell
<OfflineLessons studentId={currentStudentId} studentName={name} />

// Or only the logic, inside Member 1's own lesson screen:
import { useProgressSync, SyncStatusBadge, loadLessons } from './features/offline';
const { saveProgress, recordFor, syncNow, online } = useProgressSync({ studentId });
await saveProgress({ course_id: 'demo-safety', completed: true }); // score optional, 0–100
<SyncStatusBadge record={recordFor('demo-safety')} />
```

`registerPWA()` must be called once in `src/main.jsx`:
`import { registerPWA } from './features/offline/registerPWA.js'; registerPWA();`

## PWA configuration (shared files, see the handoff for merge rules)

- Plugin: `vite-plugin-pwa@2.0.0`, `generateSW` mode, `registerType: 'autoUpdate'`.
  It is needed because Vite renames built files on every build, so a hand-written
  service worker's file list would go stale. The plugin generates it each build.
- `manifest: false` in the plugin. The manifest is the static file
  `public/manifest.webmanifest`, linked from `index.html`.
- The service worker is **disabled in `npm run dev`**. To test offline, use
  `npm run build` and then `npm run preview` (port 5173, which the backend CORS allows).
- There must be exactly one `VitePWA()` call and no other `navigator.serviceWorker.register`.

## Limitations (honest list)

- **First visit must be online.** Nothing can be cached before the first load.
- Only lessons from `GET /courses` are saved. Recommendations, opportunities
  and the facilitator dashboard need the internet. The dashboard falls back to
  *labelled* demo data when the server is unreachable.
- `navigator.onLine` only means "has a network". The server can still be
  unreachable, and requests then fail, are retried, and are reported.
- The backend has no client timestamp. If two devices edit the same lesson
  offline, the **last one to sync wins**. Member 3 must review this before real use.
- Private or incognito mode, or "clear site data", can delete IndexedDB. The UI
  shows a storage error if IndexedDB is unavailable.
- iOS Safari may evict storage after about 7 days without use. Background Sync is not used
  because Safari and Firefox do not support it. Sync happens while the app is open.
- **Voice:** browser speech recognition (Web Speech API) usually needs a network
  connection and is not supported in every browser. It does **not** work offline.
  The offline feature contains no voice functionality.
- Tested in desktop Chrome with a phone-size viewport. Not yet tested on a real
  low-end Android phone. See `tests/test_offline_mode.md` for the manual steps.
