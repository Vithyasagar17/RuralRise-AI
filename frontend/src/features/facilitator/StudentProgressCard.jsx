import { useTranslation } from '../i18n/LanguageContext.jsx';
import ProgressBar from './ProgressBar.jsx';

const STATUS_VIEW = {
  'not-started': { symbol: '○', key: 'status.notStarted' },
  'in-progress': { symbol: '◐', key: 'status.inProgress' },
  completed: { symbol: '✓', key: 'status.completed' },
};

/** One student summary card in the list. */
export default function StudentProgressCard({ student, summary, onSelect }) {
  const { t, formatDate } = useTranslation();
  const { profile } = student;
  const status = STATUS_VIEW[summary.status];
  const progressLabel =
    summary.percent == null
      ? t('progress.countOnly', { done: summary.completedCount })
      : t('progress.countOfTotal', { done: summary.completedCount, total: summary.totalCourses, percent: summary.percent });

  return (
    <article className="rr-fac-card" aria-labelledby={`rr-fac-card-${student.student_id}`}>
      <div className="rr-fac-card__head">
        <h3 id={`rr-fac-card-${student.student_id}`} className="rr-fac-card__name">
          {profile.name}
        </h3>
        <span className={`rr-fac-status rr-fac-status--${summary.status}`}>
          <span aria-hidden="true">{status.symbol}</span> {t(status.key)}
        </span>
      </div>
      <p className="rr-fac-card__id">
        {t('student.id')}: <code>{student.student_id}</code>
      </p>
      <dl className="rr-fac-card__facts">
        <div>
          <dt>{t('student.education')}</dt>
          <dd>{profile.education_level ?? t('common.notProvided')}</dd>
        </div>
        <div>
          <dt>{t('student.interests')}</dt>
          <dd>{profile.interests.length ? profile.interests.join(', ') : t('common.notProvided')}</dd>
        </div>
      </dl>
      <ProgressBar percent={summary.percent} label={progressLabel} />
      <p className="rr-fac-card__activity">
        {summary.lastActivity
          ? t('progress.lastActivity', { date: formatDate(summary.lastActivity) })
          : t('progress.noActivity')}
      </p>
      {student.warnings?.length > 0 && <p className="rr-fac-card__warn">⚠ {t('student.missingDetails')}</p>}
      <button
        type="button"
        className="rr5-btn rr-fac-card__btn"
        onClick={(event) => onSelect(student.student_id, event.currentTarget)}
        aria-label={t('student.viewDetailsFor', { name: profile.name })}
      >
        {t('student.viewDetails')}
      </button>
    </article>
  );
}
