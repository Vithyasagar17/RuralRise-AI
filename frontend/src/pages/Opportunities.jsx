
import { useState } from "react";

const opportunities = [
  {
    id: 1,
    title: "Solar Energy Skills Training",
    organization: "Demo Training Centre",
    type: "Training",
    field: "Technical",
    location: "Tamil Nadu",
    mode: "Practical training",
    duration: "8 weeks",
    icon: "☀️",
    description:
      "An illustrative training opportunity to learn solar energy fundamentals, equipment basics, and electrical safety.",
    eligibility:
      "Check the training provider's age, education, and enrollment requirements.",
    skills: ["Solar energy basics", "Safety", "Practical skills"],
    deadline: "Verify with the provider",
  },
  {
    id: 2,
    title: "Digital Skills Foundation",
    organization: "Demo Learning Centre",
    type: "Training",
    field: "Technology",
    location: "Online",
    mode: "Online learning",
    duration: "4 weeks",
    icon: "💻",
    description:
      "Build foundational computer skills, internet awareness, email communication, and digital safety.",
    eligibility:
      "Suitable for beginners; confirm the actual provider's requirements.",
    skills: ["Computer basics", "Internet skills", "Online safety"],
    deadline: "Verify with the provider",
  },
  {
    id: 3,
    title: "Agriculture Field Assistant",
    organization: "Example Rural Enterprise",
    type: "Job",
    field: "Agriculture",
    location: "Tamil Nadu",
    mode: "On-site",
    duration: "Full-time role",
    icon: "🌾",
    description:
      "An example role involving field support, agricultural records, and communication with farming communities.",
    eligibility:
      "Actual qualifications and experience requirements must be confirmed with the employer.",
    skills: ["Agriculture basics", "Record keeping", "Communication"],
    deadline: "Not verified",
  },
  {
    id: 4,
    title: "Community Digital Services Internship",
    organization: "Example Community Initiative",
    type: "Internship",
    field: "Technology",
    location: "Tamil Nadu",
    mode: "Community-based",
    duration: "6 weeks",
    icon: "📱",
    description:
      "An illustrative internship focused on helping communities understand and access digital services.",
    eligibility:
      "Confirm age, education, selection criteria, and availability with the organizer.",
    skills: ["Digital literacy", "Communication", "Problem-solving"],
    deadline: "Not verified",
  },
  {
    id: 5,
    title: "Healthcare Support Skills",
    organization: "Demo Skills Centre",
    type: "Training",
    field: "Healthcare",
    location: "Tamil Nadu",
    mode: "Practical training",
    duration: "12 weeks",
    icon: "🩺",
    description:
      "An example learning pathway introducing healthcare support, hygiene, and professional communication.",
    eligibility:
      "Check whether the course is recognized and what prerequisites apply.",
    skills: ["Hygiene", "Communication", "Patient support basics"],
    deadline: "Verify with the provider",
  },
  {
    id: 6,
    title: "Tailoring and Entrepreneurship",
    organization: "Example Vocational Centre",
    type: "Training",
    field: "Skilled Trades",
    location: "Tamil Nadu",
    mode: "Hands-on learning",
    duration: "10 weeks",
    icon: "🧵",
    description:
      "An illustrative program covering basic tailoring techniques and an introduction to small-business planning.",
    eligibility:
      "Confirm enrollment details and any equipment or material costs with the provider.",
    skills: ["Stitching", "Measurement", "Business basics"],
    deadline: "Verify with the provider",
  },
];

const opportunityTypes = [
  "All",
  "Training",
  "Internship",
  "Job",
];

