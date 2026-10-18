// Run by verify_member5.py. Uses Member 5's actual modules and a JSON ASGI bridge.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const frontend = resolve(process.argv[2]);
const requireFrontend = createRequire(resolve(frontend, 'package.json'));
requireFrontend('fake-indexeddb/auto');
const moduleAt = (name) => import(pathToFileURL(resolve(frontend, 'src/features', name)).href);
const { requestJson, ApiError } = await moduleAt('common/apiClient.js');
const { loadFacilitatorData, fetchRecommendations } = await moduleAt('facilitator/facilitatorApi.js');
const { saveProgressLocally, listProgressRecords, getProgressRecord } = await moduleAt('offline/progressQueue.js');
const { syncPendingProgress } = await moduleAt('offline/syncManager.js');
let sequence = 0;
const waiting = new Map();
const input = createInterface({ input: process.stdin });
input.on('line', (line) => {
  const data = JSON.parse(line);
  const done = waiting.get(data.id);
  waiting.delete(data.id);
  done(new Response(JSON.stringify(data.body), { status: data.status, headers: data.headers }));
});
globalThis.fetch = async (url, options = {}) => {
  const id = ++sequence;
  const response = new Promise((done) => waiting.set(id, done));
  process.stdout.write(JSON.stringify({ id, path: new URL(url).pathname + new URL(url).search,
    method: options.method || 'GET', headers: options.headers || {}, body: options.body }) + '\n');
  return response;
};
const checks = [];
const check = async (name, work) => { await work(); checks.push(name); };
try {
  await check('health uses the actual frontend JSON client', async () => {
    assert.deepEqual(await requestJson('/health'), { status: 'ok' });
  });
  let bundle;
  await check('actual dashboard normalizers accept backend students and catalogs', async () => {
    bundle = await loadFacilitatorData({ dataSource: 'api' });
    assert.equal(bundle.error, null);
    assert.equal(bundle.source, 'api');
    assert.equal(bundle.skipped, 0);
    assert.equal(bundle.students.length, 2);
    assert.equal(bundle.coursesSource, 'api');
    assert.equal(bundle.courses.length, 2);
    assert.equal(bundle.opportunities.length, 2);
  });
  await check('actual recommendation adapter accepts backend response', async () => {
    assert.equal((await fetchRecommendations(bundle.students[0].profile)).length, 3);
  });
  let created;
  await check('profile creation returns a usable ID without altering the shared envelope', async () => {
    created = await requestJson('/profile', { method: 'POST', body: bundle.students[0].profile });
    assert.equal(typeof created.student_id, 'string');
    assert.deepEqual(created.profile, bundle.students[0].profile);
  });
  const payload = { student_id: 'demo-student-001', course_id: 'demo-safety', completed: true, score: 83 };
  await check('offline double taps leave one queued record', async () => {
    await saveProgressLocally(payload);
    await saveProgressLocally(payload);
    assert.equal((await listProgressRecords()).length, 1);
  });
  await check('actual queue synchronizes with backend confirmation', async () => {
    const result = await syncPendingProgress({ studentId: payload.student_id });
    assert.equal(result.synced, 1);
    assert.equal(result.failed, 0);
    const local = await getProgressRecord(payload.student_id, payload.course_id);
    assert.equal(local.status, 'synced');
    assert.ok(local.serverUpdatedAt);
  });
  await check('facilitator sees one persisted row and the uploaded score', async () => {
    const data = await loadFacilitatorData({ dataSource: 'api' });
    const rows = data.students.find((s) => s.student_id === payload.student_id).progress;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].score, 83);
    assert.equal(rows[0].completed, true);
  });
  await check('created profiles can submit progress', async () => {
    const response = await requestJson('/progress', { method: 'POST', body: { ...payload, student_id: created.student_id } });
    assert.equal(response.saved, true);
  });
  await check('unknown IDs remain permanent queue failures without false success', async () => {
    await saveProgressLocally({ ...payload, student_id: 'missing-student' });
    const result = await syncPendingProgress({ studentId: 'missing-student' });
    assert.equal(result.failed, 1);
    assert.equal(result.errors[0].status, 404);
    assert.equal((await getProgressRecord('missing-student', payload.course_id)).retryable, false);
    assert.equal((await syncPendingProgress({ studentId: 'missing-student' })).attempted, 0);
  });
  await check('invalid payload maps to the actual client validation error', async () => {
    await assert.rejects(requestJson('/progress', { method: 'POST', body: { ...payload, completed: 'yes' } }),
      (error) => error instanceof ApiError && error.status === 422 && !error.retryable);
  });
  process.stdout.write(JSON.stringify({ report: { passed: checks.length, checks,
    transport: 'Real frontend modules, IndexedDB emulator and real FastAPI ASGI handlers; no TCP or browser.' } }) + '\n');
} catch (error) {
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  input.close();
  process.stdin.destroy();
}
