// Teacher / facilitator dashboard.
//
// Usage (Member 1):
//   import { FacilitatorDashboard } from './features/facilitator';
//   <FacilitatorDashboard />                      // live backend, mock fallback
//   <FacilitatorDashboard dataSource="mock" />    // fictional data only
//   <FacilitatorDashboard isAuthorized={false} /> // access denied view
//
// Props:
//   dataSource   'auto' | 'api' | 'mock'  (default 'auto')
//   isAuthorized boolean (default true). Set from your login/role check once it
//                exists. PROTOTYPE ONLY: the backend has no authentication yet.
//   fetchImpl    optional fetch replacement (tests)
import { useMemo, useRef, useState } from 'react';
import { errorMessageKey } from '../common/apiClient.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { groupSummary, matchesSearch, summarizeProgress } from './facilitatorUtils.js';
import OpportunityShareList from './OpportunityShareList.jsx';
import StudentDetails from './StudentDetails.jsx';
import StudentList from './StudentList.jsx';
import { useFacilitatorData } from './useFacilitatorData.js';
import '../common/tokens.css';
import './facilitator.css';

export default function FacilitatorDashboard({ dataSource = 'auto', isAuthorized = true, fetchImpl }) {
  const { t } = useTranslation();
  if (!isAuthorized) {
    return (
      <section className="rr-fac" aria-labelledby="rr-fac-title">
        <h1 id="rr-fac-title" className="rr-fac__title">{t('fac.title')}</h1>
        <div className="rr5-notice rr5-notice--error" role="alert">
          <p>{t('fac.noAccess')}</p>
        </div>
      </section>
    );
  }
  return <DashboardContent dataSource={dataSource} fetchImpl={fetchImpl} />;
}

function SourceNotice({ data }) {
  const { t } = useTranslation();
  if (data.status === 'loading' && !data.source) return null;
  if (data.source === 'api' && !data.error) {
    return (
      <div className="rr5-notice rr5-notice--ok">
        <p>{t('fac.sourceLive')}</p>
      </div>
    );
  }
  if (data.source === 'mock' && data.error) {
    return (
      <div className="rr5-notice rr5-notice--warn" role="status">
        <p>
          <strong>{t('fac.sourceFallback')}</strong> {t(errorMessageKey(data.error))}
        </p>
        <p>{t('fac.sourceFallbackHint')}</p>
      </div>
    );
  }
  if (data.source === 'mock') {
    return (
      <div className="rr5-notice rr5-notice--info">
        <p>{t('fac.sourceMock')}</p>
      </div>
    );
  }
  return null;
}

