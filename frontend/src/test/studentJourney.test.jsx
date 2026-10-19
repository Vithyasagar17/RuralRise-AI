import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import App from '../App.jsx';
import { configureRequestAuth } from '../features/common/apiClient.js';
import { freshIndexedDb, fakeBackend, jsonResponse } from './helpers.js';
import { getProgressRecord } from '../features/offline/progressQueue.js';

beforeEach(async () => {
  await freshIndexedDb(); localStorage.clear(); sessionStorage.clear();
  location.hash = '#profile'; configureRequestAuth(null);
});
afterEach(() => { vi.unstubAllGlobals(); });

it('saves a server profile, selects its recommended career, and syncs the actual roadmap lesson', async () => {
  const user = userEvent.setup();
  const backend = fakeBackend({
    'POST /profile': (init) => jsonResponse({ student_id: 'created-student-42', profile: JSON.parse(init.body) }, 201),
    'POST /recommendations': () => jsonResponse({ careers: [{ career_id: 'solar-technician', title: 'Solar Technician', match_score: 72, reasons: ['Your electronics interest'], missing_skills: ['solar basics'], next_steps: ['Try a worksheet'] }] }),
    'POST /roadmap': () => jsonResponse({ career_id: 'solar-technician', career_title: 'Solar Technician', modules: [{ module_id: 'solar-001', title: 'Safety worksheet', description: 'Paper practice', estimated_hours: 2, practical_task: 'List hazards', completion_criteria: 'Explain five hazards' }], weekly_plan: [], estimated_learning_time: { total_hours: 2, estimated_weeks: 1 }, warnings: [] }),
    'GET /courses': () => jsonResponse([{ id: 'solar-001', title: 'Safety worksheet', skill: 'safety', difficulty: 'beginner', lesson: 'Read a fictional paper scenario.', practical_task: 'List hazards' }]),
  });
  vi.stubGlobal('fetch', backend);
  const view = render(<App />);
  await user.type(screen.getByLabelText('Full name'), 'Fictional Test Learner');
  await user.click(screen.getByRole('checkbox', { name: /Electronics/ }));
  await user.click(screen.getByRole('button', { name: /Save my profile/ }));
  await screen.findByText('Profile saved to the server.');
  const save = backend.mock.calls.find(([url]) => new URL(url).pathname === '/profile');
  expect(JSON.parse(save[1].body)).toMatchObject({ name: 'Fictional Test Learner', interests: ['Electronics'], weekly_learning_hours: 5, skills: [] });
  await user.click(screen.getByRole('button', { name: 'Career recommendations' }));
  await screen.findByText('72/100 fit');
  await user.click(screen.getByRole('button', { name: 'View learning plan' }));
  await screen.findByRole('heading', { name: 'Safety worksheet' });
  await user.click(screen.getByRole('button', { name: 'Read Safety worksheet' }));
  await screen.findByText('Read a fictional paper scenario.');
  await user.click(screen.getByRole('button', { name: 'Mark lesson as complete' }));
  await waitFor(async () => expect((await getProgressRecord('created-student-42', 'solar-001'))?.status).toBe('synced'));
  const update = backend.mock.calls.find(([url]) => new URL(url).pathname === '/progress');
  expect(JSON.parse(update[1].body)).toMatchObject({ student_id: 'created-student-42', course_id: 'solar-001', completed: true });
  view.unmount();
  render(<App />);
  await screen.findByRole('button', { name: 'Read Safety worksheet' });
  expect(screen.getByRole('heading', { name: '1 of 1 modules marked complete' })).toBeInTheDocument();
}, 15000);

it('shows failed profile persistence and never claims a successful save', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', fakeBackend({ 'POST /profile': () => jsonResponse({ detail: 'Storage temporarily unavailable' }, 503) }));
  render(<App />);
  await user.type(screen.getByLabelText('Full name'), 'Fictional Test Learner');
  await user.click(screen.getByRole('checkbox', { name: /Agriculture/ }));
  await user.click(screen.getByRole('button', { name: /Save my profile/ }));
  await screen.findByText('Storage temporarily unavailable');
  expect(screen.queryByText('Profile saved to the server.')).not.toBeInTheDocument();
});
