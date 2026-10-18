// REAL-BROWSER offline journey test. Not part of `npm test`.
//
// What it does: builds nothing itself. Run `npm run build` first. It starts
// `npm run preview`, opens Google Chrome at phone size (360x740), and checks:
// app shell precached -> lessons saved in IndexedDB -> browser offline AND web
// server stopped -> app reopens -> lesson readable -> mark complete -> "Saved
// locally" -> reconnect -> automatic sync -> backend has exactly one record ->
// facilitator sees it -> no horizontal scroll -> axe-core WCAG A/AA scan -> Tamil.
//
// One-time setup (does NOT change package.json):
//   cd frontend
//   npm install --no-save playwright-core@1.64.1 axe-core
// Requirements: Google Chrome installed; backend running on http://127.0.0.1:8000;
// nothing else using port 5173 (stop `npm run dev` first).
// Run (from frontend/):
//   npm run build
//   node scripts/e2e-offline-journey.mjs . e2e-screenshots   (folder is git-ignored)
// Windows only as written (uses taskkill to stop the preview server).
import { spawn, execSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const [frontendDir, shotDir] = process.argv.slice(2);
mkdirSync(shotDir, { recursive: true });
const APP = 'http://localhost:5173';
const API = 'http://127.0.0.1:8000';
const log = (...a) => console.log('•', ...a);
const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(ok ? 'PASS' : 'FAIL', name, extra);
  if (!ok) process.exitCode = 1;
};

let preview;
function startPreview() {
  preview = spawn('npm run preview', { cwd: frontendDir, shell: true, stdio: 'pipe' });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('preview did not start')), 30000);
    preview.stdout.on('data', (d) => { if (String(d).includes('5173')) { clearTimeout(t); resolve(); } });
    preview.stderr.on('data', (d) => process.stderr.write(d));
  });
}
function stopPreview() {
  try { execSync(`taskkill /pid ${preview.pid} /T /F`, { stdio: 'ignore' }); } catch {}
}
async function serverUp() {
  try { await fetch(APP, { signal: AbortSignal.timeout(1500) }); return true; } catch { return false; }
}

