
import { useState } from "react";
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

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [studentId, setStudentId] = useState(DEMO_STUDENTS[0].id);

  const activeNavigation = navigation.find(
    (item) => item.id === activePage
  );

  const student = DEMO_STUDENTS.find(
    (item) => item.id === studentId
  );

  function renderPage() {
    switch (activePage) {
      case "dashboard":
        return <Dashboard />;

      case "careers":
        return <Careers />;

      case "recommendations":
        return <Recommendations />;

      case "learning":
        return <Learning />;

      case "opportunities":
        return <Opportunities />;

      case "profile":
        return <Profile />;

      case "facilitator":
        return <FacilitatorDashboard />;

      case "lessons":
        return (
          <>
            <div className="app-student-picker">
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
            </div>

            <OfflineLessons
              key={studentId}
              studentId={student.id}
              studentName={student.name}
            />
          </>
        );

      default:
        return <Dashboard />;
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
            setActivePage("dashboard");
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
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${
                activePage === item.id ? "active" : ""
              }`}
              onClick={() => setActivePage(item.id)}
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
            onClick={() => setActivePage("profile")}
            aria-label="Open profile"
          >
            S
          </button>
        </header>

        <section className="page-content">
          <div className="eyebrow">YOUR JOURNEY STARTS HERE</div>

          <h1>{activeNavigation?.label ?? "Dashboard"}</h1>

          <p className="page-subtitle">
            Discover your strengths, build useful skills, and explore
            new possibilities.
          </p>

          {renderPage()}

          <footer className="page-footer">
            RuralRise AI - Learn, grow, and rise together.
          </footer>
        </section>
      </main>
    </div>
  );
}

export default App;
