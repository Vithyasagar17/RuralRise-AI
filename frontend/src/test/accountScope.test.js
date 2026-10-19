import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { configureRequestAuth, requestJson } from '../features/common/apiClient.js';
import { freshIndexedDb, jsonResponse } from './helpers.js';
import { getProgressRecord, hydrateServerProgress, saveProgressLocally } from '../features/offline/progressQueue.js';
import { syncPendingProgress } from '../features/offline/syncManager.js';

beforeEach(freshIndexedDb);
afterEach(() => configureRequestAuth(null));
it('does not send a request if the identity changes while obtaining its token', async () => {
  let owner = 'account-a';
  configureRequestAuth({ identity: () => owner, token: async () => { owner = 'account-b'; return 'new-account-token'; } });
  const fetchImpl = vi.fn();
  await expect(requestJson('/progress', { method: 'POST', body: {}, fetchImpl })).rejects.toMatchObject({ status: 401 });
  expect(fetchImpl).not.toHaveBeenCalled();
});
it('uploads only the selected student and retains authentication failures', async () => {
  await saveProgressLocally({ student_id: 'student-a', course_id: 'solar-001', completed: true });
  await saveProgressLocally({ student_id: 'student-b', course_id: 'solar-001', completed: true });
  configureRequestAuth({ identity: () => 'account-a', token: async () => 'token', refresh: async () => null });
  const fetchImpl = vi.fn(async () => jsonResponse({ detail: 'Sign in' }, 401));
  const result = await syncPendingProgress({ studentId: 'student-a', fetchImpl });
  expect(result.failed).toBe(1);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect((await getProgressRecord('student-a', 'solar-001'))).toMatchObject({ status: 'failed', retryable: true });
  expect((await getProgressRecord('student-b', 'solar-001')).status).toBe('pending');
});
it('hydrates server completions without overwriting pending local changes', async () => {
  const pending = { student_id: 'student-a', course_id: 'solar-001', completed: false, score: null };
  await saveProgressLocally(pending);
  await hydrateServerProgress('student-a', [{ ...pending, completed: true, updated_at: '2026-10-19T10:00:00Z' }, { ...pending, course_id: 'solar-002', completed: true, updated_at: '2026-10-19T10:00:00Z' }]);
  expect((await getProgressRecord('student-a', 'solar-001'))).toMatchObject({ status: 'pending', payload: { completed: false } });
  expect((await getProgressRecord('student-a', 'solar-002'))).toMatchObject({ status: 'synced', payload: { completed: true } });
});
