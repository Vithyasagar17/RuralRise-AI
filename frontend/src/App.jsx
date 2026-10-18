// ============================================================================
// TEMPORARY INTEGRATION HARNESS — created by Member 5 because Member 1's
// App.jsx did not exist yet in this folder.
//
// Member 1 OWNS this file. When Member 1's App.jsx is merged, KEEP MEMBER 1'S
// VERSION and add only: <OfflineBanner/>, a route/tab for <FacilitatorDashboard/>,
// and <OfflineLessons studentId=…/> (see frontend/src/features/*/README.md).
// ============================================================================
import { useEffect, useState } from 'react';
import { FacilitatorDashboard } from './features/facilitator';
import { LanguageSelect, useTranslation } from './features/i18n';
import { OfflineBanner, OfflineLessons } from './features/offline';

// Only these two fictional IDs are accepted by the backend's POST /progress
// without first creating a profile (see backend/app/database.py).
const DEMO_STUDENTS = [
  { id: 'demo-student-001', name: 'Demo Student' },
  { id: 'demo-student-002', name: 'Fictional Learner' },
];

const VIEWS = ['facilitator', 'lessons'];

function readInitialView() {
  const fromHash = window.location.hash.replace('#', '');
  return VIEWS.includes(fromHash) ? fromHash : 'facilitator';
}

export default function App() {
  const { t } = useTranslation();
  const [view, setView] = useState(readInitialView);
  const [studentId, setStudentId] = useState(DEMO_STUDENTS[0].id);
  const student = DEMO_STUDENTS.find((s) => s.id === studentId);

  // Keep the tab in sync with the URL (#facilitator / #lessons), including the Back button.
  useEffect(() => {
    const onHash = () => setView(readInitialView());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (next) => {
    setView(next);
    if (window.location.hash !== `#${next}`) window.location.hash = next;
  };

  return (
    <>
      <a className="app-skip" href="#main">
        {t('app.skip')}
      </a>
      <header className="app-header">
        <div className="app-header__row">
          <p className="app-header__name">{t('app.name')}</p>
          <LanguageSelect />
        </div>
        <nav aria-label={t('app.navLabel')}>
          <ul className="app-nav">
            {VIEWS.map((v) => (
              <li key={v}>
                <button
                  type="button"
                  className="app-nav__btn"
                  aria-current={view === v ? 'page' : undefined}
                  onClick={() => go(v)}
                >
                  {t(v === 'facilitator' ? 'app.navFacilitator' : 'app.navLessons')}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <OfflineBanner />
      <main id="main" className="app-main" tabIndex={-1}>
        {view === 'facilitator' ? (
          <FacilitatorDashboard />
        ) : (
          <>
            <div className="app-student-picker">
              <label htmlFor="app-student">{t('app.demoStudent')}</label>
              <select id="app-student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                {DEMO_STUDENTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
            </div>
            <OfflineLessons key={studentId} studentId={student.id} studentName={student.name} />
          </>
        )}
      </main>
    </>
  );
}
