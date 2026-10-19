import { useEffect, useState } from 'react';
import { useStudent } from '../features/student/StudentContext.jsx';
import { useProgressSync } from '../features/offline/useProgressSync.js';
import { loadOwnProgress } from '../services/api.js';
export default function Dashboard({ onNavigate = () => {} }) {
  const { student, secure } = useStudent();
  const { records } = useProgressSync({ studentId: student?.student_id, autoSync: !!student });
  const [serverProgress, setServerProgress] = useState([]);
  const [readError, setReadError] = useState(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; setServerProgress([]); setReadError(null);
    if (secure && student) loadOwnProgress().then((data) => { if (active) setServerProgress(data.progress); }).catch(() => { if (active) setReadError('Server progress could not be loaded. The count below uses records available on this device.'); });
    return () => { active = false; };
  }, [secure, student, retry]);
  const progress = new Map(serverProgress.map((row) => [row.course_id, row]));
  records.forEach((row) => progress.set(row.payload.course_id, row.payload));
  const completed = [...progress.values()].filter((row) => row.completed).length;
  return <div className="dashboard-page"><section className="welcome-section"><p className="eyebrow">YOUR JOURNEY STARTS HERE</p><h2>{student ? `Welcome, ${student.profile.name}` : 'Small steps. Bigger opportunities.'}</h2><p>{student ? `${student.profile.education_level} · ${student.profile.location} · ${student.profile.weekly_learning_hours} hours per week` : 'Save your interests and goals to begin your own learning journey.'}</p></section>
    {readError && <p className="rr-notice" role="status">{readError} <button type="button" onClick={() => setRetry((n) => n + 1)}>Retry server progress</button></p>}
    {student && <div className="rr-notice"><strong>{completed} {completed === 1 ? 'lesson' : 'lessons'} marked complete</strong><p>Based on available records. Pending local changes are included; open lessons to see synchronization status.</p><p>Student ID: {student.student_id}</p></div>}
    <section className="dashboard-section"><h2>Your next steps</h2><div className="quick-actions">{[
      ['profile', student ? 'Update my profile' : 'Create my profile', 'Tell us your interests, skills and goals.'],
      ['recommendations', 'Explore career options', 'See rankings based on your saved profile.'],
      ['learning', 'Build a new skill', 'Choose a pathway, read lessons and complete practical tasks.'],
      ['opportunities', 'Find opportunities', 'Review sourced training and scholarship listings.'],
    ].map(([page, title, description]) => <article className="action-card" key={page}><h3>{title}</h3><p>{description}</p><button type="button" onClick={() => onNavigate(page)}>Open {title.toLowerCase()}</button></article>)}</div></section></div>;
}
