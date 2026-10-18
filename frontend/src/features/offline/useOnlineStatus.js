import { useEffect, useState } from 'react';

/**
 * true/false from navigator.onLine, updated on the browser's online/offline events.
 * Note: "online" only means the phone has a network connection. It does not
 * prove the RuralRise server is reachable; requests can still fail.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}
