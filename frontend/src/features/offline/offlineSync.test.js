// Offline storage + synchronisation logic (IndexedDB is simulated with fake-indexeddb).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBackend, freshIndexedDb, jsonResponse } from '../../test/helpers.js';
import { getSavedLessons, loadLessons, saveLessons } from './lessonStore.js';
import {
  clearSyncedProgress,
  countByStatus,
  getProgressRecord,
  listProgressRecords,
  saveProgressLocally,
  validateProgressPayload,
} from './progressQueue.js';
import { syncPendingProgress } from './syncManager.js';

beforeEach(freshIndexedDb);

const done = { student_id: 'demo-student-001', course_id: 'demo-safety', completed: true };

describe('lesson cache', () => {
  it('saves lessons from the server and reads them back offline', async () => {
    const online = await loadLessons({ fetchImpl: fakeBackend() });
    expect(online.source).toBe('network');
    expect(online.savedAt).toBeTruthy();

    const offline = await loadLessons({ fetchImpl: fakeBackend({ 'GET /courses': 'offline' }) });
    expect(offline.source).toBe('device');
    expect(offline.lessons.map((l) => l.id)).toEqual(['demo-safety', 'demo-planning']);
    expect(offline.error.kind).toBe('network');
  });

  it('fails clearly when offline and nothing was ever saved', async () => {
    const error = await loadLessons({ fetchImpl: fakeBackend({ 'GET /courses': 'offline' }) }).catch((e) => e);
    expect(error.kind).toBe('network');
  });

  it('replaces the old catalogue and keeps order', async () => {
    await saveLessons([{ id: 'b', title: 'B' }, { id: 'a', title: 'A' }]);
    await saveLessons([{ id: 'c', title: 'C' }]);
    expect((await getSavedLessons()).lessons).toEqual([{ id: 'c', title: 'C' }]);
  });
});

describe('progress queue', () => {
  it('validates with the same rules as the backend', () => {
    expect(validateProgressPayload(done)).toEqual({ ...done, score: null });
    expect(() => validateProgressPayload({ ...done, completed: 'true' })).toThrow();
    expect(() => validateProgressPayload({ ...done, score: 101 })).toThrow();
    expect(() => validateProgressPayload({ ...done, score: 5.5 })).toThrow();
    expect(() => validateProgressPayload({ ...done, student_id: 'has space' })).toThrow();
    expect(() => validateProgressPayload({ ...done, course_id: '' })).toThrow();
  });

  it('saves locally as pending and keeps one record per student+course', async () => {
    const first = await saveProgressLocally(done);
    expect(first.status).toBe('pending');
    expect(first.revision).toBe(1);
    const again = await saveProgressLocally(done); // double tap
    expect(again.revision).toBe(1);
    await saveProgressLocally({ ...done, completed: false });
    const all = await listProgressRecords();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ revision: 2, payload: { completed: false } });
  });
});