function DashboardContent({ dataSource, fetchImpl }) {
  const { t } = useTranslation();
  const data = useFacilitatorData({ dataSource, fetchImpl });
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const returnFocusTo = useRef(null);

  const summaries = useMemo(
    () => new Map(data.students.map((s) => [s.student_id, summarizeProgress(s, data.courses)])),
    [data.students, data.courses],
  );
  const group = useMemo(() => groupSummary(data.students, data.courses), [data.students, data.courses]);
  const visible = data.students.filter(
    (s) => matchesSearch(s, query) && (statusFilter === 'all' || summaries.get(s.student_id).status === statusFilter),
  );
  const selected = data.students.find((s) => s.student_id === selectedId) ?? null;

  const openStudent = (id) => {
    returnFocusTo.current = id;
    setSelectedId(id);
    window.scrollTo?.(0, 0);
  };
  const closeStudent = () => {
    setSelectedId(null);
    // Return keyboard focus to the card button the user came from.
    requestAnimationFrame(() => {
      const id = returnFocusTo.current;
      const heading = id ? document.getElementById(`rr-fac-card-${id}`) : null;
      heading?.closest('article')?.querySelector('button')?.focus();
    });
  };

  const firstLoad = data.status === 'loading' && !data.source;

  return (
    <section className="rr-fac" aria-labelledby="rr-fac-title" aria-busy={data.status === 'loading'}>
      <header className="rr-fac__header">
        <div>
          <h1 id="rr-fac-title" className="rr-fac__title">{t('fac.title')}</h1>
          <p className="rr-fac__subtitle">{t('fac.subtitle')}</p>
        </div>
        <button type="button" className="rr5-btn rr5-btn--secondary" onClick={data.reload} disabled={data.status === 'loading'}>
          {data.status === 'loading' ? t('common.loading') : t('fac.refresh')}
        </button>
      </header>

      <SourceNotice data={data} />
      <p className="rr-fac-privacy">🔒 {t('fac.privacy')}</p>

      {firstLoad && <p role="status">{t('fac.loading')}</p>}

      {data.status === 'ready' && data.source === 'api' && data.error && (
        <div className="rr5-notice rr5-notice--error" role="alert">
          <p>{t('fac.loadError')}</p>
          <p>{t(errorMessageKey(data.error))}</p>
          <button type="button" className="rr5-btn" onClick={data.reload}>
            {t('common.tryAgain')}
          </button>
        </div>
      )}
      {data.skipped > 0 && (
        <div className="rr5-notice rr5-notice--warn">
          <p>{t('fac.skipped', { count: data.skipped })}</p>
        </div>
      )}
      {!firstLoad && data.coursesSource === 'none' && data.coursesError && (
        <div className="rr5-notice rr5-notice--warn">
          <p>{t('fac.coursesUnavailable')}</p>
        </div>
      )}

      {selected ? (
        <StudentDetails
          key={selected.student_id}
          student={selected}
          summary={summaries.get(selected.student_id)}
          courses={data.courses}
          coursesSource={data.coursesSource}
          opportunities={data.opportunities}
          opportunitiesError={data.opportunitiesError}
          dataSource={data.source}
          fetchImpl={fetchImpl}
          onBack={closeStudent}
        />
      ) : (
        !firstLoad &&
        data.students.length > 0 && (
          <>
            <section aria-labelledby="rr-fac-overview">
              <h2 id="rr-fac-overview" className="rr-fac__h2">{t('fac.overview')}</h2>
              <ul className="rr-fac-stats">
                <li className="rr-fac-stat">
                  <span className="rr-fac-stat__value">{group.total}</span>
                  <span className="rr-fac-stat__label">{t('fac.statStudents')}</span>
                </li>
                <li className="rr-fac-stat">
                  <span className="rr-fac-stat__value">{group.averagePercent == null ? '—' : `${group.averagePercent}%`}</span>
                  <span className="rr-fac-stat__label">{t('fac.statAverage')}</span>
                </li>
                <li className="rr-fac-stat">
                  <span className="rr-fac-stat__value">{group.notStarted}</span>
                  <span className="rr-fac-stat__label">{t('fac.statNotStarted')}</span>
                </li>
                <li className="rr-fac-stat">
                  <span className="rr-fac-stat__value">{group.completedAll}</span>
                  <span className="rr-fac-stat__label">{t('fac.statCompleted')}</span>
                </li>
              </ul>
            </section>

            <section aria-labelledby="rr-fac-students">
              <h2 id="rr-fac-students" className="rr-fac__h2">{t('fac.students')}</h2>
              <div className="rr-fac-filters" role="search">
                <div className="rr-fac-field">
                  <label htmlFor="rr-fac-search">{t('fac.searchLabel')}</label>
                  <input
                    id="rr-fac-search"
                    type="search"
                    className="rr5-focusable"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('fac.searchPlaceholder')}
                    autoComplete="off"
                  />
                </div>
                <div className="rr-fac-field">
                  <label htmlFor="rr-fac-filter">{t('fac.filterLabel')}</label>
                  <select
                    id="rr-fac-filter"
                    className="rr5-focusable"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">{t('fac.filterAll')}</option>
                    <option value="not-started">{t('status.notStarted')}</option>
                    <option value="in-progress">{t('status.inProgress')}</option>
                    <option value="completed">{t('status.completed')}</option>
                  </select>
                </div>
              </div>
              <p className="rr-fac-count" aria-live="polite">
                {t('fac.showingCount', { shown: visible.length, total: data.students.length })}
              </p>
              <StudentList students={visible} summaries={summaries} onSelect={openStudent} />
            </section>

            <section aria-labelledby="rr-fac-all-opps" className="rr-fac-section">
              <h2 id="rr-fac-all-opps" className="rr-fac__h2">{t('fac.opportunities')}</h2>
              <OpportunityShareList opportunities={data.opportunities} error={data.opportunitiesError} />
            </section>
          </>
        )
      )}
      {!firstLoad && !selected && data.status === 'ready' && data.students.length === 0 && !data.error && (
        <p className="rr-fac-empty">{t('fac.noStudents')}</p>
      )}
    </section>
  );
}
