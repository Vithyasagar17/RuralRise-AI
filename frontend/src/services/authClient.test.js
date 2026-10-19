import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { getSession, signIn, signUp, refreshAccessToken, signOut } from './authClient.js';
import { jsonResponse } from '../test/helpers.js';
const session = (id = 'account-a') => ({ access_token: 'access-' + id, refresh_token: 'refresh-' + id, expires_in: 3600, user: { id } });
beforeEach(() => {
  sessionStorage.clear();
  vi.stubEnv('VITE_AUTH_MODE', 'supabase'); vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_example');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('uses Supabase password grant and keeps secrets out of localStorage', async () => {
  const fetchImpl = vi.fn(async () => jsonResponse(session())); vi.stubGlobal('fetch', fetchImpl);
  await signIn(' learner@example.test ', 'example-password');
  expect(fetchImpl.mock.calls[0][0]).toBe('https://example.supabase.co/auth/v1/token?grant_type=password');
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ email: 'learner@example.test', password: 'example-password' });
  expect(getSession().user.id).toBe('account-a');
  expect(JSON.stringify(localStorage)).not.toContain('access-account-a');
});
it('does not claim login when signup requires confirmation', async () => {
  vi.stubGlobal('fetch', async () => jsonResponse({ user: { id: 'account-a' } }));
  expect(await signUp('learner@example.test', 'example-password')).toBe(false);
  expect(getSession()).toBeNull();
});
it('cannot restore a logged-out session from a late refresh response', async () => {
  let finish;
  vi.stubGlobal('fetch', vi.fn(async (url) => url.includes('refresh_token') ? new Promise((resolve) => { finish = resolve; }) : url.includes('/logout') ? new Response(null, { status: 204 }) : jsonResponse(session())));
  await signIn('learner@example.test', 'example-password');
  const refreshing = refreshAccessToken();
  await signOut();
  finish(jsonResponse(session()));
  expect(await refreshing).toBeNull(); expect(getSession()).toBeNull();
});
