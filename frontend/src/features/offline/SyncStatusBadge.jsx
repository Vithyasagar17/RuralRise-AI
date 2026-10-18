import { useTranslation } from '../i18n/LanguageContext.jsx';

// Text + symbol (never colour alone) so status is clear to everyone.
const VIEW = {
  pending: { symbol: '●', className: 'rr-off-badge--pending', key: 'sync.pending', hintKey: 'sync.pendingHint' },
  syncing: { symbol: '↻', className: 'rr-off-badge--syncing', key: 'sync.syncing', hintKey: null },
  synced: { symbol: '✓', className: 'rr-off-badge--synced', key: 'sync.synced', hintKey: null },
  failed: { symbol: '!', className: 'rr-off-badge--failed', key: 'sync.failed', hintKey: 'sync.failedHint' },
};

/** Shows "Saved locally — waiting to synchronise", "Synced successfully", etc. for one progress record. */
export default function SyncStatusBadge({ record, compact = false }) {
  const { t } = useTranslation();
  if (!record) return null;
  const view = VIEW[record.status] ?? VIEW.pending;
  const permanent = record.status === 'failed' && !record.retryable;
  return (
    <span className={`rr-off-badge ${view.className}`} data-status={record.status}>
      <span aria-hidden="true">{view.symbol}</span> {t(view.key)}
      {!compact && view.hintKey && (
        <span className="rr-off-badge__hint">
          {' '}
          — {t(permanent ? 'sync.failedPermanentHint' : view.hintKey)}
        </span>
      )}
    </span>
  );
}
