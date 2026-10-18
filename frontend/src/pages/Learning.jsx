
import { useState } from "react";

const initialModules = [
  {
    id: 1,
    title: "Digital Literacy Basics",
    category: "Foundation",
    level: "Beginner",
    duration: "2 hours",
    icon: "💻",
    description:
      "Learn essential computer, smartphone, internet, and online safety skills.",
    lessons: [
      "Introduction to digital devices",
      "Using the internet safely",
      "Email and online communication",
      "Recognizing online scams",
    ],
  },
  {
    id: 2,
    title: "Communication Skills",
    category: "Personal Development",
    level: "Beginner",
    duration: "3 hours",
    icon: "💬",
    description:
      "Build confidence in communication, teamwork, and everyday problem-solving.",
    lessons: [
      "Communicating clearly",
      "Listening and teamwork",
      "Preparing for an interview",
      "Building confidence",
    ],
  },
  {
    id: 3,
    title: "Introduction to Solar Energy",
    category: "Technical Skills",
    level: "Beginner",
    duration: "4 hours",
    icon: "☀️",
    description:
      "Understand solar power, basic components, and renewable energy applications.",
    lessons: [
      "What is solar energy?",
      "Understanding solar panels",
      "Solar energy applications",
      "Introduction to electrical safety",
    ],
  },
  {
    id: 4,
    title: "Financial Literacy",
    category: "Life Skills",
    level: "Beginner",
    duration: "2 hours",
    icon: "💰",
    description:
      "Learn budgeting, saving, responsible spending, and basic financial planning.",
    lessons: [
      "Understanding income and expenses",
      "Creating a simple budget",
      "Saving for future goals",
      "Recognizing financial fraud",
    ],
  },
];