function Opportunities() {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [savedIds, setSavedIds] = useState([]);

  const filteredOpportunities = opportunities.filter((opportunity) => {
    const matchesType =
      selectedType === "All" || opportunity.type === selectedType;

    const searchText = search.trim().toLowerCase();

    const searchableText = [
      opportunity.title,
      opportunity.organization,
      opportunity.type,
      opportunity.field,
      opportunity.location,
      opportunity.description,
      ...opportunity.skills,
    ]
      .join(" ")
      .toLowerCase();

    return matchesType && searchableText.includes(searchText);
  });

  function toggleSaved(opportunityId) {
    setSavedIds((previous) =>
      previous.includes(opportunityId)
        ? previous.filter((id) => id !== opportunityId)
        : [...previous, opportunityId]
    );
  }

  return (
    <div className="opportunities-page">
      <section className="opportunities-hero">
        <div>
          <span className="opportunities-eyebrow">
            TAKE YOUR NEXT STEP
          </span>
          <h2>Find opportunities to grow.</h2>
          <p>
            Explore training pathways, internships, and job examples
            that can help you move toward your goals.
          </p>
        </div>

        <div className="opportunities-hero-icon" aria-hidden="true">
          🌱
        </div>
      </section>

      <section className="opportunities-search">
        <label htmlFor="opportunity-search">
          Search opportunities
        </label>

        <input
          id="opportunity-search"
          type="search"
          className="opportunity-search-input"
          placeholder="Search by skill, field, title, or location..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="opportunity-filters" aria-label="Filter by type">
          {opportunityTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={`opportunity-filter ${
                selectedType === type ? "selected" : ""
              }`}
              onClick={() => setSelectedType(type)}
              aria-pressed={selectedType === type}
            >
              {type}
            </button>
          ))}
        </div>
      </section>

      <section className="opportunity-results">
        <div className="opportunity-results-heading">
          <div>
            <h2>Explore opportunities</h2>
            <p>
              {filteredOpportunities.length}{" "}
              {filteredOpportunities.length === 1
                ? "result"
                : "results"}{" "}
              found
            </p>
          </div>

          <span className="saved-count">
            ♡ {savedIds.length} saved
          </span>
        </div>

        {filteredOpportunities.length > 0 ? (
          <div className="opportunity-grid">
            {filteredOpportunities.map((opportunity) => {
              const isSaved = savedIds.includes(opportunity.id);

              return (
                <article
                  className="opportunity-card"
                  key={opportunity.id}
                >
                  <div className="opportunity-card-top">
                    <span
                      className="opportunity-icon"
                      aria-hidden="true"
                    >
                      {opportunity.icon}
                    </span>

                    <span
                      className={`opportunity-type type-${opportunity.type.toLowerCase()}`}
                    >
                      {opportunity.type}
                    </span>
                  </div>

                  <h3>{opportunity.title}</h3>

                  <p className="opportunity-organization">
                    {opportunity.organization}
                  </p>

                  <p className="opportunity-description">
                    {opportunity.description}
                  </p>

                  <div className="opportunity-meta">
                    <span>📍 {opportunity.location}</span>
                    <span>◷ {opportunity.duration}</span>
                  </div>

                  <div className="opportunity-card-actions">
                    <button
                      type="button"
                      className="opportunity-details-button"
                      onClick={() =>
                        setSelectedOpportunity(opportunity)
                      }
                    >
                      View details →
                    </button>

                    <button
                      type="button"
                      className={`opportunity-save-button ${
                        isSaved ? "saved" : ""
                      }`}
                      onClick={() => toggleSaved(opportunity.id)}
                      aria-pressed={isSaved}
                      aria-label={
                        isSaved
                          ? `Remove ${opportunity.title} from saved opportunities`
                          : `Save ${opportunity.title}`
                      }
                    >
                      {isSaved ? "♥ Saved" : "♡ Save"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="opportunity-empty-state">
            <span aria-hidden="true">🔎</span>
            <h3>No matching opportunities</h3>
            <p>Try a different search or choose another category.</p>
            <button
              type="button"
              className="opportunity-details-button"
              onClick={() => {
                setSearch("");
                setSelectedType("All");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      <p className="opportunities-demo-notice">
        Demo content: these entries are illustrative examples, not
        verified vacancies or currently open programs. Confirm availability,
        eligibility, costs, and deadlines directly with the real provider
        before applying or enrolling.
      </p>

      {selectedOpportunity && (
        <div
          className="opportunity-modal-backdrop"
          onClick={() => setSelectedOpportunity(null)}
        >
          <section
            className="opportunity-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="opportunity-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="opportunity-modal-close"
              aria-label="Close opportunity details"
              onClick={() => setSelectedOpportunity(null)}
            >
              ×
            </button>

            <span className="opportunity-icon" aria-hidden="true">
              {selectedOpportunity.icon}
            </span>

            <span className="opportunity-type">
              {selectedOpportunity.type}
            </span>

            <h2 id="opportunity-modal-title">
              {selectedOpportunity.title}
            </h2>

            <p className="opportunity-organization">
              {selectedOpportunity.organization}
            </p>

            <p>{selectedOpportunity.description}</p>

            <h3>Opportunity details</h3>
            <ul>
              <li>
                <strong>Field:</strong> {selectedOpportunity.field}
              </li>
              <li>
                <strong>Location:</strong> {selectedOpportunity.location}
              </li>
              <li>
                <strong>Mode:</strong> {selectedOpportunity.mode}
              </li>
              <li>
                <strong>Duration:</strong> {selectedOpportunity.duration}
              </li>
              <li>
                <strong>Deadline:</strong> {selectedOpportunity.deadline}
              </li>
            </ul>

            <h3>Skills you may develop</h3>
            <div className="opportunity-skill-tags">
              {selectedOpportunity.skills.map((skill) => (
                <span className="opportunity-skill-tag" key={skill}>
                  {skill}
                </span>
              ))}
            </div>

            <h3>Eligibility</h3>
            <p>{selectedOpportunity.eligibility}</p>

            <p className="opportunity-modal-notice">
              This is demo information. No application can be submitted
              from this page yet.
            </p>

            <button
              type="button"
              className="opportunity-details-button modal-done-button"
              onClick={() => setSelectedOpportunity(null)}
            >
              Back to opportunities
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default Opportunities;
