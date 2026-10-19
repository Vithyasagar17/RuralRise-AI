import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, configureRequestAuth, getApiBaseUrl } from '../common/apiClient.js';
import { getAccessToken, getAuthMode, getSessionIdentity, refreshAccessToken, subscribeSession, signOut } from '../../services/authClient.js';
import * as api from '../../services/api.js';

const StudentContext = createContext(null);
const isSecure = () => getAuthMode() === 'supabase';
configureRequestAuth(isSecure() ? { token: getAccessToken, refresh: refreshAccessToken, identity: getSessionIdentity } : null);
const keyFor = (identity) => `ruralrise-student:${getApiBaseUrl()}:${identity}`;
const careerKey = (identity) => `${keyFor(identity)}:career`;
const accountKey = (identity) => `${keyFor(identity)}:account`;
const storage = () => isSecure() ? sessionStorage : localStorage;
function stored(identity) {
  if (!identity) return null;
  try { return JSON.parse(storage().getItem(keyFor(identity)) || 'null'); } catch { return null; }
}

export function StudentProvider({ children }) {
  const [identity, setIdentity] = useState(getSessionIdentity);
  const [account, setAccount] = useState(null);
  const [student, setStudent] = useState(() => stored(getSessionIdentity()));
  const [careers, setCareers] = useState([]);
  const [selectedCareer, setCareer] = useState(null);
  const [offlineAccount, setOfflineAccount] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(isSecure() && !!identity);
  const [sessionTick, setSessionTick] = useState(0);
  useEffect(() => subscribeSession(() => { setIdentity(getSessionIdentity()); setSessionTick((n) => n + 1); }), []);
  useEffect(() => {
    let active = true;
    setAccount(null); setCareers([]); setCareer(null); setError(null); setOfflineAccount(false);
    try { if (identity) setCareer(JSON.parse(storage().getItem(careerKey(identity)) || 'null')); } catch { /* no saved career */ }
    setStudent(stored(identity));
    if (!isSecure() || !identity) { setLoading(false); return () => { active = false; }; }
    setLoading(true);
    (async () => {
      try {
        const next = await api.loadAccount();
        if (!active) return;
        setAccount(next);
        try { sessionStorage.setItem(accountKey(identity), JSON.stringify(next)); } catch { /* verification still succeeded */ }
        if (next.role === 'student') {
          try {
            const saved = await api.loadOwnProfile();
            if (active) { setStudent(saved); storage().setItem(keyFor(identity), JSON.stringify(saved)); }
          } catch (failure) {
            if (!(failure instanceof ApiError && failure.status === 404)) throw failure;
            if (active) { setStudent(null); storage().removeItem(keyFor(identity)); }
          }
        } else if (active) setStudent(null);
      } catch (failure) {
        if (active) {
          let cached = null;
          try { cached = JSON.parse(sessionStorage.getItem(accountKey(identity)) || 'null'); } catch { /* none */ }
          if (failure instanceof ApiError && failure.retryable && cached?.user_id === identity && cached.role === 'student') {
            setAccount(cached); setOfflineAccount(true);
          } else { setError(failure.message); setStudent(null); setAccount(null); }
        }
      }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [identity]);
  const save = useCallback(async (profile) => {
    const owner = getSessionIdentity();
    const result = await api.saveProfile(profile);
    if (getSessionIdentity() !== owner) throw new Error('The active account changed. Save again after signing in.');
    // The successful server response is authoritative; storage failure must not imply failed backend persistence.
    setStudent(result); setCareers([]); setCareer(null);
    try { storage().removeItem(careerKey(owner)); } catch { /* no saved career */ }
    try { storage().setItem(keyFor(owner), JSON.stringify(result)); } catch { /* current session still works */ }
    return result;
  }, []);
  const refreshCareers = useCallback(async () => {
    if (!student?.profile) return [];
    const owner = getSessionIdentity();
    const result = await api.recommend(student.profile);
    if (owner === getSessionIdentity()) setCareers(result.careers);
    return result.careers;
  }, [student]);
  const setSelectedCareer = useCallback((career) => {
    setCareer(career);
    try { storage().setItem(careerKey(getSessionIdentity()), JSON.stringify(career)); } catch { /* memory still works */ }
  }, []);
  const logout = useCallback(async () => {
    const owner = getSessionIdentity();
    if (owner) { try { storage().removeItem(keyFor(owner)); storage().removeItem(careerKey(owner)); sessionStorage.removeItem(accountKey(owner)); } catch { /* no persistent profile */ } }
    setStudent(null); setCareers([]); setCareer(null); setAccount(null);
    await signOut();
  }, []);
  const value = useMemo(() => ({ secure: isSecure(), identity, account, student, careers, selectedCareer,
    setSelectedCareer, save, refreshCareers, logout, loading, error, sessionTick, offlineAccount }),
    [identity, account, student, careers, selectedCareer, setSelectedCareer, save, refreshCareers, logout, loading, error, sessionTick, offlineAccount]);
  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}
export const useStudent = () => useContext(StudentContext);
