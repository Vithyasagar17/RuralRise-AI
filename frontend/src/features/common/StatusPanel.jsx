export default function StatusPanel({ error, loading, children, onRetry }) {
  if (loading) return <p role="status" className="rr-notice">Loading from the server…</p>;
  if (error) return <div role="alert" className="rr-error"><p>{error}</p>{onRetry && <button type="button" onClick={onRetry}>Try again</button>}</div>;
  return children;
}
