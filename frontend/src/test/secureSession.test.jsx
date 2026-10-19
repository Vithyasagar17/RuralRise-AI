import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import App from '../App.jsx';
import { configureRequestAuth } from '../features/common/apiClient.js';
import { getAccessToken, getSessionIdentity, refreshAccessToken, signIn } from '../services/authClient.js';
import { fakeBackend, freshIndexedDb, jsonResponse } from './helpers.js';

const projectUrl = 'https://example.supabase.co';
beforeEach(async () => {
  await freshIndexedDb(); localStorage.clear(); sessionStorage.clear(); location.hash = '#dashboard';
  vi.stubEnv('VITE_AUTH_MODE', 'supabase'); vi.stubEnv('VITE_SUPABASE_URL', projectUrl); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_example');
  configureRequestAuth({ token: getAccessToken, identity: getSessionIdentity, refresh: refreshAccessToken });
});
afterEach(() => { configureRequestAuth(null); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('signs in a student then switches to a teacher without retaining the student screen', async () => {
  const user = userEvent.setup();
  const fallback = fakeBackend();
  vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
    if (url.includes('/auth/v1/token')) {
      const teacher = JSON.parse(init.body).email.startsWith('teacher');
      const subject = teacher ? 'teacher-a' : 'student-a';
      return jsonResponse({ access_token: subject, refresh_token: 'refresh-' + subject, expires_in: 3600, user: { id: subject } });
    }
    if (url.includes('/auth/v1/logout')) return new Response(null, { status: 204 });
    const path = new URL(url).pathname;
    if (path === '/account') { const subject = init.headers.Authorization.slice(7); return jsonResponse({ user_id: subject, role: subject.startsWith('teacher') ? 'teacher' : 'student' }); }
    if (path === '/profile') return jsonResponse({ detail: 'No profile yet' }, 404);
    if (path === '/facilitator/students') return jsonResponse({ students: [] });
    return fallback(url, init);
  }));
  render(<App />);
  await user.type(screen.getByLabelText('Email'), 'student@example.test');
  await user.type(screen.getByLabelText('Password'), 'example-password');
  await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await screen.findByRole('button', { name: 'Open create my profile', exact: true });
  expect(screen.queryByRole('button', { name: 'Facilitator dashboard', exact: true })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Sign out', exact: true }));
  await user.type(await screen.findByLabelText('Email'), 'teacher@example.test');
  await user.type(screen.getByLabelText('Password'), 'example-password');
  await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await screen.findByRole('button', { name: 'Facilitator dashboard', exact: true });
  expect(screen.queryByRole('button', { name: 'My profile', exact: true })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Open create my profile', exact: true })).not.toBeInTheDocument();
}, 15000);

it('does not restore a cached account after an explicit server denial', async () => {
  vi.stubGlobal('fetch', async (url) => url.includes('/auth/v1/token') ? jsonResponse({ access_token: 'student-a', refresh_token: 'r', expires_in: 3600, user: { id: 'student-a' } }) : jsonResponse({ detail: 'Permission denied.' }, 403));
  await signIn('student@example.test', 'example-password');
  sessionStorage.setItem('ruralrise-student:http://127.0.0.1:8000:student-a:account', JSON.stringify({ user_id: 'student-a', role: 'student' }));
  render(<App />);
  await screen.findByText('Permission denied.');
  await waitFor(() => expect(screen.queryByText(/Offline account view:/)).not.toBeInTheDocument());
});
