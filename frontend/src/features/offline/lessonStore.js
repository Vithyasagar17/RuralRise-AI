// Offline copy of lesson content (GET /courses).
//
// Why IndexedDB and not only the service worker cache? The service worker
// only runs in a production build and can be cleared independently. Saving
// lessons here gives one explicit, testable copy that also works during
// `npm run dev`. The service worker's runtime cache is a second safety net.
import { requestJson } from '../common/apiClient.js';
import { normalizeCourses } from '../common/normalizeCourses.js';
import { promisifyRequest, runTransaction, STORE_LESSONS, STORE_META } from './offlineDb.js';

const SAVED_AT_KEY = 'lessonsSavedAt';

/** Replaces the saved lesson catalogue with `lessons` and records the time. */
export async function saveLessons(lessons) {
  const savedAt = new Date().toISOString();
  await runTransaction([STORE_LESSONS, STORE_META], 'readwrite', async (stores) => {
    await promisifyRequest(stores[STORE_LESSONS].clear());
    lessons.forEach((lesson, order) => stores[STORE_LESSONS].put({ ...lesson, order }));
    stores[STORE_META].put({ key: SAVED_AT_KEY, value: savedAt });
  });
  return savedAt;
}

/** Returns { lessons, savedAt } from the device (empty list when nothing is saved). */
export async function getSavedLessons() {
  return runTransaction([STORE_LESSONS, STORE_META], 'readonly', async (stores) => {
    const rows = await promisifyRequest(stores[STORE_LESSONS].getAll());
    const meta = await promisifyRequest(stores[STORE_META].get(SAVED_AT_KEY));
    const lessons = rows.sort((a, b) => a.order - b.order).map(({ order, ...lesson }) => lesson);
    return { lessons, savedAt: meta?.value ?? null };
  });
}

/**
 * Loads lessons from the server and saves them for offline use. If the server
 * cannot be reached, returns the saved copy instead.
 *
 * Resolves to { lessons, source: 'network' | 'device', savedAt, error }.
 * Rejects only when there is neither a server response nor a saved copy.
 */
export async function loadLessons({ fetchImpl } = {}) {
  try {
    const lessons = normalizeCourses(await requestJson('/courses', { fetchImpl }));
    let savedAt = null;
    try {
      savedAt = await saveLessons(lessons);
    } catch {
      // Storage full/blocked: the lessons still display, but are not saved offline.
    }
    return { lessons, source: 'network', savedAt, error: null };
  } catch (error) {
    let saved = { lessons: [], savedAt: null };
    try {
      saved = await getSavedLessons();
    } catch {
      // No IndexedDB available.
    }
    if (saved.lessons.length) return { ...saved, source: 'device', error };
    throw error;
  }
}
