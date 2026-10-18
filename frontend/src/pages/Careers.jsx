
import { useState } from "react";

const careers = [
  {
    id: 1,
    title: "Solar PV Technician",
    category: "Technical",
    icon: "☀️",
    description:
      "Install, maintain, and troubleshoot solar power systems.",
    skills: ["Basic electricity", "Safety", "Problem-solving"],
    education: "Vocational training or relevant technical course",
    demand: "Renewable energy",
  },
  {
    id: 2,
    title: "Agriculture Technology Assistant",
    category: "Agriculture",
    icon: "🌾",
    description:
      "Help farmers use modern tools, irrigation systems, and agricultural technology.",
    skills: ["Agriculture basics", "Digital tools", "Communication"],
    education: "Agriculture training or relevant diploma",
    demand: "Smart farming",
  },
  {
    id: 3,
    title: "Computer Support Technician",
    category: "Technology",
    icon: "💻",
    description:
      "Help people troubleshoot computers, software, and basic network issues.",
    skills: ["Computer basics", "Troubleshooting", "Communication"],
    education: "Computer fundamentals or technical certification",
    demand: "IT support",
  },
  {
    id: 4,
    title: "Healthcare Assistant",
    category: "Healthcare",
    icon: "🩺",
    description:
      "Support healthcare teams with basic patient care and daily activities.",
    skills: ["Communication", "Empathy", "Basic healthcare"],
    education: "Recognized healthcare assistant training",
    demand: "Healthcare services",
  },
  {
    id: 5,
    title: "Tailoring and Garment Professional",
    category: "Skilled Trades",
    icon: "🧵",
    description:
      "Create, alter, and repair clothing using tailoring techniques.",
    skills: ["Measurement", "Stitching", "Attention to detail"],
    education: "Tailoring course or practical apprenticeship",
    demand: "Garment and self-employment",
  },
  {
    id: 6,
    title: "Digital Services Assistant",
    category: "Technology",
    icon: "📱",
    description:
      "Help people access online forms, digital services, and basic computer facilities.",
    skills: ["Digital literacy", "Typing", "Customer service"],
    education: "Computer basics and digital skills training",
    demand: "Local digital services",
  },
];

const categories = [
  "All",
  "Technical",
  "Agriculture",
  "Technology",
  "Healthcare",
  "Skilled Trades",
];

function Careers() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCareer, setSelectedCareer] = useState(null);

  const filteredCareers = careers.filter((career) => {
    const matchesCategory =
      selectedCategory === "All" ||
      career.category === selectedCategory;

    const searchText = search.toLowerCase();

    const matchesSearch =
      career.title.toLowerCase().includes(searchText) ||
      career.description.toLowerCase().includes(searchText) ||
      career.skills.some((skill) =>
        skill.toLowerCase().includes(searchText)
      );

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="careers-page">
      <section className="careers-intro">
        <div>
          <span className="careers-label">EXPLORE YOUR POSSIBILITIES</span>
          <h2>Discover a career that fits you.</h2>
          <p>
            Explore different career paths, learn which skills they
            require, and find a starting point for your journey.
          </p>
        </div>
        <div className="careers-intro-icon" aria-hidden="true">
          🧭
        </div>
      </section>

      <section className="career-search-section">
        <label className="career-search-label" htmlFor="career-search">
          Search careers or skills
        </label>

        <input
          id="career-search"
          className="career-search-input"
          type="search"
          placeholder="Try solar, computers, communication..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="career-filters" aria-label="Filter careers">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`career-filter ${
                selectedCategory === category ? "selected" : ""
              }`}
              onClick={() => setSelectedCategory(category)}
              aria-pressed={selectedCategory === category}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <div className="career-results-heading">
        <div>
          <h2>Career paths to explore</h2>
          <p>
            {filteredCareers.length}{" "}
            {filteredCareers.length === 1 ? "career" : "careers"} found
          </p>
        </div>
      </div>

      {filteredCareers.length > 0 ? (
        <div className="career-grid">
          {filteredCareers.map((career) => (
            <article className="career-card" key={career.id}>
              <div className="career-card-top">
                <span className="career-icon" aria-hidden="true">
                  {career.icon}
                </span>
                <span className="career-category">
                  {career.category}
                </span>
              </div>

              <h3>{career.title}</h3>
              <p className="career-description">
                {career.description}
              </p>

              <div className="career-skills">
                <strong>Useful skills</strong>
                <div className="skill-tags">
                  {career.skills.map((skill) => (
                    <span className="skill-tag" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="career-details-button"
                onClick={() => setSelectedCareer(career)}
              >
                Explore this career <span aria-hidden="true">→</span>
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="career-empty-state">
          <span aria-hidden="true">🔎</span>
          <h3>No careers found</h3>
          <p>Try another search term or select a different category.</p>
          <button
            type="button"
            className="career-details-button"
            onClick={() => {
              setSearch("");
              setSelectedCategory("All");
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {selectedCareer && (
        <div
          className="career-modal-backdrop"
          onClick={() => setSelectedCareer(null)}
        >
          <section
            className="career-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="career-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="career-modal-close"
              aria-label="Close career details"
              onClick={() => setSelectedCareer(null)}
            >
              ×
            </button>

            <span className="career-icon" aria-hidden="true">
              {selectedCareer.icon}
            </span>

            <span className="career-category">
              {selectedCareer.category}
            </span>

            <h2 id="career-modal-title">{selectedCareer.title}</h2>
            <p>{selectedCareer.description}</p>

            <h3>Skills to develop</h3>
            <ul>
              {selectedCareer.skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>

            <h3>Possible learning starting point</h3>
            <p>{selectedCareer.education}</p>

            <h3>Related field</h3>
            <p>{selectedCareer.demand}</p>

            <p className="career-disclaimer">
              These are illustrative career suggestions, not a guarantee
              of employment or local job availability. Verify course
              recognition and eligibility before enrolling.
            </p>

            <button
              type="button"
              className="career-details-button"
              onClick={() => setSelectedCareer(null)}
            >
              Back to careers
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default Careers;
