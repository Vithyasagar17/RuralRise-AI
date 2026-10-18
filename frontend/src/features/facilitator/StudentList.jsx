import { useTranslation } from '../i18n/LanguageContext.jsx';
import StudentProgressCard from './StudentProgressCard.jsx';

/** Responsive list of student cards (1 column on phones, more on wider screens). */
export default function StudentList({ students, summaries, onSelect }) {
  const { t } = useTranslation();
  if (!students.length) {
    return <p className="rr-fac-empty">{t('fac.noMatches')}</p>;
  }
  return (
    <ul className="rr-fac-list" aria-label={t('fac.studentListLabel')}>
      {students.map((student) => (
        <li key={student.student_id}>
          <StudentProgressCard student={student} summary={summaries.get(student.student_id)} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}
