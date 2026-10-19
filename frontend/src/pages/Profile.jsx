
import { useState } from "react";
import { useStudent } from '../features/student/StudentContext.jsx';
import { VoiceInput } from '../features/common/VoiceControls.jsx';

const initialProfile = {
  name: "",
  education_level: "Class 12",
  location: "Tamil Nadu",
  language: "Tamil",
  interests: [],
  skills: "",
  preferred_learning: "practical",
  weekly_learning_hours: "5",
  goals: [],
};

const interestOptions = [
  "Technology",
  "Electronics",
  "Agriculture",
  "Healthcare",
  "Business",
  "Design and tailoring",
  "Teaching",
  "Hands-on work",
];

const goalOptions = [
  "Find a job",
  "Explore career options",
  "Learn new skills",
  "Find vocational training",
  "Start a small business",
  "Prepare for higher education",
];

function Profile() {
  const session = useStudent();
  const [profile, setProfile] = useState(() => {
    const saved = session?.student?.profile;
    return saved ? { ...initialProfile, ...saved, skills: (saved.skills || []).join(', '), weekly_learning_hours: String(saved.weekly_learning_hours) } : initialProfile;
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function updateField(event) {
  const { name, value } = event.target;

  setProfile((current) => ({
    ...current,
    [name]: value,
  }));

  setSaved(false);
  setErrorMessage("");
}

  function toggleOption(field, option) {
  setProfile((current) => {
    const selected = current[field];

    const updated = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];

    return {
      ...current,
      [field]: updated,
    };
  });

  setSaved(false);
  setErrorMessage("");
}

  async function handleSubmit(event) {
  event.preventDefault();

  setErrorMessage("");
  setSaved(false);

  if (profile.interests.length === 0) {
    setErrorMessage("Please select at least one interest.");
    return;
  }

  const normalizedProfile = {
    ...profile,
    name: profile.name.trim(),
    location: profile.location.trim(),
    weekly_learning_hours: Number(profile.weekly_learning_hours),
    skills: profile.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean),
  };

  if (!normalizedProfile.name || !normalizedProfile.location) {
    setErrorMessage("Please enter your name and state or region.");
    return;
  }

  try {
    setSaving(true);
    await session.save(normalizedProfile);

    setProfile((current) => ({
      ...current,
      name: normalizedProfile.name,
      location: normalizedProfile.location,
      skills: normalizedProfile.skills.join(", "),
    }));

    setSaved(true);

  } catch (error) { setErrorMessage(error.message || 'The server could not save your profile. Try again.'); }
  finally { setSaving(false); }
}

  return (
    <div className="profile-page">
      <section className="profile-intro">
        <div className="profile-avatar">S</div>
        <div>
          <span className="section-kicker">YOUR PERSONAL SPACE</span>
          <h2>Tell us about yourself</h2>
          <p>
            Your journey is unique. Share a little about your interests,
            skills, and goals so RuralRise AI can guide you better.
          </p>
        </div>
      </section>
      {errorMessage && (
  <div className="profile-error" role="alert">
    <strong>Please check your profile</strong>
    <p>{errorMessage}</p>
  </div>
)}

      {saved && (
        <div className="profile-success" role="status">
          <span className="success-icon">✓</span>
          <div>
            <strong>Profile saved to the server.</strong>
            <p>
  Your student ID is {session.student?.student_id}. Open Career recommendations to see your results.
</p>
          </div>
        </div>
      )}

      <form className="profile-form" onSubmit={handleSubmit}>
        {!session.secure && session.student && <p className="rr-notice">Demo saves create a new fictional student ID. Progress remains attached to the earlier ID. Secure accounts update their existing profile.</p>}
        <section className="profile-form-section">
          <div className="form-section-heading">
            <span className="form-step">01</span>
            <div>
              <h3>Basic information</h3>
              <p>Let’s start with the essentials.</p>
            </div>
          </div>

          <div className="profile-fields">
            <label className="profile-field">
              <span>Full name</span>
              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={updateField}
                placeholder="Enter your name"
                required
              />
            </label>

            <label className="profile-field">
              <span>Current education level</span>
              <select
                name="education_level"
                value={profile.education_level}
                onChange={updateField}
              >
                <option>Class 8 or below</option>
                <option>Class 10</option>
                <option>Class 12</option>
                <option>Diploma</option>
                <option>Undergraduate</option>
                <option>Graduate or above</option>
                <option>Not currently studying</option>
              </select>
            </label>

            <label className="profile-field">
              <span>State or region</span>
              <input
                type="text"
                name="location"
                value={profile.location}
                onChange={updateField}
                placeholder="e.g. Tamil Nadu"
                required
              />
            </label>

            <label className="profile-field">
              <span>Preferred language</span>
              <select
                name="language"
                value={profile.language}
                onChange={updateField}
              >
                <option value="Tamil">Tamil</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Telugu">Telugu</option>
                <option value="Malayalam">Malayalam</option>
                <option value="Kannada">Kannada</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>
        </section>

        <section className="profile-form-section">
          <div className="form-section-heading">
            <span className="form-step">02</span>
            <div>
              <h3>What interests you?</h3>
              <p>Select every area you would like to explore.</p>
            </div>
          </div>

          <div className="profile-choice-grid">
            {interestOptions.map((option) => (
              <label
                key={option}
                className={`profile-choice ${
                  profile.interests.includes(option) ? "selected" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={profile.interests.includes(option)}
                  onChange={() => toggleOption("interests", option)}
                />
                <span className="choice-check">
                  {profile.interests.includes(option) ? "✓" : "+"}
                </span>
                <span>{option}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="profile-form-section">
          <div className="form-section-heading">
            <span className="form-step">03</span>
            <div>
              <h3>Your current skills</h3>
              <p>
                Include skills you already have, even if they are basic.
              </p>
            </div>
          </div>

          <label className="profile-field">
            <span>Skills (separate them with commas)</span>
            <textarea
              name="skills"
              value={profile.skills}
              onChange={updateField}
              placeholder="e.g. Basic mathematics, communication, smartphone use"
              rows={3}
            />
          </label>
          <VoiceInput language={profile.language === 'Tamil' ? 'ta-IN' : 'en-IN'} onResult={(text) => {
            setProfile((current) => ({ ...current, skills: [current.skills, text].filter(Boolean).join(', ') })); setSaved(false);
          }} />
        </section>

        <section className="profile-form-section">
          <div className="form-section-heading">
            <span className="form-step">04</span>
            <div>
              <h3>How do you like to learn?</h3>
              <p>Choose the learning style that suits you best.</p>
            </div>
          </div>

          <div className="learning-style-grid">
            <label
              className={`learning-style-card ${
                profile.preferred_learning === "practical" ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name="preferred_learning"
                value="practical"
                checked={profile.preferred_learning === "practical"}
                onChange={updateField}
              />
              <span className="learning-style-icon">🛠️</span>
              <strong>Learn by doing</strong>
              <span>Hands-on activities and practical tasks.</span>
            </label>

            <label
              className={`learning-style-card ${
                profile.preferred_learning === "visual" ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name="preferred_learning"
                value="visual"
                checked={profile.preferred_learning === "visual"}
                onChange={updateField}
              />
              <span className="learning-style-icon">🎬</span>
              <strong>Watch and learn</strong>
              <span>Videos, demonstrations, and illustrations.</span>
            </label>

            <label
              className={`learning-style-card ${
                profile.preferred_learning === "reading" ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name="preferred_learning"
                value="reading"
                checked={profile.preferred_learning === "reading"}
                onChange={updateField}
              />
              <span className="learning-style-icon">📖</span>
              <strong>Read and explore</strong>
              <span>Written guides and step-by-step lessons.</span>
            </label>
          </div>

          <label className="profile-field weekly-hours-field">
            <span>How many hours can you learn each week?</span>
            <select
              name="weekly_learning_hours"
              value={profile.weekly_learning_hours}
              onChange={updateField}
            >
              <option value="1">1 hour</option>
              <option value="3">3 hours</option>
              <option value="5">5 hours</option>
              <option value="10">10 hours</option>
              <option value="15">15+ hours</option>
            </select>
          </label>
        </section>

        <section className="profile-form-section">
          <div className="form-section-heading">
            <span className="form-step">05</span>
            <div>
              <h3>What are your goals?</h3>
              <p>Select what you would like RuralRise AI to help you achieve.</p>
            </div>
          </div>

          <div className="profile-choice-grid">
            {goalOptions.map((option) => (
              <label
                key={option}
                className={`profile-choice ${
                  profile.goals.includes(option) ? "selected" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={profile.goals.includes(option)}
                  onChange={() => toggleOption("goals", option)}
                />
                <span className="choice-check">
                  {profile.goals.includes(option) ? "✓" : "+"}
                </span>
                <span>{option}</span>
              </label>
            ))}
          </div>
        </section>

        <div className="profile-submit-area">
          <p>
            Your answers help personalize your journey. You can change them
            whenever you need to.
          </p>
          <button type="submit" className="profile-submit-button" disabled={saving}>
            {saving ? 'Saving to server…' : 'Save my profile'} <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default Profile;
