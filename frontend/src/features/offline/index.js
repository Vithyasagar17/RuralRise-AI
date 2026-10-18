// Public interface of the offline feature. Import from here, not from inner files.
// registerPWA is NOT exported here because it imports a build-time virtual
// module; import it directly in main.jsx: import { registerPWA } from './features/offline/registerPWA.js';
export { default as OfflineLessons } from './OfflineLessons.jsx';
export { default as OfflineBanner } from './OfflineBanner.jsx';
export { default as SyncStatusBadge } from './SyncStatusBadge.jsx';
export { useProgressSync } from './useProgressSync.js';
export { useOnlineStatus } from './useOnlineStatus.js';
export { useOfflineReady } from './pwaStatus.js';
export { loadLessons, getSavedLessons, saveLessons } from './lessonStore.js';
export {
  saveProgressLocally,
  listProgressRecords,
  getProgressRecord,
  subscribeToProgress,
  clearSyncedProgress,
  countByStatus,
  validateProgressPayload,
} from './progressQueue.js';
export { syncPendingProgress } from './syncManager.js';
