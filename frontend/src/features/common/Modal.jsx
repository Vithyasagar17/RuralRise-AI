import { useEffect, useRef } from 'react';
export default function Modal({ title, onClose, children }) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const focusables = () => Array.from(panel.current?.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]') || []).filter((el) => !el.disabled);
    (focusables()[0] || panel.current)?.focus();
    const handle = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const elements = focusables();
        if (!elements.length) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0].focus(); }
      }
    };
    document.addEventListener('keydown', handle);
    return () => { document.removeEventListener('keydown', handle); previous?.focus?.(); };
  }, [onClose]);
  return <div className="rr-dialog-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={panel} tabIndex={-1} className="rr-dialog" role="dialog" aria-modal="true" aria-labelledby="rr-dialog-title"><button type="button" className="rr-dialog-close" onClick={onClose} aria-label="Close details">Close</button><h2 id="rr-dialog-title">{title}</h2>{children}</section></div>;
}
