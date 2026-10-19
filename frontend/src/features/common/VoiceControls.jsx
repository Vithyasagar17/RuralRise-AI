import { useEffect, useRef, useState } from 'react';

/** Optional progressive enhancement. Every voice action has a text equivalent. */
export function ReadAloud({ text, language = 'en-IN' }) {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const current = useRef(null);
  const supported = typeof window !== 'undefined' && !!window.speechSynthesis && !!window.SpeechSynthesisUtterance;
  useEffect(() => () => { current.current = null; if (supported) window.speechSynthesis.cancel(); }, [supported, text]);
  if (!supported) return <p className="rr-muted">Read aloud is unavailable in this browser. The full lesson text is below.</p>;
  const stop = () => { current.current = null; window.speechSynthesis.cancel(); setSpeaking(false); };
  const read = () => {
    stop(); setError(null);
    const utterance = new window.SpeechSynthesisUtterance(text); current.current = utterance;
    utterance.lang = language; utterance.rate = 0.9;
    utterance.onend = () => { if (current.current === utterance) setSpeaking(false); };
    utterance.onerror = () => { if (current.current === utterance) { setSpeaking(false); setError('Audio could not play. You can continue reading the text.'); } };
    setSpeaking(true); window.speechSynthesis.speak(utterance);
  };
  return <div className="rr-actions"><button type="button" onClick={read} disabled={speaking}>Read lesson aloud</button><button type="button" onClick={stop} disabled={!speaking}>Stop reading</button>{error && <p role="status">{error}</p>}</div>;
}

export function VoiceInput({ onResult, language = 'en-IN' }) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const recognition = useRef(null);
  const callback = useRef(onResult); callback.current = onResult;
  const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  useEffect(() => () => { if (recognition.current) { recognition.current.onresult = null; recognition.current.onend = null; recognition.current.onerror = null; recognition.current.abort(); } }, []);
  const start = () => {
    if (!Constructor) return;
    const instance = new Constructor(); recognition.current = instance;
    instance.lang = language; instance.continuous = false; instance.interimResults = false;
    instance.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript?.trim();
      if (text) { callback.current(text); setMessage('Speech added to the skills field. Check and edit it before saving.'); }
    };
    instance.onend = () => setListening(false);
    instance.onerror = () => { setListening(false); setMessage('Voice input could not finish. Check microphone permission or type your skills.'); };
    try { instance.start(); setListening(true); setMessage('Listening. Speak your skills, then stop.'); }
    catch { setMessage('Voice input is unavailable. Type your skills instead.'); }
  };
  return <div className="rr-notice"><p>Optional voice input uses your browser's microphone service, which may process audio online. Review the text before saving. Typing is always available.</p>{Constructor ? <div className="rr-actions"><button type="button" onClick={start} disabled={listening || navigator.onLine === false}>Speak my skills</button><button type="button" disabled={!listening} onClick={() => recognition.current?.stop()}>Stop microphone</button></div> : <p>Voice input is unavailable in this browser.</p>}<p role="status">{message}</p></div>;
}
