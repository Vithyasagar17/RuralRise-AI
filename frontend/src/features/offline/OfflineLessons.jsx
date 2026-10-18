// Student-side offline lesson reader.
//
// Demonstrates the full offline journey: lessons are downloaded and saved on
// the device, can be read without internet, completion is saved locally and
// synchronised with POST /progress when the connection returns.
//
// Member 1 can use this component directly on a "My lessons" screen, or reuse
// only the hooks (useProgressSync + loadLessons) inside their own lesson UI.
//
// Props:
//   studentId   (string, required to save progress) – the backend student_id
//   studentName (string, optional) – shown as "Learning as …"
//   fetchImpl   (function, optional) – custom fetch, used by tests
import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessageKey } from '../common/apiClient.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { loadLessons } from './lessonStore.js';
import { countByStatus } from './progressQueue.js';
import SyncStatusBadge from './SyncStatusBadge.jsx';
import { useProgressSync } from './useProgressSync.js';
import '../common/tokens.css';
import './offline.css';

export default function OfflineLessons({ studentId, studentName, fetchImpl }) {
  const { t, formatDate } = useTranslation();
  const [lessonState, setLessonState] = useState({ status: 'loading', lessons: [], source: null, savedAt: null, error: null });
  const [openId, setOpenId] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const { online, records, recordFor, saveProgress, syncNow, syncing, lastResult, storageError } = useProgressSync({
    studentId,
    fetchImpl,
  });
  const readerHeading = useRef(null);
  const listHeading = useRef(null);
  const returnFocusTo = useRef(null);

  const fetchLessons = useCallback(async () => {
    setLessonState((s) => ({ ...s, status: 'loading' }));
    try {
      const result = await loadLessons({ fetchImpl });
      setLessonState({ status: 'ready', ...result });
    } catch (error) {
      setLessonState({ status: 'error', lessons: [], source: null, savedAt: null, error });
    }
  }, [fetchImpl]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  // Reload lessons when the connection comes back while showing the device copy.
  useEffect(() => {
    if (online && lessonState.source === 'device') fetchLessons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const openLesson = (id, trigger) => {
    returnFocusTo.current = trigger ?? null;
    setSaveMessage(null);
    setOpenId(id);
  };

  useEffect(() => {
    if (openId) readerHeading.current?.focus();
    else if (returnFocusTo.current) returnFocusTo.current.focus();
  }, [openId]);

  const lesson = lessonState.lessons.find((l) => l.id === openId) ?? null;
  const counts = countByStatus(records);
  const waiting = counts.pending + counts.failed + counts.syncing;

  const handleMark = async (completed) => {
    if (!studentId || !lesson) return;
    try {
      await saveProgress({ course_id: lesson.id, completed });
      setSaveMessage({ type: 'ok', text: t(online ? 'lessons.savedOnline' : 'lessons.savedOffline') });
    } catch (error) {
      setSaveMessage({ type: 'error', text: `${t('lessons.saveFailed')} ${error.message ?? ''}`.trim() });
    }
  };

  let syncMessage = null;
  if (lastResult && !lastResult.busy && lastResult.attempted > 0) {
    if (lastResult.failed === 0) syncMessage = { type: 'ok', text: t('sync.resultOk', { count: lastResult.synced }) };
    else if (lastResult.stoppedOffline) syncMessage = { type: 'warn', text: t('sync.resultOffline') };
    else syncMessage = { type: 'error', text: t('sync.resultFailed', { count: lastResult.failed }) };
  }

  return (
    <section className="rr-off" aria-labelledby="rr-off-title">
      <h1 id="rr-off-title" className="rr-off__title" tabIndex={-1} ref={listHeading}>
        {t('lessons.title')}
      </h1>
      {studentId ? (
        <p className="rr-off__who">{t('lessons.learningAs', { name: studentName || studentId })}</p>
      ) : (
        <div className="rr5-notice rr5-notice--warn" role="alert">
          <p>{t('lessons.noStudent')}</p>
        </div>
      )}

      {/* Where the lessons came from */}
      {lessonState.status === 'loading' && <p role="status">{t('lessons.loading')}</p>}
      {lessonState.status === 'ready' && lessonState.source === 'network' && (
        <div className="rr5-notice rr5-notice--ok">
          <p>
            {lessonState.savedAt
              ? t('lessons.savedForOffline', { date: formatDate(lessonState.savedAt) })
              : t('lessons.notSavedForOffline')}
          </p>
        </div>
      )}
      {lessonState.status === 'ready' && lessonState.source === 'device' && (
        <div className="rr5-notice rr5-notice--warn">
          <p>{t('lessons.fromDevice', { date: formatDate(lessonState.savedAt) ?? '—' })}</p>
        </div>
      )}
      {lessonState.status === 'error' && (
        <div className="rr5-notice rr5-notice--error" role="alert">
          <p>{t(errorMessageKey(lessonState.error))}</p>
          <p>{t('lessons.noneSaved')}</p>
          <button type="button" className="rr5-btn" onClick={fetchLessons}>
            {t('common.tryAgain')}
          </button>
        </div>
      )}
      {storageError && (
        <div className="rr5-notice rr5-notice--error" role="alert">
          <p>{t('lessons.storageError')}</p>
        </div>
      )}

      {/* Synchronisation panel */}
      {studentId && (
        <section className="rr-off-sync" aria-labelledby="rr-off-sync-title">
          <h2 id="rr-off-sync-title" className="rr-off-sync__title">
            {t('sync.title')}
          </h2>
          <p>
            {waiting > 0 ? t('sync.waitingCount', { count: waiting }) : t('sync.nothingWaiting')}
            {counts.synced > 0 && <> {t('sync.syncedCount', { count: counts.synced })}</>}
          </p>
          <div className="rr-off-sync__actions">
            <button
              type="button"
              className="rr5-btn"
              onClick={() => syncNow({ includePermanentFailures: true })}
              disabled={!online || syncing || waiting === 0}
            >
              {syncing ? t('sync.syncing') : t('sync.now')}
            </button>
            {!online && <span className="rr-off-sync__hint">{t('sync.needsInternet')}</span>}
          </div>
          <div aria-live="polite" role="status">
            {syncMessage && (
              <p className={`rr-off-sync__result rr-off-sync__result--${syncMessage.type}`}>{syncMessage.text}</p>
            )}
          </div>
        </section>
      )}

      {/* Lesson list or reader */}
      {lesson ? (
        <article className="rr-off-reader" aria-labelledby="rr-off-reader-title">
          <button type="button" className="rr5-btn rr5-btn--secondary" onClick={() => setOpenId(null)}>
            ← {t('lessons.back')}
          </button>
          <h2 id="rr-off-reader-title" ref={readerHeading} tabIndex={-1}>
            {lesson.title}
          </h2>
          <p className="rr-off-reader__meta">
            {[lesson.skill, lesson.difficulty].filter(Boolean).join(' · ')}
          </p>
          <div className="rr-off-reader__body">
            {lesson.lesson.split(/\n+/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
          {lesson.practical_task && (
            <>
              <h3>{t('lessons.practicalTask')}</h3>
              <p>{lesson.practical_task}</p>
            </>
          )}
          <p className="rr-off-reader__lang-note">{t('lessons.contentLanguageNote')}</p>

          {studentId && (
            <div className="rr-off-reader__complete">
              <h3>{t('lessons.yourProgress')}</h3>
              {recordFor(lesson.id)?.payload.completed ? (
                <>
                  <p>✓ {t('lessons.markedComplete')}</p>
                  <button type="button" className="rr5-btn rr5-btn--secondary" onClick={() => handleMark(false)}>
                    {t('lessons.markIncomplete')}
                  </button>
                </>
              ) : (
                <button type="button" className="rr5-btn" onClick={() => handleMark(true)}>
                  {t('lessons.markComplete')}
                </button>
              )}
              <div aria-live="polite" role="status">
                {saveMessage && <p className={`rr-off-reader__msg rr-off-reader__msg--${saveMessage.type}`}>{saveMessage.text}</p>}
                <SyncStatusBadge record={recordFor(lesson.id)} />
              </div>
            </div>
          )}
        </article>
      ) : (
        lessonState.lessons.length > 0 && (
          <>
            <h2 className="rr-off__list-title">{t('lessons.listTitle', { count: lessonState.lessons.length })}</h2>
            <ul className="rr-off-list">
              {lessonState.lessons.map((l) => {
                const record = recordFor(l.id);
                return (
                  <li key={l.id} className="rr-off-list__item">
                    <div className="rr-off-list__text">
                      <h3 className="rr-off-list__name">{l.title}</h3>
                      <p className="rr-off-list__meta">{[l.skill, l.difficulty].filter(Boolean).join(' · ')}</p>
                      {record?.payload.completed && <p className="rr-off-list__done">✓ {t('lessons.markedComplete')}</p>}
                      <SyncStatusBadge record={record} compact />
                    </div>
                    <button
                      type="button"
                      className="rr5-btn"
                      onClick={(event) => openLesson(l.id, event.currentTarget)}
                      aria-label={t('lessons.openNamed', { title: l.title })}
                    >
                      {t('lessons.open')}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )
      )}
    </section>
  );
}
