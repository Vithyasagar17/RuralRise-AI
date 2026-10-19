import { loadRoadmap } from '../../services/api.js';
import { promisifyRequest, runTransaction, STORE_META } from './offlineDb.js';

// Saved plans are scoped to a student and backend, like saved progress. A plan
// is reused only for the same profile; the signature is a cache key, not auth.
function signature(profile) {
  let hash = 2166136261;
  for (const char of JSON.stringify(profile)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return String(hash >>> 0);
}
export async function getLearningPlan(student, careerId) {
  const key = `roadmap:${student.student_id}:${careerId}`;
  const profileSignature = signature(student.profile);
  try {
    const plan = await loadRoadmap(student.profile, careerId);
    let saved = false;
    try {
      await runTransaction(STORE_META, 'readwrite', (stores) => {
        stores[STORE_META].put({ key, profileSignature, value: plan, savedAt: new Date().toISOString() });
      }); saved = true;
    } catch { /* online plan is usable even if browser storage is unavailable */ }
    return { plan, source: 'network', saved };
  } catch (error) {
    // Never hide denied access or invalid input behind a cached response.
    if (!error.retryable) throw error;
    const cached = await runTransaction(STORE_META, 'readonly', (stores) => promisifyRequest(stores[STORE_META].get(key))).catch(() => null);
    if (cached?.profileSignature === profileSignature) return { plan: cached.value, source: 'device', saved: true };
    throw error;
  }
}
