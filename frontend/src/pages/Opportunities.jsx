import { useCallback, useEffect, useState } from 'react';
import { loadOpportunities } from '../services/api.js';
import { useStudent } from '../features/student/StudentContext.jsx';
import StatusPanel from '../features/common/StatusPanel.jsx';
import Modal from '../features/common/Modal.jsx';
const safeLink = (value) => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; } };
export default function Opportunities() {
  const { student } = useStudent();
  const [filters, setFilters] = useState({ category: '', education_level: '', location: '', search: '' });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [retry, setRetry] = useState(0);
  const close = useCallback(() => setSelected(null), []);
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    const timer = setTimeout(async () => {
      setLoading(true); setError(null);
      try { const data = await loadOpportunities(filters, { signal: controller.signal }); if (current) setRows(data); }
      catch (failure) { if (current) { setError(failure.message); setRows([]); } }
      finally { if (current) setLoading(false); }
    }, 180);
    return () => { current = false; controller.abort(); clearTimeout(timer); };
  }, [filters, retry]);
  const update = (event) => setFilters((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  return <div className="opportunities-page">
    <section className="opportunities-hero"><div><span className="opportunities-eyebrow">TAKE YOUR NEXT STEP</span><h2>Find training, apprenticeships and scholarships</h2><p>Listings come from the server catalog. A search match does not establish eligibility or a currently open application.</p></div></section>
    <section className="rr-filter-grid" aria-label="Opportunity filters">
      <label>Search opportunities<input name="search" type="search" value={filters.search} onChange={update} /></label>
      <label>Category<select name="category" value={filters.category} onChange={update}><option value="">All categories</option><option value="training">Training</option><option value="apprenticeship">Apprenticeship</option><option value="scholarship">Scholarship</option></select></label>
      <label>Education level<select name="education_level" value={filters.education_level} onChange={update}><option value="">Any recorded education</option>{['Class 8', 'Class 10', 'Class 12', 'Diploma', 'Undergraduate', 'Graduate'].map((v) => <option key={v}>{v}</option>)}</select></label>
      <label>State or region<input name="location" value={filters.location} onChange={update} placeholder="e.g. Tamil Nadu" /></label>
    </section>
    <div className="rr-actions"><button type="button" onClick={() => setFilters({ category: '', education_level: student?.profile.education_level || '', location: student?.profile.location || '', search: '' })} disabled={!student}>Use my profile filters</button><button type="button" onClick={() => setFilters({ category: '', education_level: '', location: '', search: '' })}>Clear filters</button></div>
    <StatusPanel loading={loading} error={error} onRetry={() => setRetry((n) => n + 1)}>
      <p role="status">{rows.length} listings found</p><div className="rr-card-grid">{rows.map((row) => <article className="rr-card" key={row.id}>
        <span>{row.category}</span><h3>{row.title}</h3><p>{row.description}</p><p><strong>Location:</strong> {row.locations.join(', ') || 'Not recorded'}</p>
        <p><strong>Deadline:</strong> {row.deadline || 'Not verified'}</p><p><strong>Source check recorded:</strong> {row.last_verified || 'Not verified'}</p>
        <button type="button" onClick={() => setSelected(row)}>View details: {row.title}</button>
      </article>)}</div>
      {!rows.length && !loading && <p className="rr-notice">No listings match these filters. Records without an education tag are excluded by education filters; try clearing that filter and check the official requirements.</p>}
    </StatusPanel>
    {selected && <Modal title={selected.title} onClose={close}><p>{selected.description}</p><h3>Recorded requirements</h3><ul>{selected.eligibility_requirements.map((v) => <li key={v}>{v}</li>)}</ul><p>Education tags: {selected.education_levels.join(', ') || 'Not recorded; verify with provider'}</p><p>Deadline: {selected.deadline || 'Not verified'}</p><p>Source: {selected.source_name || 'Not verified'}</p><p>Source check recorded: {selected.last_verified || 'Not verified'}</p><p>Confirm eligibility, availability and deadlines with the official provider before applying or paying.</p>{safeLink(selected.official_url) ? <a href={safeLink(selected.official_url)} target="_blank" rel="noopener noreferrer">Open official source</a> : <p>Official link: Not verified</p>}</Modal>}
  </div>;
}
