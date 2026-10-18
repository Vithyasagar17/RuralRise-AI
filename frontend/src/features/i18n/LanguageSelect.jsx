import { useTranslation } from './LanguageContext.jsx';
import '../common/tokens.css';

/** Labelled language dropdown. Shows a visible notice when a translation is not yet reviewed. */
export default function LanguageSelect({ id = 'rr5-language' }) {
  const { t, language, setLanguage, languages, isReviewed } = useTranslation();
  return (
    <div className="rr5-language">
      <label htmlFor={id}>{t('lang.label')}</label>{' '}
      <select
        id={id}
        className="rr5-focusable"
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      {!isReviewed && (
        <p className="rr5-language__draft" role="note">
          {t('lang.draftNotice')}
        </p>
      )}
    </div>
  );
}
