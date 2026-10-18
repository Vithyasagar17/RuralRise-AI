/** Accessible progress bar. When percent is null (total unknown) only the text label is shown. */
export default function ProgressBar({ percent, label }) {
  if (percent == null) return <p className="rr-fac-progress__label">{label}</p>;
  return (
    <div className="rr-fac-progress">
      <div
        className="rr-fac-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={label}
        aria-label={label}
      >
        <div className="rr-fac-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="rr-fac-progress__label">{label}</p>
    </div>
  );
}