// Reset the demo record this test touches so the run is repeatable.
await fetch(`${API}/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ student_id: 'demo-student-001', course_id: 'demo-planning', completed: false, score: null }) });

await startPreview();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const consoleErrors = [];
let page = await context.newPage();
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push(String(e)));

try {
  // 1. Open while connected.
  await page.goto(`${APP}/#lessons`);
  await page.getByText(/Lessons are saved on this phone for offline reading/).waitFor();
  check('1. online: lessons loaded and saved to IndexedDB', true);

  // 2. Assets + lesson content cached.
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 });
  // Second visit: now the worker sees API requests and can runtime-cache them.
  await page.reload();
  await page.getByText(/Lessons are saved on this phone for offline reading/).waitFor();
  await page.waitForTimeout(500);
  const cacheInfo = await page.evaluate(async () => {
    const out = {};
    for (const name of await caches.keys()) out[name] = (await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname);
    return out;
  });
  const precache = Object.entries(cacheInfo).find(([n]) => n.includes('precache'))?.[1] ?? [];
  check('2a. service worker controls page', true);
  check('2b. app shell precached (index.html + JS + CSS)', precache.includes('/index.html') && precache.some((p) => p.endsWith('.js')) && precache.some((p) => p.endsWith('.css')), JSON.stringify(precache));
  check('2c. API responses are NOT in service-worker caches (freshness stays honest)', !Object.values(cacheInfo).flat().some((p) => /^\/(courses|opportunities|facilitator)/.test(p)), JSON.stringify(Object.keys(cacheInfo)));
  const idb = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('ruralrise-offline'); r.onsuccess = () => { const q = r.result.transaction('lessons').objectStore('lessons').count(); q.onsuccess = () => res(q.result); }; }));
  check('2e. lesson content stored in IndexedDB', idb === 2, `lessons=${idb}`);
  await page.getByText('App saved on this phone for offline use.').waitFor();
  check('2d. "App saved for offline use" indicator shown', true);
  await page.screenshot({ path: `${shotDir}/01-lessons-online.png`, fullPage: true });

  // 3. Disconnect: browser offline AND the web server stopped.
  await context.setOffline(true);
  stopPreview();
  await new Promise((r) => setTimeout(r, 1000));
  check('3. web server really stopped', !(await serverUp()));

  // 4. Reopen the app (new tab) and read the cached lesson.
  await page.close();
  page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  await page.goto(`${APP}/#lessons`);
  await page.getByText('You are offline.').waitFor();
  await page.getByText(/No connection to the server. Showing lessons saved on this phone/).waitFor();
  check('4a. app reopened offline from service worker cache', true);
  await page.getByRole('button', { name: 'Open lesson: Demo: Plan a learning week' }).click();
  await page.getByText(/divide your available time into short sessions/).waitFor();
  check('4b. cached lesson text readable offline', true);

  // 5-6. Complete the lesson; stored locally.
  await page.getByRole('button', { name: 'Mark lesson as complete' }).click();
  await page.getByText('Saved on this phone. It will be sent when you are back online.').waitFor();
  const badge = await page.locator('.rr-off-reader [data-status]').innerText();
  check('5-6. progress saved locally, waiting to synchronise', /Saved locally/.test(badge) && /waiting to synchronise/.test(badge), badge);
  await page.screenshot({ path: `${shotDir}/02-lesson-offline-saved-locally.png`, fullPage: true });

  // Survives closing and reopening the app while still offline.
  await page.reload();
  await page.getByText('Updates waiting to synchronise: 1.').waitFor();
  check('6b. pending progress persists after reopening offline', true);
  const backendBefore = await (await fetch(`${API}/facilitator/students`)).json();
  const before = backendBefore.students.find((s) => s.student_id === 'demo-student-001').progress.find((p) => p.course_id === 'demo-planning');
  check('6c. backend NOT updated while offline', !before || before.completed === false);

  // 7-9. Reconnect -> automatic sync -> confirmation.
  await startPreview();
  await context.setOffline(false);
  await page.getByText('Synced successfully (1).').waitFor({ timeout: 15000 });
  check('7-9a. automatic sync after reconnect, confirmation shown', true);
  const backendAfter = await (await fetch(`${API}/facilitator/students`)).json();
  const after = backendAfter.students.find((s) => s.student_id === 'demo-student-001').progress.filter((p) => p.course_id === 'demo-planning');
  check('7-9b. backend has exactly one completed record', after.length === 1 && after[0].completed === true, JSON.stringify(after));
  await page.screenshot({ path: `${shotDir}/03-synced.png`, fullPage: true });

  // Facilitator sees the synced progress.
  await page.getByRole('button', { name: 'Facilitator dashboard' }).click();
  await page.getByText('Live data from the RuralRise server.').waitFor();
  await page.screenshot({ path: `${shotDir}/04-facilitator-360px.png`, fullPage: true });
  await page.getByRole('button', { name: 'View details for Demo Student' }).click();
  await page.getByText('Solar PV Technician', { exact: true }).waitFor();
  const detailsText = await page.locator('.rr-fac-details').innerText();
  check('10. facilitator details show synced module as completed', /Demo: Plan a learning week\s*\n?\s*Completed/.test(detailsText));
  await page.screenshot({ path: `${shotDir}/05-facilitator-details-360px.png`, fullPage: true });

  // No horizontal scrolling at 360px.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('11. no horizontal scroll at 360px (details)', overflow <= 0, `overflow=${overflow}`);

  // Automated accessibility scan (axe-core, WCAG 2 A/AA rules).
  const axePath = require.resolve('axe-core/axe.min.js');
  const runAxe = async () => {
    await page.addScriptTag({ content: readFileSync(axePath, 'utf8') });
    return page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((v) => `${v.id}: ${v.nodes.length} (${v.help})`));
  };
  const v1 = await runAxe();
  check('12a. axe: facilitator details has no WCAG A/AA violations', v1.length === 0, v1.join(' | '));
  await page.getByRole('button', { name: 'Back to all students' }).first().click();
  const v2 = await runAxe();
  check('12b. axe: facilitator list has no WCAG A/AA violations', v2.length === 0, v2.join(' | '));
  await page.getByRole('button', { name: 'My lessons (offline)' }).click();
  await page.getByText(/Lessons are saved on this phone/).waitFor();
  const v3 = await runAxe();
  check('12c. axe: lessons screen has no WCAG A/AA violations', v3.length === 0, v3.join(' | '));

  // Tamil draft renders and is flagged.
  await page.getByLabel('Language').selectOption('ta');
  await page.getByText('வரைவு மொழிபெயர்ப்பு', { exact: false }).waitFor();
  check('13. Tamil UI renders with draft notice; <html lang="ta">', (await page.evaluate(() => document.documentElement.lang)) === 'ta');
  await page.getByRole('button', { name: 'வழிகாட்டி பலகை' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shotDir}/06-facilitator-tamil-360px.png`, fullPage: true });

  // Desktop layout.
  await page.getByLabel('மொழி').selectOption('en');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shotDir}/07-facilitator-desktop.png`, fullPage: true });

  // Manifest is valid JSON with required fields and icons load.
  const manifest = await (await fetch(`${APP}/manifest.webmanifest`)).json();
  const iconsOk = await Promise.all(manifest.icons.map(async (i) => (await fetch(APP + i.src)).ok));
  check('14. manifest valid; all icons reachable', manifest.name && manifest.start_url && manifest.display === 'standalone' && iconsOk.every(Boolean));

  check('15. no console errors (excluding expected offline fetch failures)',
    consoleErrors.filter((e) => !/Failed to load resource|ERR_INTERNET_DISCONNECTED|net::ERR/.test(e)).length === 0,
    JSON.stringify(consoleErrors));
} catch (error) {
  check('UNEXPECTED ERROR', false, error.stack);
  await page.screenshot({ path: `${shotDir}/error.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  stopPreview();
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
}