describe('synchronisation', () => {
  it('sends pending progress and marks it synced', async () => {
    await saveProgressLocally(done);
    const fetchImpl = fakeBackend();
    const result = await syncPendingProgress({ fetchImpl });
    expect(result).toMatchObject({ attempted: 1, synced: 1, failed: 0 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toMatch(/\/progress$/);
    expect(JSON.parse(init.body)).toEqual({ ...done, score: null });
    const record = await getProgressRecord('demo-student-001', 'demo-safety');
    expect(record).toMatchObject({ status: 'synced', serverUpdatedAt: '2026-10-18T10:00:00+00:00', lastError: null });
  });

  it('does not send synced records again (no duplicate submissions)', async () => {
    await saveProgressLocally(done);
    const fetchImpl = fakeBackend();
    await syncPendingProgress({ fetchImpl });
    await saveProgressLocally(done); // same value again
    await syncPendingProgress({ fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('keeps progress and stops early when offline, then syncs after reconnecting', async () => {
    await saveProgressLocally(done);
    await saveProgressLocally({ ...done, course_id: 'demo-planning' });
    const offline = fakeBackend({ 'POST /progress': 'offline' });
    const r1 = await syncPendingProgress({ fetchImpl: offline });
    expect(r1).toMatchObject({ attempted: 1, failed: 1, stoppedOffline: true });
    expect(countByStatus(await listProgressRecords())).toMatchObject({ failed: 1, pending: 1 });
    const failed = (await listProgressRecords()).find((r) => r.status === 'failed');
    expect(failed.retryable).toBe(true);

    const r2 = await syncPendingProgress({ fetchImpl: fakeBackend() });
    expect(r2).toMatchObject({ attempted: 2, synced: 2, failed: 0 });
    expect(countByStatus(await listProgressRecords())).toMatchObject({ synced: 2, failed: 0, pending: 0 });
  });

  it('retries 503 automatically but not 404/422 unless the user asks', async () => {
    await saveProgressLocally(done);
    await syncPendingProgress({ fetchImpl: fakeBackend({ 'POST /progress': () => jsonResponse({ detail: 'Unknown student_id.' }, 404) }) });
    let record = await getProgressRecord('demo-student-001', 'demo-safety');
    expect(record).toMatchObject({ status: 'failed', retryable: false, lastError: { status: 404, message: 'Unknown student_id.' } });

    const fetchImpl = fakeBackend();
    const auto = await syncPendingProgress({ fetchImpl });
    expect(auto.attempted).toBe(0);
    const manual = await syncPendingProgress({ fetchImpl, includePermanentFailures: true });
    expect(manual.synced).toBe(1);

    await saveProgressLocally({ ...done, completed: false });
    await syncPendingProgress({ fetchImpl: fakeBackend({ 'POST /progress': () => jsonResponse({ detail: 'x' }, 503) }) });
    record = await getProgressRecord('demo-student-001', 'demo-safety');
    expect(record).toMatchObject({ status: 'failed', retryable: true });
  });

  it('does not mark success when the server does not confirm saved:true', async () => {
    await saveProgressLocally(done);
    await syncPendingProgress({ fetchImpl: fakeBackend({ 'POST /progress': () => jsonResponse({ saved: false }) }) });
    expect((await getProgressRecord('demo-student-001', 'demo-safety')).status).toBe('failed');
  });

  it('keeps a change made during upload pending (revision check)', async () => {
    await saveProgressLocally(done);
    let release;
    const fetchImpl = vi.fn(async (url, init) => {
      await new Promise((r) => { release = r; });
      return jsonResponse({ saved: true, progress: { ...JSON.parse(init.body), updated_at: 'x' } });
    });
    const running = syncPendingProgress({ fetchImpl });
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    await saveProgressLocally({ ...done, completed: false }); // user changes their mind mid-upload
    release();
    const result = await running;
    expect(result.superseded).toBe(1);
    const record = await getProgressRecord('demo-student-001', 'demo-safety');
    expect(record).toMatchObject({ status: 'pending', revision: 2, payload: { completed: false } });
  });

  it('shares one run between simultaneous sync calls', async () => {
    await saveProgressLocally(done);
    const fetchImpl = fakeBackend();
    const [a, b] = await Promise.all([syncPendingProgress({ fetchImpl }), syncPendingProgress({ fetchImpl })]);
    expect(a).toBe(b);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('re-sends records left in "syncing" by a closed tab', async () => {
    const saved = await saveProgressLocally(done);
    const { patchProgressRecord } = await import('./progressQueue.js');
    await patchProgressRecord(saved.key, saved.revision, { status: 'syncing' });
    const result = await syncPendingProgress({ fetchImpl: fakeBackend() });
    expect(result.synced).toBe(1);
  });

  it('can clear synced records', async () => {
    await saveProgressLocally(done);
    await syncPendingProgress({ fetchImpl: fakeBackend() });
    await clearSyncedProgress();
    expect(await listProgressRecords()).toEqual([]);
  });
});
