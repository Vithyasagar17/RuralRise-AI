// React hook that connects any lesson screen to the offline progress queue.
//
//   const { records, recordFor, saveProgress, syncNow, syncing, lastResult } =
//     useProgressSync({ studentId });
//
//   await saveProgress({ course_id: 'demo-safety', completed: true });
//
// saveProgress always stores on the device first, then tries to send if online.
// Automatic sync also runs when the app opens, when the connection returns,
// and when the app comes back to the foreground.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hydrateServerProgress, listProgressRecords, saveProgressLocally, subscribeToProgress } from './progressQueue.js';
import { getAuthMode } from '../../services/authClient.js';
import { loadOwnProgress } from '../../services/api.js';
import { syncPendingProgress } from './syncManager.js';
import { useOnlineStatus } from './useOnlineStatus.js';

export function useProgressSync({ studentId, fetchImpl, autoSync = true } = {}) {
  const online = useOnlineStatus();
  const [records, setRecords] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [storageError, setStorageError] = useState(null);
  const mounted = useRef(true);
  const currentStudent = useRef(studentId);
  currentStudent.current = studentId;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!studentId) { setRecords([]); return; }
    try {
      const rows = await listProgressRecords({ studentId });
      if (mounted.current && currentStudent.current === studentId) {
        setRecords(rows);
        setStorageError(null);
      }
    } catch (error) {
      if (mounted.current) setStorageError(error);
    }
  }, [studentId]);

  useEffect(() => {
    setRecords([]); setLastResult(null); setStorageError(null);
    refresh();
    return subscribeToProgress(refresh);
  }, [refresh]);

  useEffect(() => {
    let active = true;
    if (studentId && getAuthMode() === 'supabase') {
      loadOwnProgress().then((data) => {
        if (active && currentStudent.current === studentId) return hydrateServerProgress(studentId, data.progress);
      }).catch(() => { /* cached progress and pending edits remain usable offline */ });
    }
    return () => { active = false; };
  }, [studentId, online]);

  const syncNow = useCallback(
    async (options = {}) => {
      if (!studentId) return null;
      setSyncing(true);
      try {
        const result = await syncPendingProgress({ fetchImpl, ...options, studentId });
        if (mounted.current && currentStudent.current === studentId) setLastResult(result);
        return result;
      } catch (error) {
        // Storage problem (not a network problem): report it, never claim success.
        if (mounted.current) setStorageError(error);
        return null;
      } finally {
        if (mounted.current) setSyncing(false);
      }
    },
    [fetchImpl, studentId],
  );

  // Sync on open and whenever the connection comes back.
  useEffect(() => {
    if (autoSync && online) syncNow();
  }, [autoSync, online, syncNow]);

  // Sync when the user returns to the app (common on mobile).
  useEffect(() => {
    if (!autoSync) return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine !== false) syncNow();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [autoSync, syncNow]);

  const saveProgress = useCallback(
    async ({ course_id, completed, score = null }) => {
      const record = await saveProgressLocally({ student_id: studentId, course_id, completed, score });
      if (autoSync && navigator.onLine !== false) syncNow();
      return record;
    },
    [studentId, autoSync, syncNow],
  );

  const byCourse = useMemo(() => new Map(records.map((r) => [r.payload.course_id, r])), [records]);
  const recordFor = useCallback((courseId) => byCourse.get(courseId) ?? null, [byCourse]);

  return { online, records, recordFor, saveProgress, syncNow, syncing, lastResult, storageError, refresh };
}
