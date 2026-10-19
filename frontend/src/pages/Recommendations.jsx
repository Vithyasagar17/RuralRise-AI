import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStudent } from '../features/student/StudentContext.jsx';
import Modal from '../features/common/Modal.jsx';
import StatusPanel from '../features/common/StatusPanel.jsx';
export default function Recommendations({ onNavigate = () => {} }) {
  const session = useStudent();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const close = useCallback(() => setSelected(null), []);
  const load = useCallback(async () => {
    setError(null); setLoading(true);
    try { await session.refreshCareers(); } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }, [session.refreshCareers]);
  useEffect(() => { if (session.student?.profile) load(); }, [load, session.student?.profile]);
  const filtered = useMemo(() => session.careers.filter((c) => [c.title, ...c.reasons, ...c.missing_skills].join(' ').toLowerCase().includes(search.toLowerCase())), [session.careers, search]);
  if (!session.student) return <div className="rr-notice"><h2>Start with your profile</h2><p>Save your interests and goals to receive profile-based career recommendations.</p><button onClick={() => onNavigate('profile')}>Create my profile</button></div>;
  const choose = (career) => { session.setSelectedCareer(career); onNavigate('learning'); };
  return <div className="recommendations-page">
    <section className="recommendations-hero"><div><span className="recommendations-kicker">YOUR POSSIBILITIES</span><h2>Career paths for {session.student.profile.name}</h2><p>Ranked from your saved interests, skills and goals. Scores are rule-based fit indicators out of 100, not employment probabilities.</p></div></section>
    <p className="rr-notice">Career and learning content is prototype guidance. Verify training requirements with the actual provider before enrolling.</p>
    <div className="recommendations-toolbar"><label className="recommendations-search">Search recommended careers<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} /></label><button type="button" onClick={load} disabled={loading}>Refresh recommendations</button></div>
    <StatusPanel error={error} loading={loading} onRetry={load}>
      <div className="recommendations-grid">{filtered.map((career) => <article className="recommendation-card" key={career.career_id}>
        <span className="recommendation-category">Profile-based pathway</span><h3>{career.title}</h3>
        <div className="recommendation-match"><strong>{career.match_score}/100 fit</strong><progress value={career.match_score} max="100" aria-label={`Fit score for ${career.title}`} /></div>
        <h4>Why this pathway?</h4><ul>{career.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        <div className="rr-actions"><button type="button" onClick={() => setSelected(career)}>Explore {career.title}</button><button type="button" onClick={() => choose(career)}>View learning plan</button></div>
      </article>)}</div>
      {!filtered.length && <p className="rr-notice">No matching careers were returned. Try a different search or update your profile with more specific interests and skills.</p>}
    </StatusPanel>
    {selected && <Modal title={selected.title} onClose={close}><h3>Skills to develop</h3>{selected.missing_skills.length ? <ul>{selected.missing_skills.map((skill) => <li key={skill}>{skill}</li>)}</ul> : <p>No additional skill gaps were recorded. This does not certify mastery.</p>}<h3>Next steps</h3><ol>{selected.next_steps.map((step) => <li key={step}>{step}</li>)}</ol><button type="button" onClick={() => choose(selected)}>View learning plan</button></Modal>}
  </div>;
}
