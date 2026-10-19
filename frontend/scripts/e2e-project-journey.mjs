// Real Chrome + live backend. Requires built frontend and both servers running.
// Optional tools: npm install --no-save playwright-core@1.64.1 axe-core@4.14.0
// APP_URL/API_URL select isolated test servers. E2E_TOOLS_DIR is optional.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const require = createRequire(process.env.E2E_TOOLS_DIR ? join(resolve(process.env.E2E_TOOLS_DIR), 'package.json') : import.meta.url);
const { chromium } = require('playwright-core');
const axe = require.resolve('axe-core/axe.min.js');
const APP = process.env.APP_URL || 'http://localhost:5173';
const API = process.env.API_URL || 'http://127.0.0.1:8000';
const reportDir = resolve(process.env.E2E_REPORT_DIR || '../docs');
const shotDir = process.env.E2E_SCREENSHOT_DIR;
mkdirSync(reportDir, { recursive: true });
if (shotDir) mkdirSync(shotDir, { recursive: true });
const report = { mode: 'demo', checks: [], errors: [], executed_at_utc: new Date().toISOString(), limitations: ['Desktop Chrome with mobile emulation; not a physical phone.', 'Hosted Supabase and microphone/audio output not exercised.'] };
const check = (name, ok) => { report.checks.push({ name, passed: !!ok }); if (!ok) throw new Error(name); };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
page.on('pageerror', (error) => report.errors.push(error.message));
const progressRows = () => page.evaluate(async () => {
  const names = await indexedDB.databases();
  const name = names.find((item) => item.name.startsWith('ruralrise-offline-v2:'))?.name;
  if (!name) return [];
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name);
    req.onsuccess = () => { const db = req.result; const tx = db.transaction('pendingProgress'); const rows = tx.objectStore('pendingProgress').getAll(); rows.onsuccess = () => { resolve(rows.result); db.close(); }; rows.onerror = reject; };
    req.onerror = reject;
  });
});
try {
  await page.goto(APP + '/#profile');
  await page.getByLabel('Full name').fill('Fictional Browser Learner');
  await page.getByRole('checkbox', { name: /Electronics/ }).check();
  const created = page.waitForResponse((r) => r.url() === API + '/profile' && r.request().method() === 'POST');
  await page.getByRole('button', { name: /Save my profile/ }).click();
  const saved = await (await created).json();
  report.student_id = saved.student_id;
  await page.getByText('Profile saved to the server.').waitFor();
  check('Profile persisted through live POST /profile', !!saved.student_id);
  await page.getByRole('button', { name: 'Career recommendations', exact: true }).click();
  await page.getByRole('button', { name: 'View learning plan', exact: true }).first().waitFor();
  check('Career rankings loaded from live backend', await page.getByText(/\/100 fit/).count() > 0);
  await page.getByRole('button', { name: 'View learning plan', exact: true }).first().click();
  const read = page.getByRole('button', { name: /^Read / }).first();
  await read.waitFor(); const lessonButton = await read.innerText();
  await read.click();
  await page.getByText(/Lessons are saved on this phone for offline reading/).waitFor();
  await page.waitForFunction(() => navigator.serviceWorker?.controller);
  check('Roadmap opens an actual cached lesson and PWA controls app', true);
  if (shotDir) await page.screenshot({ path: join(shotDir, 'mobile-learning.png'), fullPage: true });
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Mark lesson as complete', exact: true }).click();
  await page.getByRole('button', { name: /Mark .*not complete|Mark .*incomplete/ }).waitFor();
  let rows = await progressRows();
  check('Offline completion is durable and scoped to created student', rows.length === 1 && rows[0].studentId === saved.student_id && rows[0].status === 'pending');
  report.course_id = rows[0].payload.course_id;
  await page.reload();
  await page.getByRole('button', { name: lessonButton, exact: true }).click();
  await page.getByText(/Showing lessons saved on this phone/).waitFor();
  await page.getByRole('button', { name: 'Mark as not complete', exact: true }).waitFor();
  check('Offline reload restores roadmap, content and completion', true);
  await context.setOffline(false);
  await page.waitForFunction(async () => {
    const name = (await indexedDB.databases()).find((d) => d.name.startsWith('ruralrise-offline-v2:'))?.name;
    return new Promise((resolve) => { const req = indexedDB.open(name); req.onsuccess = () => { const db = req.result; const rows = db.transaction('pendingProgress').objectStore('pendingProgress').getAll(); rows.onsuccess = () => { resolve(rows.result.length === 1 && rows.result[0].status === 'synced'); db.close(); }; }; });
  }, null, { timeout: 20000 });
  check('Reconnect automatically syncs exactly one queued row', (await progressRows()).length === 1);
  await page.getByRole('button', { name: 'Opportunities', exact: true }).click();
  await page.getByRole('button', { name: /^View details:/ }).first().waitFor();
  const filteredResponse = page.waitForResponse((r) => r.url().includes('/opportunities?category=scholarship'));
  await page.locator('select[name="category"]').selectOption('scholarship');
  await filteredResponse;
  check('Opportunity filters call the documented live endpoint', true);
  await page.getByRole('button', { name: /^View details:/ }).first().click();
  await page.getByRole('dialog').waitFor();
  const official = page.getByRole('link', { name: 'Open official source' });
  check('Opportunity links retain official HTTPS URLs', (await official.getAttribute('href')).startsWith('https://'));
  await page.keyboard.press('Escape');
  check('Modal closes using keyboard', await page.getByRole('dialog').count() === 0);
  await page.getByRole('button', { name: 'Facilitator dashboard', exact: true }).click();
  await page.getByText('Demo Student', { exact: true }).first().waitFor();
  check('Demo facilitator remains fictional only', await page.getByText('Fictional Browser Learner', { exact: true }).count() === 0);
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.addScriptTag({ path: axe });
  const accessibility = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target) })));
  report.accessibility = accessibility;
  check('Dashboard automated WCAG A/AA scan', accessibility.length === 0);
  check('360 px view has no horizontal page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1440, height: 1000 });
  if (shotDir) await page.screenshot({ path: join(shotDir, 'desktop-dashboard.png'), fullPage: true });
  check('No uncaught browser errors', report.errors.length === 0);
} catch (error) { report.failure = error.stack; process.exitCode = 1; }
finally {
  await browser.close(); report.passed = !report.failure;
  writeFileSync(join(reportDir, 'completion-browser-verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
