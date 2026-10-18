import { useState } from 'react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { opportunityRelevance, sortOpportunitiesForStudent } from './facilitatorUtils.js';

function buildShareText(opportunity, t) {
  const lines = [opportunity.title, opportunity.description];
  if (opportunity.deadline) lines.push(`${t('opp.deadline')}: ${opportunity.deadline}`);
  if (opportunity.official_url) lines.push(opportunity.official_url);
  lines.push(t('opp.shareDisclaimer'));
  return lines.filter(Boolean).join('\n');
}

/**
 * Opportunities a facilitator may share. Never invents links, deadlines or
 * eligibility: missing values are shown as "not verified".
 * Pass `profile` to sort items whose tags mention the student first.
 */
export default function OpportunityShareList({ opportunities, profile, error }) {
  const { t, formatDate } = useTranslation();
  const [shareStatus, setShareStatus] = useState({ id: null, message: '', manualText: '' });

  const share = async (opportunity) => {
    const text = buildShareText(opportunity, t);
    try {
      if (navigator.share) {
        await navigator.share({ title: opportunity.title, text });
        setShareStatus({ id: opportunity.id, message: t('opp.shared'), manualText: '' });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setShareStatus({ id: opportunity.id, message: t('opp.copied'), manualText: '' });
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return; // user closed the share sheet
    }
    // No share or clipboard support: show the text so it can be copied by hand.
    setShareStatus({ id: opportunity.id, message: t('opp.copyManually'), manualText: text });
  };

  if (error) {
    return (
      <div className="rr5-notice rr5-notice--warn">
        <p>{t('opp.unavailable')}</p>
      </div>
    );
  }
  if (!opportunities.length) return <p className="rr-fac-empty">{t('opp.none')}</p>;

  const list = profile ? sortOpportunitiesForStudent(opportunities, profile) : opportunities;

  return (
    <>
      <div className="rr5-notice rr5-notice--warn">
        <p>{t('opp.verifyWarning')}</p>
      </div>
      <ul className="rr-fac-opps">
        {list.map((o) => {
          const relevance = profile ? opportunityRelevance(o, profile) : null;
          return (
            <li key={o.id} className="rr-fac-opp">
              <h4 className="rr-fac-opp__title">{o.title}</h4>
              {o.category && <p className="rr-fac-opp__cat">{o.category}</p>}
              <p>{o.description}</p>
              {relevance && (
                <ul className="rr-fac-opp__tags" aria-label={t('opp.relevanceLabel')}>
                  <li>{t(`opp.edu.${relevance.education}`, { value: profile.education_level ?? '' })}</li>
                  <li>{t(`opp.loc.${relevance.location}`, { value: profile.location ?? '' })}</li>
                </ul>
              )}
              <dl className="rr-fac-opp__facts">
                <div>
                  <dt>{t('opp.deadline')}</dt>
                  <dd>{o.deadline ?? t('opp.notVerified')}</dd>
                </div>
                <div>
                  <dt>{t('opp.officialLink')}</dt>
                  <dd>
                    {o.official_url ? (
                      <a href={o.official_url} target="_blank" rel="noopener noreferrer">
                        {o.official_url}
                      </a>
                    ) : (
                      t('opp.noLink')
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t('opp.source')}</dt>
                  <dd>{o.source_name || t('common.notProvided')}</dd>
                </div>
                <div>
                  <dt>{t('opp.lastVerified')}</dt>
                  <dd>{o.last_verified ? formatDate(o.last_verified) ?? o.last_verified : t('opp.notVerified')}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="rr5-btn rr5-btn--secondary"
                onClick={() => share(o)}
                aria-label={t('opp.shareNamed', { title: o.title })}
              >
                {t('opp.share')}
              </button>
              <div aria-live="polite">
                {shareStatus.id === o.id && shareStatus.message && <p className="rr-fac-opp__status">{shareStatus.message}</p>}
                {shareStatus.id === o.id && shareStatus.manualText && (
                  <textarea
                    className="rr-fac-opp__manual rr5-focusable"
                    readOnly
                    value={shareStatus.manualText}
                    aria-label={t('opp.copyManually')}
                    rows={5}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
