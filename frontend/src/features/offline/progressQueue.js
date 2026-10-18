// Local, durable store for lesson progress that still has to reach the backend.
//
// One record per (student_id, course_id) — the same key the backend uses for
// its upsert — so marking a lesson twice can never create two submissions.
//
// Record shape (stored in IndexedDB "pendingProgress"):
// {
//   key: "demo-student-001::demo-safety",
//   studentId: "demo-student-001",
//   payload: { student_id, course_id, completed, score },  // exact POST /progress body
//   status: "pending" | "syncing" | "synced" | "failed",
//   revision: 3,              // increases on every local change
//   attempts: 0,              // sync attempts for this revision
//   retryable: true,          // false after 404/422: retry only when the user asks
//   lastError: null | { kind, status, message },
//   savedAt, lastAttemptAt, syncedAt, serverUpdatedAt   // ISO strings or null
// }
import { promisifyRequest, runTransaction, STORE_PROGRESS } from './offlineDb.js';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const changes = new EventTarget();

export const progressKey = (studentId, courseId) => `${studentId}::${courseId}`;

/** Same rules as the backend's ProgressUpdate model, so invalid data is caught before it is queued. */
export function validateProgressPayload(input) {
  if (!input || typeof input !== 'object') throw new TypeError('Progress must be an object.');
  const { student_id, course_id, completed } = input;
  const score = input.score ?? null;
  if (typeof student_id !== 'string' || !ID_PATTERN.test(student_id)) throw new TypeError('student_id is missing or invalid.');
  if (typeof course_id !== 'string' || !ID_PATTERN.test(course_id)) throw new TypeError('course_id is missing or invalid.');
  if (typeof completed !== 'boolean') throw new TypeError('completed must be true or false.');
  if (score !== null && !(Number.isInteger(score) && score >= 0 && score <= 100)) {
    throw new TypeError('score must be a whole number from 0 to 100, or empty.');
  }
  return { student_id, course_id, completed, score };
}

function notify() {
  changes.dispatchEvent(new Event('change'));
}

/** Calls `listener` whenever any progress record changes. Returns an unsubscribe function. */
export function subscribeToProgress(listener) {
  changes.addEventListener('change', listener);
  return () => changes.removeEventListener('change', listener);
}

const samePayload = (a, b) =>
  a.student_id === b.student_id && a.course_id === b.course_id && a.completed === b.completed && a.score === b.score;

/**
 * Saves progress on this device. Always succeeds offline.
 * If an identical update is already pending, syncing or synced, nothing changes
 * (prevents duplicate submissions from double taps).
 */
export async function saveProgressLocally(input) {
  const payload = validateProgressPayload(input);
  const key = progressKey(payload.student_id, payload.course_id);
  const record = await runTransaction(STORE_PROGRESS, 'readwrite', async (stores) => {
    const store = stores[STORE_PROGRESS];
    const existing = await promisifyRequest(store.get(key));
    if (existing && existing.status !== 'failed' && samePayload(existing.payload, payload)) {
      return existing;
    }
    const next = {
      key,
      studentId: payload.student_id,
      payload,
      status: 'pending',
      revision: (existing?.revision ?? 0) + 1,
      attempts: 0,
      retryable: true,
      lastError: null,
      savedAt: new Date().toISOString(),
      lastAttemptAt: null,
      syncedAt: null,
      serverUpdatedAt: existing?.serverUpdatedAt ?? null,
    };
    store.put(next);
    return next;
  });
  notify();
  return record;
}

/** All records, optionally only one student's. Sorted oldest change first. */
export async function listProgressRecords({ studentId } = {}) {
  const rows = await runTransaction(STORE_PROGRESS, 'readonly', (stores) => {
    const store = stores[STORE_PROGRESS];
    return promisifyRequest(studentId ? store.index('studentId').getAll(studentId) : store.getAll());
  });
  return rows.sort((a, b) => (a.savedAt < b.savedAt ? -1 : a.savedAt > b.savedAt ? 1 : 0));
}

export async function getProgressRecord(studentId, courseId) {
  return runTransaction(STORE_PROGRESS, 'readonly', (stores) =>
    promisifyRequest(stores[STORE_PROGRESS].get(progressKey(studentId, courseId))),
  ).then((r) => r ?? null);
}

/**
 * Applies `changes` only if the record is still at `revision`. Returns true if
 * applied. This is how the sync manager avoids marking a NEWER local change as
 * synced when the user edits progress during an upload.
 */
export async function patchProgressRecord(key, revision, patch) {
  const applied = await runTransaction(STORE_PROGRESS, 'readwrite', async (stores) => {
    const store = stores[STORE_PROGRESS];
    const current = await promisifyRequest(store.get(key));
    if (!current || current.revision !== revision) return false;
    store.put({ ...current, ...patch });
    return true;
  });
  if (applied) notify();
  return applied;
}

/** Removes records that have already synced (optional housekeeping). */
export async function clearSyncedProgress() {
  await runTransaction(STORE_PROGRESS, 'readwrite', async (stores) => {
    const store = stores[STORE_PROGRESS];
    const rows = await promisifyRequest(store.getAll());
    rows.filter((r) => r.status === 'synced').forEach((r) => store.delete(r.key));
  });
  notify();
}

/** Counts by status, e.g. { pending: 2, syncing: 0, synced: 5, failed: 1 }. */
export function countByStatus(records) {
  const counts = { pending: 0, syncing: 0, synced: 0, failed: 0 };
  for (const r of records) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return counts;
}