function Learning() {
  const [modules, setModules] = useState(initialModules);
  const [selectedModule, setSelectedModule] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");

  const completedCount = modules.reduce(
    (total, module) =>
      total +
      module.lessons.filter((lesson) =>
        module.completedLessons?.includes(lesson)
      ).length,
    0
  );

  const totalLessons = modules.reduce(
    (total, module) => total + module.lessons.length,
    0
  );

  const overallProgress = totalLessons
    ? Math.round((completedCount / totalLessons) * 100)
    : 0;

  const filteredModules = modules.filter((module) => {
    if (activeFilter === "In progress") {
      const done = module.completedLessons?.length ?? 0;
      return done > 0 && done < module.lessons.length;
    }

    if (activeFilter === "Not started") {
      return (module.completedLessons?.length ?? 0) === 0;
    }

    if (activeFilter === "Completed") {
      return (
        (module.completedLessons?.length ?? 0) ===
        module.lessons.length
      );
    }

    return true;
  });

  function toggleLesson(moduleId, lesson) {
    setModules((previousModules) =>
      previousModules.map((module) => {
        if (module.id !== moduleId) return module;

        const completed = module.completedLessons ?? [];
        const isCompleted = completed.includes(lesson);

        return {
          ...module,
          completedLessons: isCompleted
            ? completed.filter((item) => item !== lesson)
            : [...completed, lesson],
        };
      })
    );

    setSelectedModule((previousSelected) => {
      if (!previousSelected || previousSelected.id !== moduleId) {
        return previousSelected;
      }

      const currentModule = modules.find(
        (module) => module.id === moduleId
      );

      const completed = currentModule?.completedLessons ?? [];
      const isCompleted = completed.includes(lesson);

      return {
        ...previousSelected,
        completedLessons: isCompleted
          ? completed.filter((item) => item !== lesson)
          : [...completed, lesson],
      };
    });
  }

  function getModuleProgress(module) {
    const completed = module.completedLessons?.length ?? 0;

    return Math.round((completed / module.lessons.length) * 100);
  }

  return (
    <div className="learning-page">
      <section className="learning-hero">
        <div>
          <span className="learning-eyebrow">
            YOUR PERSONAL LEARNING SPACE
          </span>
          <h2>Learn something new every day.</h2>
          <p>
            Explore practical learning modules, build useful skills,
            and take small steps toward your goals.
          </p>
        </div>
        <div className="learning-hero-icon" aria-hidden="true">
          📚
        </div>
      </section>

      <section className="learning-progress-card">
        <div className="learning-progress-heading">
          <div>
            <span className="learning-muted-label">
              YOUR OVERALL PROGRESS
            </span>
            <h2>{overallProgress}% completed</h2>
            <p>
              {completedCount} of {totalLessons} lessons completed
            </p>
          </div>
          <div className="learning-progress-icon" aria-hidden="true">
            🌱
          </div>
        </div>

        <div
          className="learning-progress-track"
          role="progressbar"
          aria-label="Overall learning progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={overallProgress}
        >
          <div
            className="learning-progress-fill"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </section>

      <section className="learning-modules-section">
        <div className="learning-section-heading">
          <div>
            <h2>Learning modules</h2>
            <p>Choose a module and work through it at your own pace.</p>
          </div>
        </div>

        <div className="learning-filters" aria-label="Filter modules">
          {["All", "Not started", "In progress", "Completed"].map(
            (filter) => (
              <button
                type="button"
                key={filter}
                className={`learning-filter ${
                  activeFilter === filter ? "selected" : ""
                }`}
                onClick={() => setActiveFilter(filter)}
                aria-pressed={activeFilter === filter}
              >
                {filter}
              </button>
            )
          )}
        </div>

        {filteredModules.length > 0 ? (
          <div className="learning-module-grid">
            {filteredModules.map((module) => {
              const progress = getModuleProgress(module);

              return (
                <article className="learning-module-card" key={module.id}>
                  <div className="learning-module-top">
                    <span className="learning-module-icon" aria-hidden="true">
                      {module.icon}
                    </span>
                    <span className="learning-level">{module.level}</span>
                  </div>

                  <span className="learning-category">
                    {module.category}
                  </span>

                  <h3>{module.title}</h3>
                  <p className="learning-module-description">
                    {module.description}
                  </p>

                  <div className="learning-module-meta">
                    <span>◷ {module.duration}</span>
                    <span>
                      {module.completedLessons?.length ?? 0}/
                      {module.lessons.length} lessons
                    </span>
                  </div>

                  <div
                    className="learning-progress-track module-track"
                    role="progressbar"
                    aria-label={`${module.title} progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <div
                      className="learning-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <button
                    type="button"
                    className="learning-open-button"
                    onClick={() => setSelectedModule(module)}
                  >
                    {progress === 100
                      ? "Review module"
                      : progress > 0
                        ? "Continue learning"
                        : "Start learning"}
                    <span aria-hidden="true">→</span>
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="learning-empty-state">
            <span aria-hidden="true">📖</span>
            <h3>No modules in this category yet</h3>
            <p>Try another filter to explore your learning modules.</p>
            <button
              type="button"
              className="learning-open-button"
              onClick={() => setActiveFilter("All")}
            >
              Show all modules
            </button>
          </div>
        )}
      </section>

      {selectedModule && (
        <div
          className="learning-modal-backdrop"
          onClick={() => setSelectedModule(null)}
        >
          <section
            className="learning-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="learning-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="learning-modal-close"
              aria-label="Close module"
              onClick={() => setSelectedModule(null)}
            >
              ×
            </button>

            <span className="learning-module-icon" aria-hidden="true">
              {selectedModule.icon}
            </span>

            <h2 id="learning-modal-title">{selectedModule.title}</h2>
            <p>{selectedModule.description}</p>

            <h3>Lessons checklist</h3>
            <p className="learning-modal-hint">
              Mark a lesson as completed when you finish it.
            </p>

            <div className="learning-lesson-list">
              {selectedModule.lessons.map((lesson, index) => {
                const isCompleted =
                  selectedModule.completedLessons?.includes(lesson) ?? false;

                return (
                  <label className="learning-lesson" key={lesson}>
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={() =>
                        toggleLesson(selectedModule.id, lesson)
                      }
                    />
                    <span className="learning-lesson-number">
                      {index + 1}
                    </span>
                    <span
                      className={
                        isCompleted ? "lesson-completed" : ""
                      }
                    >
                      {lesson}
                    </span>
                  </label>
                );
              })}
            </div>

            <button
              type="button"
              className="learning-open-button"
              onClick={() => setSelectedModule(null)}
            >
              Save progress and close
            </button>

            <p className="learning-demo-note">
              Demo mode: progress currently lives in this page's memory
              and will reset when the page is refreshed.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

export default Learning;
