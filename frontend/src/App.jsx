
import { useEffect, useState } from "react";
import { StudentProvider, useStudent } from './features/student/StudentContext.jsx';
import Account from './pages/Account.jsx';
import StatusPanel from './features/common/StatusPanel.jsx';
import { LanguageSelect } from "./features/i18n";
import { FacilitatorDashboard } from "./features/facilitator";
import { OfflineBanner, OfflineLessons } from "./features/offline";

import Dashboard from "./pages/Dashboard";
import Careers from "./pages/Careers";
import Recommendations from "./pages/Recommendations";
import Learning from "./pages/Learning";
import Opportunities from "./pages/Opportunities";
import Profile from "./pages/Profile";

import "./index.css";
import './integration.css';

const DEMO_STUDENTS = [
  { id: "demo-student-001", name: "Demo Student" },
  { id: "demo-student-002", name: "Fictional Learner" },
];

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "careers", label: "Explore careers", icon: "◎" },
  { id: "recommendations", label: "Career recommendations", icon: "✦" },
  { id: "learning", label: "Learning roadmap", icon: "▤" },
  { id: "opportunities", label: "Opportunities", icon: "↗" },
  { id: "profile", label: "My profile", icon: "○" },
  { id: "facilitator", label: "Facilitator dashboard", icon: "♧" },
  { id: "lessons", label: "Offline lessons", icon: "▣" },
];

function AppShell() {
  const session = useStudent();
  const [activePage, setActivePage] = useState(() => navigation.some((n) => n.id === location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard');
  const [studentId, setStudentId] = useState(DEMO_STUDENTS[0].id);
  const onNavigate = (page) => { location.hash = page; setActivePage(page); };
  useEffect(() => {
    const update = () => setActivePage(navigation.some((n) => n.id === location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard');
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  useEffect(() => { if (session.account?.role === 'teacher') setActivePage('facilitator'); }, [session.account?.role]);
  const teacher = session.secure && session.account?.role === 'teacher';

  const activeNavigation = navigation.find(
    (item) => item.id === activePage
  );

  const demoStudent = DEMO_STUDENTS.find(
    (item) => item.id === studentId
  );
  const student = session.student ? { id: session.student.student_id, name: session.student.profile.name } : !session.secure ? demoStudent : null;

  function renderPage() {
    switch (activePage) {
      case "dashboard":
        return <Dashboard onNavigate={onNavigate} />;

      case "careers":
        return <Careers onNavigate={onNavigate} />;

      case "recommendations":
        return <Recommendations onNavigate={onNavigate} />;

      case "learning":
        return <Learning onNavigate={onNavigate} />;

      case "opportunities":
        return <Opportunities />;

      case "profile":
        return <Profile />;

      case "facilitator":
        return <FacilitatorDashboard dataSource="api" />;

      case "lessons":
        if (!student) return <div className="rr-notice"><p>Save your profile before starting lessons.</p><button type="button" onClick={() => onNavigate('profile')}>Create my profile</button></div>;
        return (
          <>
            {!session.secure && !session.student && <div className="app-student-picker">
              <label htmlFor="app-student">Select demo student</label>
              <select
                id="app-student"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
              >
                {DEMO_STUDENTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.id})
                  </option>
                ))}
              </select>
            </div>}

            <OfflineLessons
              key={`${session.identity}:${student.id}`}
              studentId={student.id}
              studentName={student.name}
            />
          </>
        );

      default:
        return <Dashboard onNavigate={onNavigate} />;
    }
  }

  return (
    <div className="app-shell">
      <a className="app-skip" href="#main">
  Skip to main content
</a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#dashboard"
          onClick={(event) => {
            event.preventDefault();
            onNavigate(teacher ? 'facilitator' : 'dashboard');
          }}
        >
          <span className="brand-mark">R</span>
          <span>
            <strong>RuralRise</strong>
            <small>AI-powered growth</small>
          </span>
        </a>

        <div className="sidebar-label">YOUR SPACE</div>

        <nav className="navigation" aria-label="Main navigation">
          {navigation.filter((item) => teacher ? item.id === 'facilitator' : !session.secure || item.id !== 'facilitator').map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${
                activePage === item.id ? "active" : ""
              }`}
              onClick={() => onNavigate(item.id)}
              aria-current={
                activePage === item.id ? "page" : undefined
              }
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="support-icon">✦</div>
          <strong>Your future, your way.</strong>
          <p>
            Small steps today can open new doors tomorrow.
          </p>
        </div>
      </aside>

      <main className="main-area" id="main" tabIndex={-1}>
        <OfflineBanner />

        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">R</span>
            <strong>RuralRise</strong>
          </div>

          <span className="topbar-message">
            A little progress every day adds up.
          </span>

          <LanguageSelect />

          <button
            type="button"
            className="avatar"
            onClick={() => onNavigate(teacher ? 'facilitator' : 'profile')}
            aria-label="Open profile"
          >
            S
          </button>
          {session.secure && session.identity && <button type="button" onClick={session.logout}>Sign out</button>}
        </header>

        <section className="page-content">
          {!session.secure && <p className="rr-notice">Fictional demo mode — use sample details only. Real student accounts require secure mode.</p>}
          {session.offlineAccount && <p className="rr-notice">Offline account view: saved lessons and local progress are available in this tab. Reconnect to verify access and synchronize. This is not a fresh account verification.</p>}
          <div className="eyebrow">YOUR JOURNEY STARTS HERE</div>

          <h1>{activeNavigation?.label ?? "Dashboard"}</h1>

          <p className="page-subtitle">
            Discover your strengths, build useful skills, and explore
            new possibilities.
          </p>

          {session.secure && !session.identity ? <Account /> : session.secure && (session.loading || !session.account) ? <StatusPanel loading={session.loading} error={session.error || 'Account setup is unavailable. Check backend authentication and account-read configuration.'} onRetry={() => location.reload()} /> : teacher ? <FacilitatorDashboard dataSource="api" /> : renderPage()}

          <footer className="page-footer">
            RuralRise AI - Learn, grow, and rise together.
          </footer>
        </section>
      </main>
    </div>
  );
}

export default function App() { return <StudentProvider><AppShell /></StudentProvider>; }
