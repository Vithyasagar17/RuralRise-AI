import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useOfflineReady } from './pwaStatus.js';
import { useOnlineStatus } from './useOnlineStatus.js';
import '../common/tokens.css';
import './offline.css';

/**
 * App-wide connection notice. Place it once, near the top of the app shell.
 * Offline: explains what still works and what needs the internet.
 */
export default function OfflineBanner() {
  const { t } = useTranslation();
  const online = useOnlineStatus();
  const offlineReady = useOfflineReady();

  return (
    <div className="rr-off-banner" role="status" aria-live="polite">
      {!online ? (
        <div className="rr5-notice rr5-notice--warn">
          <p><strong>{t('banner.offlineTitle')}</strong></p>
          <p>{t('banner.offlineWorks')}</p>
          <p>{t('banner.offlineNeedsInternet')}</p>
          <p>{t('banner.voiceNote')}</p>
        </div>
      ) : (
        offlineReady && <p className="rr-off-banner__ready">✓ {t('banner.offlineReady')}</p>
      )}
    </div>
  );
}
