// Sends locally saved progress to POST /progress (Member 3's backend).
//
// Guarantees:
// - Only one sync runs at a time in a tab (single-flight promise) and, where the
//   browser supports the Web Locks API, across tabs too.
// - A record is marked "synced" only after the server answers {"saved": true}.
// - If the user changes the same lesson's progress during an upload, the newer
//   change stays "pending" and is sent next time (revision check).
// - Network/timeout/5xx failures stay retryable. 404/422 (unknown student or
//   course, invalid data) are NOT retried automatically, because repeating them
//   cannot succeed; the user can still press "Try again".
// - Records left in "syncing" by a closed tab are sent again. The backend
//   upserts by (student_id, course_id), so a repeat never creates a duplicate row.
import { ApiError, getRequestIdentity, requestJson } from '../common/apiClient.js';
import { listProgressRecords, patchProgressRecord } from './progressQueue.js';

const LOCK_NAME = 'ruralrise-progress-sync';
let inFlight = null;
let inFlightScope = null;
let rerunRequested = false;

function isDue(record, includePermanentFailures) {
  if (record.status === 'pending' || record.status === 'syncing') return true;
  if (record.status === 'failed') return record.retryable || includePermanentFailures;
  return false;
}

async function runSync({ fetchImpl, includePermanentFailures = false, studentId } = {}) {
  const owner = getRequestIdentity();
  const result = { attempted: 0, synced: 0, failed: 0, superseded: 0, stoppedOffline: false, busy: false, errors: [] };
  const records = (await listProgressRecords({ studentId })).filter((r) => isDue(r, includePermanentFailures));

  if (!owner || (owner !== 'demo' && !studentId)) return result;

  for (const record of records) {
    if (getRequestIdentity() !== owner) break;
    result.attempted += 1;
    const attempts = (record.attempts ?? 0) + 1;
    await patchProgressRecord(record.key, record.revision, { status: 'syncing', lastAttemptAt: new Date().toISOString() });
    try {
      const response = await requestJson('/progress', { method: 'POST', body: record.payload, fetchImpl, expectedIdentity: owner });
      if (!response || response.saved !== true) {
        throw new ApiError('The server did not confirm that progress was saved.', { kind: 'invalid-data' });
      }
      const applied = await patchProgressRecord(record.key, record.revision, {
        status: 'synced',
        attempts,
        retryable: false,
        lastError: null,
        syncedAt: new Date().toISOString(),
        serverUpdatedAt: response.progress?.updated_at ?? null,
      });
      if (applied) result.synced += 1;
      else result.superseded += 1;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(String(error?.message || error), { kind: 'network' });
      await patchProgressRecord(record.key, record.revision, {
        status: 'failed',
        attempts,
        retryable: apiError.retryable || apiError.status === 401 || apiError.status === 403,
        lastError: { kind: apiError.kind, status: apiError.status, message: apiError.message },
      });
      result.failed += 1;
      result.errors.push({ key: record.key, kind: apiError.kind, status: apiError.status, message: apiError.message });
      if (apiError.status === 401 || apiError.status === 403) break;
      // No connection: stop now instead of failing every remaining record.
      if (apiError.kind === 'network' || apiError.kind === 'timeout') {
        result.stoppedOffline = true;
        break;
      }
    }
  }
  return result;
}

async function withCrossTabLock(work) {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (locks?.request) {
    return locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) =>
      lock ? work() : { attempted: 0, synced: 0, failed: 0, superseded: 0, stoppedOffline: false, busy: true, errors: [] },
    );
  }
  return work();
}

/**
 * Sends every due record. Safe to call repeatedly; concurrent calls share one run.
 * @param {{fetchImpl?: typeof fetch, includePermanentFailures?: boolean, studentId?: string}} options
 * @returns {Promise<{attempted:number, synced:number, failed:number, superseded:number, stoppedOffline:boolean, busy:boolean, errors:Array}>}
 */
export function syncPendingProgress(options = {}) {
  const scope = `${getRequestIdentity()}:${options.studentId ?? '*'}`;
  if (inFlight) {
    if (scope === inFlightScope) { rerunRequested = true; return inFlight; }
    return inFlight.then(() => syncPendingProgress(options));
  }
  inFlightScope = scope;
  const identity = getRequestIdentity();
  inFlight = (async () => {
    try {
      let result = null;
      do {
        rerunRequested = false;
        const next = await withCrossTabLock(() => runSync(options));
        if (!result) result = next;
        else {
          for (const key of ['attempted', 'synced', 'failed', 'superseded']) result[key] += next[key];
          result.errors.push(...next.errors);
          result.busy = next.busy; result.stoppedOffline ||= next.stoppedOffline;
        }
        if (next.failed || next.busy || next.stoppedOffline || getRequestIdentity() !== identity) break;
      } while (rerunRequested);
      return result;
    } finally {
      inFlight = null;
      inFlightScope = null;
    }
  })();
  return inFlight;
}
