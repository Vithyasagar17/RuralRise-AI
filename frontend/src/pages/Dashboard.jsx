
const learningGoals = [
  {
    title: "Explore career options",
    description: "Discover careers that match your interests.",
    icon: "🧭",
    progress: 0,
  },
  {
    title: "Build a new skill",
    description: "Start learning through practical lessons.",
    icon: "🛠️",
    progress: 0,
  },
  {
    title: "Find opportunities",
    description: "Explore training, internships and jobs.",
    icon: "🌱",
    progress: 0,
  },
];

function Dashboard() {
  return (
    <div className="dashboard-page">
      <section className="welcome-section">
        <p className="eyebrow">YOUR JOURNEY STARTS HERE</p>
        <h2>Small steps. Bigger opportunities.</h2>
        <p>
          Discover your strengths, learn useful skills, and explore
          opportunities for your future.
        </p>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Your next steps</h2>
            <p>Choose where you want to begin.</p>
          </div>
        </div>

        <div className="quick-actions">
          {learningGoals.map((goal) => (
            <article className="action-card" key={goal.title}>
              <div className="action-icon">{goal.icon}</div>
              <h3>{goal.title}</h3>
              <p>{goal.description}</p>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
              <span className="progress-label">
                {goal.progress}% completed
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Made for your future</h2>
            <p>
              RuralRise AI helps you connect learning with real-world
              opportunities.
            </p>
          </div>
        </div>

        <div className="info-card">
          <span className="info-icon">💡</span>
          <div>
            <h3>Start with your interests</h3>
            <p>
              Tell us what you enjoy, what skills you have, and what
              you want to achieve. You can then explore suitable
              learning paths and career options.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
