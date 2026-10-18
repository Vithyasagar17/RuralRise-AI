import { useEffect, useRef, useState } from 'react';
import { errorMessageKey } from '../common/apiClient.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { fetchRecommendations } from './facilitatorApi.js';
import { suggestNextSteps } from './facilitatorUtils.js';
import OpportunityShareList from './OpportunityShareList.jsx';
import ProgressBar from './ProgressBar.jsx';

/** Full view of one student: profile, module progress, pathways, next steps and opportunities. */
export default function StudentDetails({
  student,
  summary,
  courses,
  coursesSource,
  opportunities,
  opportunitiesError,
  dataSource,
  fetchImpl,
  onBack,
}) {
  const { t, formatDate } = useTranslation();
  const heading = useRef(null);
  const [recs, setRecs] = useState({ status: 'loading', careers: [], error: null });
  const { profile } = student;

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    let active = true;
    setRecs({ status: 'loading', careers: [], error: null });
    fetchRecommendations(profile, { fetchImpl, source: dataSource })
      .then((careers) => active && setRecs({ status: 'ready', careers, error: null }))
      .catch((error) => active && setRecs({ status: 'error', careers: [], error }));
    return () => {
      active = false;
    };
  }, [profile, fetchImpl, dataSource]);

  const steps = suggestNextSteps({ student, courses, recommendations: recs.status === 'ready' ? recs.careers : null });
  const progressByCourse = new Map(student.progress.map((r) => [r.course_id, r]));
  const knownIds = new Set(courses.map((c) => c.id));
  const unknownProgress = student.progress.filter((r) => !knownIds.has(r.course_id));
  const progressLabel =
    summary.percent == null
      ? t('progress.countOnly', { done: summary.completedCount })
      : t('progress.countOfTotal', { done: summary.completedCount, total: summary.totalCourses, percent: summary.percent });

  const facts = [
    ['student.education', profile.education_level],
    ['student.location', profile.location],
    ['student.language', profile.language],
    ['student.learningStyle', profile.preferred_learning],
    ['student.weeklyHours', profile.weekly_learning_hours != null ? t('student.hoursValue', { hours: profile.weekly_learning_hours }) : null],
    ['student.interests', profile.interests.join(', ')],
    ['student.skills', profile.skills.join(', ')],
    ['student.goals', profile.goals.join(', ')],
  ];

  return (
    <article className="rr-fac-details" aria-labelledby="rr-fac-details-title">
      <button type="button" className="rr5-btn rr5-btn--secondary" onClick={onBack}>
        ← {t('details.back')}
      </button>
      <h2 id="rr-fac-details-title" ref={heading} tabIndex={-1} className="rr-fac-details__title">
        {profile.name}
      </h2>
      <p className="rr-fac-card__id">
        {t('student.id')}: <code>{student.student_id}</code>
      </p>
      {student.warnings?.length > 0 && (
        <div className="rr5-notice rr5-notice--warn">
          <p>{t('student.missingDetails')}</p>
        </div>
      )}

      <section className="rr-fac-section" aria-labelledby="rr-fac-profile">
        <h3 id="rr-fac-profile">{t('details.profile')}</h3>
        <dl className="rr-fac-facts">
          {facts.map(([key, value]) => (
            <div key={key}>
              <dt>{t(key)}</dt>
              <dd>{value || t('common.notProvided')}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rr-fac-section" aria-labelledby="rr-fac-progress">
        <h3 id="rr-fac-progress">{t('details.progress')}</h3>
        <ProgressBar percent={summary.percent} label={progressLabel} />
        {summary.averageScore != null && <p>{t('progress.averageScore', { score: summary.averageScore })}</p>}
        {coursesSource === 'device' && <p className="rr-fac-note">{t('fac.coursesFromDevice')}</p>}
        {courses.length > 0 ? (
          <ul className="rr-fac-modules">
            {courses.map((course) => {
              const record = progressByCourse.get(course.id);
              const done = record?.completed === true;
              return (
                <li key={course.id} className={`rr-fac-module ${done ? 'rr-fac-module--done' : ''}`}>
                  <span className="rr-fac-module__icon" aria-hidden="true">
                    {done ? '✓' : '○'}
                  </span>
                  <span className="rr-fac-module__text">
                    <strong>{course.title}</strong>
                    <span className="rr-fac-module__meta">
                      {done ? t('module.completed') : record ? t('module.startedNotComplete') : t('module.notStarted')}
                      {record?.score != null && ` · ${t('module.score', { score: record.score })}`}
                      {record?.updated_at && ` · ${formatDate(record.updated_at)}`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rr-fac-note">{t('fac.coursesUnavailable')}</p>
        )}
        {unknownProgress.length > 0 && courses.length > 0 && (
          <p className="rr-fac-note">{t('details.unknownModules', { count: unknownProgress.length })}</p>
        )}
      </section>

      <section className="rr-fac-section" aria-labelledby="rr-fac-pathways">
        <h3 id="rr-fac-pathways">{t('details.pathways')}</h3>
        {recs.status === 'loading' && <p role="status">{t('details.pathwaysLoading')}</p>}
        {recs.status === 'error' && (
          <div className="rr5-notice rr5-notice--warn">
            <p>{t('details.pathwaysError')}</p>
            <p>{t(errorMessageKey(recs.error))}</p>
          </div>
        )}
        {recs.status === 'ready' && recs.careers.length === 0 && <p>{t('details.pathwaysNone')}</p>}
        {recs.status === 'ready' && recs.careers.length > 0 && (
          <>
            <ul className="rr-fac-pathways">
              {recs.careers.map((career) => (
                <li key={career.career_id} className="rr-fac-pathway">
                  <strong>{career.title}</strong>
                  {career.match_score != null && (
                    <span className="rr-fac-pathway__score"> · {t('details.matchScore', { score: career.match_score })}</span>
                  )}
                  {career.reasons.length > 0 && <p className="rr-fac-pathway__reasons">{career.reasons.join(' ')}</p>}
                  {career.missing_skills.length > 0 && (
                    <p>
                      {t('details.skillsToBuild')}: {career.missing_skills.join(', ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <p className="rr-fac-note">{t('details.pathwaysSourceNote')}</p>
          </>
        )}
      </section>

      <section className="rr-fac-section" aria-labelledby="rr-fac-next">
        <h3 id="rr-fac-next">{t('details.nextSteps')}</h3>
        <ol className="rr-fac-steps">
          {steps.map((step, i) => (
            <li key={i}>{step.key ? t(step.key, step.vars) : step.text}</li>
          ))}
        </ol>
        <p className="rr-fac-note">{t('details.nextStepsNote')}</p>
      </section>

      <section className="rr-fac-section" aria-labelledby="rr-fac-opps">
        <h3 id="rr-fac-opps">{t('details.opportunities')}</h3>
        <OpportunityShareList opportunities={opportunities} profile={profile} error={opportunitiesError} />
      </section>

      <button type="button" className="rr5-btn rr5-btn--secondary" onClick={onBack}>
        ← {t('details.back')}
      </button>
    </article>
  );
}
