
import { useMemo, useState } from "react";

const demoRecommendations = [
  {
    id: "solar-technician",
    title: "Solar PV Technician",
    category: "Technical",
    matchScore: 92,
    description:
      "Learn to install, inspect, and maintain solar power systems.",
    reasons: [
      "Matches an interest in electronics and practical work.",
      "Offers opportunities to learn renewable-energy skills.",
    ],
    missingSkills: ["Electrical safety", "Solar installation basics"],
    nextSteps: [
      "Learn basic electrical safety.",
      "Explore an introductory solar-energy course.",
      "Practise identifying common solar components.",
    ],
    duration: "3–6 months to build foundational skills",
    tags: ["Renewable energy", "Hands-on", "Technical"],
  },
  {
    id: "agriculture-tech",
    title: "Agriculture Technology Assistant",
    category: "Agriculture",
    matchScore: 86,
    description:
      "Support farmers with digital tools, farm records, and modern practices.",
    reasons: [
      "Matches an interest in agriculture and practical learning.",
      "Combines local agricultural knowledge with technology.",
    ],
    missingSkills: ["Digital tools", "Basic agricultural practices"],
    nextSteps: [
      "Practise using digital forms and spreadsheets.",
      "Learn about local crops and farming practices.",
      "Explore introductory agricultural technology lessons.",
    ],
    duration: "2–6 months to build foundational skills",
    tags: ["Agriculture", "Digital skills", "Field work"],
  },
  {
    id: "computer-support",
    title: "Computer Support Technician",
    category: "Technology",
    matchScore: 84,
    description:
      "Help people set up computers, solve common problems, and use software.",
    reasons: [
      "Matches an interest in computers and technology.",
      "Builds practical troubleshooting and communication skills.",
    ],
    missingSkills: ["Computer hardware", "Troubleshooting"],
    nextSteps: [
      "Learn computer components and their functions.",
      "Practise basic operating-system tasks.",
      "Study common computer and connectivity problems.",
    ],
    duration: "3–6 months to build foundational skills",
    tags: ["Computers", "Problem-solving", "Technical"],
  },
  {
    id: "digital-services",
    title: "Digital Services Assistant",
    category: "Business",
    matchScore: 80,
    description:
      "Help people access online services and complete common digital tasks.",
    reasons: [
      "Matches an interest in digital skills and helping people.",
      "Uses communication and everyday computer skills.",
    ],
    missingSkills: ["Online service workflows", "Digital safety"],
    nextSteps: [
      "Practise safe internet and email use.",
      "Learn how to complete common online forms.",
      "Study privacy and responsible data handling.",
    ],
    duration: "1–3 months to build foundational skills",
    tags: ["Digital literacy", "Communication", "Services"],
  },
  {
    id: "healthcare-assistant",
    title: "Healthcare Support Assistant",
    category: "Healthcare",
    matchScore: 76,
    description:
      "Explore support roles in healthcare settings through suitable training.",
    reasons: [
      "May suit an interest in healthcare and helping others.",
      "Provides a pathway to explore structured vocational training.",
    ],
    missingSkills: ["Healthcare fundamentals", "Workplace safety"],
    nextSteps: [
      "Explore recognised introductory healthcare courses.",
      "Learn basic hygiene and safety principles.",
      "Check local training and qualification requirements.",
    ],
    duration: "Varies by role and required qualification",
    tags: ["Healthcare", "Service", "Vocational training"],
  },
  {
    id: "tailoring",
    title: "Tailoring and Garment Professional",
    category: "Skilled Trades",
    matchScore: 73,
    description:
      "Develop garment-making, alteration, and small-business skills.",
    reasons: [
      "May suit an interest in design and practical work.",
      "Offers a way to explore skilled work and entrepreneurship.",
    ],
    missingSkills: ["Machine operation", "Garment measurement"],
    nextSteps: [
      "Learn basic measurement and fabric handling.",
      "Practise simple stitching techniques safely.",
      "Explore local vocational training options.",
    ],
    duration: "Varies with practice and training",
    tags: ["Design", "Practical", "Entrepreneurship"],
  },
];

const categories = [
  "All",
  "Technical",
  "Agriculture",
  "Technology",
  "Business",
  "Healthcare",
  "Skilled Trades",
];

