# Offline mode — manual test

**Automated equivalent:** `frontend/scripts/e2e-offline-journey.mjs` (real Chrome).
Result on 18 Oct 2026: **22/22 checks passed**.
**Not yet done:** the same steps on a real low-end Android phone (section 3).

> The service worker only exists in a **production build**. `npm run dev` will
> NOT work offline. That is intentional.

## 1. Prepare (Windows PowerShell)

Terminal 1, from the `ruralrise-ai` folder (backend):

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Terminal 2, from `ruralrise-ai\frontend`:

```powershell
npm run build
npm run preview
```

Expected: `Local: http://localhost:5173/`. Port 5173 is required because the backend's CORS allows only that port.

## 2. Desktop Chrome / Edge

| Step | Do this | Expected result | Pass? |
| --- | --- | --- | --- |
| H1 | Open <http://localhost:5173/#lessons> | "Lessons are saved on this phone for offline reading (saved …)" | |
| H2 | F12 → **Application** → Service Workers | `sw.js` *activated and is running* | |
| H3 | Application → Cache Storage → `workbox-precache-…` | `index.html`, `assets/*.js`, `assets/*.css`, icons, `offline.html` | |
| H4 | Application → IndexedDB → `ruralrise-offline` → `lessons` | 2 lesson records | |
| H5 | Top of page shows "✓ App saved on this phone for offline use." | Visible | |
| H6 | **Network** tab → throttling → **Offline**. Also stop `npm run preview` (Ctrl+C) | — | |
| H7 | Close the tab, open a new tab at <http://localhost:5173/#lessons> | App opens. Yellow "You are offline." banner. "No connection to the server. Showing lessons saved on this phone on …" | |
| H8 | Open "Demo: Plan a learning week" | Lesson text and practical task readable | |
| I1 | Press **Mark lesson as complete** | "Saved on this phone. It will be sent when you are back online." Badge: "● Saved locally — waiting to synchronise". "Sync now" disabled | |
| I2 | IndexedDB → `pendingProgress` | One record, `status: "pending"` | |
| I3 | Reload the page (still offline) | Still "Updates waiting to synchronise: 1." | |
| I4 | In another terminal: `curl http://127.0.0.1:8000/facilitator/students` | `demo-planning` NOT yet completed for demo-student-001 | |
| J1 | Start `npm run preview` again; set Network back to **No throttling** | Within a few seconds: "Synced successfully (1)." Badge "✓ Synced successfully" | |
| J2 | Repeat the curl from I4 | Exactly **one** `demo-planning` record, `completed: true` | |
| J3 | Open **Facilitator dashboard** → Refresh → View details for Demo Student | "Demo: Plan a learning week — Completed" | |
| J4 | Stop the **backend** only (Ctrl+C in Terminal 1), mark another lesson complete | "Synchronisation failed — will try again when online" (or "Could not reach the server…") | |
| J5 | Start the backend again, press **Sync now** | "Synced successfully" | |

Reset the demo record afterwards (optional):

```powershell
curl.exe -X POST http://127.0.0.1:8000/progress -H "Content-Type: application/json" -d '{\"student_id\":\"demo-student-001\",\"course_id\":\"demo-planning\",\"completed\":false}'
```

## 3. Real Android phone (recommended before the demo — NOT yet done)

The phone and laptop must be on the same Wi-Fi network. Service workers need **HTTPS or localhost**, so
use Chrome **USB port forwarding** (the simplest option):

1. On the phone: Settings → About → tap *Build number* 7 times → Developer options → **USB debugging** on.
2. Connect USB. On the laptop, open Chrome at `chrome://inspect/#devices` → **Port forwarding…** → add
   `5173 → localhost:5173` **and** `8000 → localhost:8000` → tick *Enable port forwarding*.
3. On the phone's Chrome open `http://localhost:5173/#lessons`.
4. Repeat H1, H5, H7–J3, using **Airplane mode** instead of DevTools Offline.
5. Chrome menu → **Add to Home screen / Install app**. Open it from the home-screen icon in Airplane mode.

Record the phone model, Android version and Chrome version in the results.

## 4. Known limitations to mention during the demo

- The first visit must be online.
- Only lessons are available offline. Recommendations, opportunities and live dashboard data need the internet.
- Voice input (if added by Member 1) usually needs the internet and is not supported on all browsers.
- If two devices change the same lesson while offline, the last one to sync wins.
