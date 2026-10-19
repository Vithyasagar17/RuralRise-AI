// Supabase Auth REST client. No database/service-role credential belongs here.
import { getApiBaseUrl } from '../features/common/apiClient.js';

const changes = new EventTarget();
let refreshFlight = null;
let revision = 0;
export const getAuthMode = () => import.meta.env?.VITE_AUTH_MODE || 'demo';
const storageKey = () => `ruralrise-session:${getApiBaseUrl()}:${import.meta.env?.VITE_SUPABASE_URL || ''}`;

export function getSession() {
  try { return JSON.parse(sessionStorage.getItem(storageKey()) || 'null'); } catch { return null; }
}
export const getSessionIdentity = () => getAuthMode() === 'demo' ? 'demo' : getSession()?.user?.id || null;
export const getSessionRevision = () => revision;
export function subscribeSession(listener) {
  changes.addEventListener('change', listener);
  return () => changes.removeEventListener('change', listener);
}
function saveSession(value) {
  if (value) sessionStorage.setItem(storageKey(), JSON.stringify(value));
  else sessionStorage.removeItem(storageKey());
  revision += 1;
  changes.dispatchEvent(new Event('change'));
}
function configuration() {
  const raw = import.meta.env?.VITE_SUPABASE_URL || '';
  const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  let url;
  try { url = new URL(raw); } catch { throw new Error('Configure the Supabase project URL and publishable key before signing in.'); }
  if (url.protocol !== 'https:' || url.username || url.password || !['', '/'].includes(url.pathname) || url.search || url.hash || !key || key.startsWith('sb_secret_')) {
    throw new Error('Use an HTTPS Supabase project URL and its public publishable key.');
  }
  return { url: url.origin, key };
}
async function authRequest(path, body, token) {
  const config = configuration();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let response;
  try {
    response = await fetch(`${config.url}/auth/v1${path}`, {
      method: 'POST', headers: { apikey: config.key, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal,
    });
  } catch {
    const error = new Error('Cannot reach the sign-in service. Reconnect and try again.');
    error.retryable = true;
    throw error;
  } finally { clearTimeout(timer); }
  let data = null;
  if (response.status !== 204) { try { data = await response.json(); } catch { /* handled below */ } }
  if (!response.ok) {
    const error = new Error(response.status === 429 ? 'Too many sign-in attempts. Please wait and try again.' : 'Sign-in could not be completed. Check your details and account confirmation.');
    error.status = response.status;
    error.retryable = response.status >= 500 || response.status === 429;
    throw error;
  }
  return data;
}
function normalizedSession(data) {
  if (!data?.access_token || !data?.refresh_token || typeof data?.user?.id !== 'string') throw new Error('The sign-in service returned an invalid session.');
  const expiresIn = Number(data.expires_in);
  return { access_token: data.access_token, refresh_token: data.refresh_token, user: { id: data.user.id, email: data.user.email || '' },
    expires_at: Number(data.expires_at) || Math.floor(Date.now() / 1000) + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600) };
}
export async function signIn(email, password) {
  const data = await authRequest('/token?grant_type=password', { email: email.trim(), password });
  const session = normalizedSession(data); saveSession(session); return session;
}
export async function signUp(email, password) {
  const data = await authRequest('/signup', { email: email.trim(), password });
  if (data?.access_token) { saveSession(normalizedSession(data)); return true; }
  return false; // Confirmation email required; never pretend the user is signed in.
}
export async function refreshAccessToken() {
  if (refreshFlight) return refreshFlight;
  const previous = getSession();
  if (!previous) return null;
  refreshFlight = (async () => {
    try {
      const data = await authRequest('/token?grant_type=refresh_token', { refresh_token: previous.refresh_token });
      // Logout/account switch while the request was in flight must not restore an old session.
      if (getSession()?.refresh_token !== previous.refresh_token) return null;
      const next = normalizedSession(data); saveSession(next); return next.access_token;
    } catch (error) {
      if (!error.retryable && getSession()?.refresh_token === previous.refresh_token) saveSession(null);
      throw error;
    } finally { refreshFlight = null; }
  })();
  return refreshFlight;
}
export async function getAccessToken() {
  const session = getSession();
  if (!session) return null;
  return session.expires_at <= Date.now() / 1000 + 45 ? refreshAccessToken() : session.access_token;
}
export async function signOut() {
  const previous = getSession(); saveSession(null);
  if (previous) { try { await authRequest('/logout?scope=local', undefined, previous.access_token); } catch { /* local logout still completes */ } }
}