function Recommendations() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedCareer, setSelectedCareer] = useState(null);
  const [savedCareers, setSavedCareers] = useState([]);
  const [sortBy, setSortBy] = useState("match");
  const [showDemoNotice, setShowDemoNotice] = useState(true);

  const filteredRecommendations = useMemo(() => {
    const term = search.trim().toLowerCase();

    return demoRecommendations
      .filter((career) => {
        const matchesCategory =
          category === "All" || career.category === category;

        const searchableText = [
          career.title,
          career.category,
          career.description,
          ...career.tags,
        ]
          .join(" ")
          .toLowerCase();

        return matchesCategory && searchableText.includes(term);
      })
      .sort((a, b) =>
        sortBy === "name"
          ? a.title.localeCompare(b.title)
          : b.matchScore - a.matchScore
      );
  }, [search, category, sortBy]);

  function toggleSaved(id) {
    setSavedCareers((current) =>
      current.includes(id)
        ? current.filter((careerId) => careerId !== id)
        : [...current, id]
    );
  }

  return (
    <div className="recommendations-page">
      <section className="recommendations-hero">
        <div>
          <span className="recommendations-kicker">
            YOUR POSSIBILITIES
          </span>
          <h2>Explore careers that fit your interests</h2>
          <p>
            Discover career paths, understand the skills involved, and
            find a practical place to begin.
          </p>
        </div>
        <div className="recommendations-hero-icon" aria-hidden="true">
          ✳
        </div>
      </section>

      {showDemoNotice && (
        <div className="recommendations-demo-notice" role="status">
          <div>
            <strong>Sample recommendations</strong>
            <p>
              These are illustrative examples. Match scores are not
              generated by an AI model or based on your personal profile.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDemoNotice(false)}
            aria-label="Dismiss sample data notice"
          >
            ×
          </button>
        </div>
      )}

      <section className="recommendations-toolbar">
        <label className="recommendations-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search careers or skills..."
            aria-label="Search careers or skills"
          />
        </label>

        <label className="recommendations-sort">
          <span>Sort by</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="match">Match score</option>
            <option value="name">Career name</option>
          </select>
        </label>
      </section>

      <div className="recommendations-categories" aria-label="Career categories">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className={`recommendation-filter ${
              category === item ? "active" : ""
            }`}
            onClick={() => setCategory(item)}
            aria-pressed={category === item}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="recommendations-results-heading">
        <div>
          <h3>Career paths to explore</h3>
          <p>
            {filteredRecommendations.length}{" "}
            {filteredRecommendations.length === 1 ? "career" : "careers"} found
          </p>
        </div>
        <span className="recommendations-saved-count">
          ♡ {savedCareers.length} saved
        </span>
      </div>

      {filteredRecommendations.length > 0 ? (
        <div className="recommendations-grid">
          {filteredRecommendations.map((career) => {
            const isSaved = savedCareers.includes(career.id);

            return (
              <article className="recommendation-card" key={career.id}>
                <div className="recommendation-card-top">
                  <span className="recommendation-category">
                    {career.category}
                  </span>
                  <button
                    className={`recommendation-save ${
                      isSaved ? "saved" : ""
                    }`}
                    type="button"
                    onClick={() => toggleSaved(career.id)}
                    aria-label={
                      isSaved
                        ? `Remove ${career.title} from saved careers`
                        : `Save ${career.title}`
                    }
                    aria-pressed={isSaved}
                  >
                    {isSaved ? "♥" : "♡"}
                  </button>
                </div>

                <h3>{career.title}</h3>
                <p className="recommendation-description">
                  {career.description}
                </p>

                <div className="recommendation-match">
                  <div className="recommendation-match-heading">
                    <span>Sample match score</span>
                    <strong>{career.matchScore}%</strong>
                  </div>
                  <div
                    className="recommendation-progress-track"
                    role="progressbar"
                    aria-label={`Illustrative match score for ${career.title}`}
                    aria-valuenow={career.matchScore}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="recommendation-progress-fill"
                      style={{ width: `${career.matchScore}%` }}
                    />
                  </div>
                </div>

                <div className="recommendation-tags">
                  {career.tags.slice(0, 3).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>

                <button
                  type="button"
                  className="recommendation-details-button"
                  onClick={() => setSelectedCareer(career)}
                >
                  Explore career <span aria-hidden="true">→</span>
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="recommendations-empty">
          <span aria-hidden="true">⌕</span>
          <h3>No careers found</h3>
          <p>Try another search or choose a different category.</p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategory("All");
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {selectedCareer && (
        <div
          className="recommendation-modal-backdrop"
          onClick={() => setSelectedCareer(null)}
        >
          <section
            className="recommendation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recommendation-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="recommendation-modal-close"
              onClick={() => setSelectedCareer(null)}
              aria-label="Close career details"
            >
              ×
            </button>

            <span className="recommendation-category">
              {selectedCareer.category}
            </span>
            <h2 id="recommendation-modal-title">
              {selectedCareer.title}
            </h2>
            <p>{selectedCareer.description}</p>

            <div className="recommendation-modal-score">
              <strong>{selectedCareer.matchScore}%</strong>
              <span>Illustrative match score — not an AI assessment</span>
            </div>

            <h3>Why explore this career?</h3>
            <ul>
              {selectedCareer.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>

            <h3>Skills to develop</h3>
            <ul>
              {selectedCareer.missingSkills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>

            <h3>Suggested next steps</h3>
            <ol>
              {selectedCareer.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>

            <p className="recommendation-duration">
              <strong>Learning timeline:</strong> {selectedCareer.duration}
            </p>

            <button
              type="button"
              className="recommendation-details-button"
              onClick={() => toggleSaved(selectedCareer.id)}
            >
              {savedCareers.includes(selectedCareer.id)
                ? "♥ Saved career"
                : "♡ Save this career"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default Recommendations;
