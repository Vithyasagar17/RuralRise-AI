import { useCallback, useEffect, useState } from 'react';
import { useStudent } from '../features/student/StudentContext.jsx';
import { getLearningPlan } from '../features/offline/roadmapStore.js';
import { useProgressSync } from '../features/offline/useProgressSync.js';
import OfflineLessons from '../features/offline/OfflineLessons.jsx';
import StatusPanel from '../features/common/StatusPanel.jsx';

export default function Learning({ onNavigate = () => {} }) {
  const { student, selectedCareer } = useStudent();
  const [state, setState] = useState({ loading: true, plan: null, error: null });
  const [openId, setOpenId] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const { records } = useProgressSync({ studentId: student?.student_id, autoSync: !!student });
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => {
    let active = true; setOpenId(null);
    if (!student || !selectedCareer) return () => { active = false; };
    setState({ loading: true, plan: null, error: null });
    getLearningPlan(student, selectedCareer.career_id).then((result) => {
      if (active) setState({ loading: false, error: null, ...result });
    }).catch((error) => { if (active) setState({ loading: false, plan: null, error: error.message }); });
    return () => { active = false; };
  }, [student, selectedCareer, attempt]);
  if (!student) return <div className="rr-notice"><p>Save your profile to create a learning roadmap.</p><button type="button" onClick={() => onNavigate('profile')}>Create my profile</button></div>;
  if (!selectedCareer) return <div className="rr-notice"><p>Choose a career from your recommendations to see its learning plan.</p><button type="button" onClick={() => onNavigate('recommendations')}>Choose a career</button></div>;
  const plan = state.plan;
  const completedIds = new Set(records.filter((row) => row.payload.completed).map((row) => row.payload.course_id));
  const done = plan?.modules.filter((module) => completedIds.has(module.module_id)).length ?? 0;
  return <div className="learning-page"><section className="learning-hero"><div><p className="eyebrow">YOUR LEARNING PATHWAY</p><h2>{selectedCareer.title}</h2><p>Based on {student.profile.weekly_learning_hours} learning hours per week. Practice at your own pace.</p><button type="button" onClick={() => onNavigate('recommendations')}>Change career</button></div></section>
    <StatusPanel loading={state.loading} error={state.error} onRetry={retry}>
      {plan && <>
        <p className="rr-notice">{state.source === 'device' ? 'Saved plan from this device. Reconnect to refresh it.' : state.saved ? 'Plan saved on this device for offline reading.' : 'This plan could not be saved for offline reading.'} These are prototype practice worksheets. Completion is self-reported, without certification.</p>
        <section className="learning-progress-card"><h2>{done} of {plan.modules.length} modules marked complete</h2><p>Estimated learning time: {plan.estimated_learning_time.total_hours} hours across approximately {plan.estimated_learning_time.estimated_weeks} weeks.</p><progress aria-label="Pathway completion" max={plan.modules.length || 1} value={done} /></section>
        <section><h2>Your modules</h2><div className="rr-card-grid">{plan.modules.map((module, index) => <article className="rr-card" key={module.module_id}><p className="eyebrow">MODULE {index + 1} · {module.estimated_hours} HOURS</p><h3>{module.title}</h3><p>{module.description}</p><p><strong>Practice:</strong> {module.practical_task}</p><p><strong>Self-check:</strong> {module.completion_criteria}</p>{completedIds.has(module.module_id) && <p>Marked complete</p>}<button type="button" onClick={() => setOpenId(module.module_id)}>Read {module.title}</button></article>)}</div></section>
        <details><summary>Weekly learning plan</summary>{plan.weekly_plan.map((week) => <article key={week.week}><h3>Week {week.week} · {week.planned_hours} hours</h3><ul>{week.items.map((item) => <li key={item.module_id}>{item.title}: {item.hours_this_week} hours{item.continues_next_week ? ' (continues next week)' : ''}</li>)}</ul></article>)}</details>
        {plan.warnings.length > 0 && <ul>{plan.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
        {openId && <section className="rr-card" aria-label="Selected lesson"><button type="button" onClick={() => setOpenId(null)}>Close lesson reader</button><OfflineLessons key={`${student.student_id}:${openId}`} studentId={student.student_id} studentName={student.profile.name} initialCourseId={openId} courseIds={plan.modules.map((module) => module.module_id)} /></section>}
        <p>Open a lesson while online to download the lesson catalog for offline use.</p>
      </>}
    </StatusPanel>
  </div>;
}
