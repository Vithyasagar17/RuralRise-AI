// Simulates the target offline journey in the browser DOM:
// open online -> lessons cached -> go offline -> read cached lesson ->
// mark complete (saved locally) -> reconnect -> synced successfully.
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeBackend, freshIndexedDb, jsonResponse } from '../../test/helpers.js';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import OfflineBanner from './OfflineBanner.jsx';
import OfflineLessons from './OfflineLessons.jsx';
import { getProgressRecord } from './progressQueue.js';

function setOnline(value) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
  window.dispatchEvent(new Event(value ? 'online' : 'offline'));
}

beforeEach(async () => {
  await freshIndexedDb();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});
afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

function renderLessons(fetchImpl, props = {}) {
  return render(
    <LanguageProvider initialLanguage="en">
      <OfflineBanner />
      <OfflineLessons studentId="demo-student-001" studentName="Demo Student" fetchImpl={fetchImpl} {...props} />
    </LanguageProvider>,
  );
}

describe('OfflineLessons journey', () => {
  it('caches lessons online, works offline, then synchronises on reconnect', async () => {
    const user = userEvent.setup();
    let networkUp = true;
    const backend = fakeBackend();
    const fetchImpl = (url, init) => (networkUp ? backend(url, init) : Promise.reject(new TypeError('Failed to fetch')));

    // 1-2. Online: lessons load and are saved on the device.
    const first = renderLessons(fetchImpl);
    expect(await screen.findByText(/Lessons are saved on this phone for offline reading/)).toBeInTheDocument();
    first.unmount();

    // 3-4. Disconnect and reopen: lessons come from the device.
    networkUp = false;
    setOnline(false);
    renderLessons(fetchImpl);
    expect(await screen.findByText(/No connection to the server. Showing lessons saved on this phone/)).toBeInTheDocument();
    expect(screen.getByText('You are offline.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open lesson: Demo: Recognising electrical hazards' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Demo: Recognising electrical hazards' })).toHaveFocus();
    expect(screen.getByText(/Stay away from exposed wires/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeDisabled();

    // 5-6. Complete the lesson offline: stored locally, waiting to sync.
    await user.click(screen.getByRole('button', { name: 'Mark lesson as complete' }));
    expect(await screen.findByText('Saved on this phone. It will be sent when you are back online.')).toBeInTheDocument();
    expect(await screen.findByText('Saved locally')).toBeInTheDocument();
    expect(document.querySelector('.rr-off-reader [data-status="pending"]')).toHaveTextContent('Saved locally — waiting to synchronise');
    expect(screen.getByText('Updates waiting to synchronise: 1.')).toBeInTheDocument();
    expect((await getProgressRecord('demo-student-001', 'demo-safety')).status).toBe('pending');

    // 7-9. Reconnect: automatic sync and confirmation.
    networkUp = true;
    await act(async () => setOnline(true));
    expect(await screen.findByText('Synced successfully (1).')).toBeInTheDocument();
    expect(screen.getByText('Synced successfully')).toBeInTheDocument();
    expect(screen.getByText('All progress is synchronised.', { exact: false })).toBeInTheDocument();
    const posts = backend.mock.calls.filter(([url, init]) => url.endsWith('/progress') && init.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(JSON.parse(posts[0][1].body)).toEqual({ student_id: 'demo-student-001', course_id: 'demo-safety', completed: true, score: null });
  });

  it('shows "Synchronisation failed" and keeps progress when the server rejects it', async () => {
    const user = userEvent.setup();
    const fetchImpl = fakeBackend({ 'POST /progress': () => jsonResponse({ detail: 'down' }, 503) });
    renderLessons(fetchImpl);
    await user.click(await screen.findByRole('button', { name: 'Open lesson: Demo: Plan a learning week' }));
    await user.click(screen.getByRole('button', { name: 'Mark lesson as complete' }));
    expect(await screen.findByText('Synchronisation failed')).toBeInTheDocument();
    expect(screen.getByText(/will try again when online/)).toBeInTheDocument();
    expect(await screen.findByText(/Synchronisation failed for 1 update/)).toBeInTheDocument();
    expect((await getProgressRecord('demo-student-001', 'demo-planning')).payload.completed).toBe(true);
  });

  it('explains when there is no connection and nothing saved yet', async () => {
    setOnline(false);
    renderLessons(fakeBackend({ 'GET /courses': 'offline' }));
    expect(await screen.findByText(/No lessons are saved on this phone yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('refuses to save progress without a student', async () => {
    renderLessons(fakeBackend(), { studentId: undefined });
    expect(await screen.findByText(/Choose or create a student profile first/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sync now' })).not.toBeInTheDocument();
  });

  it('can mark a completed lesson as not complete', async () => {
    const user = userEvent.setup();
    renderLessons(fakeBackend());
    await user.click(await screen.findByRole('button', { name: 'Open lesson: Demo: Plan a learning week' }));
    await user.click(screen.getByRole('button', { name: 'Mark lesson as complete' }));
    await user.click(await screen.findByRole('button', { name: 'Mark as not complete' }));
    expect(await screen.findByRole('button', { name: 'Mark lesson as complete' })).toBeInTheDocument();
    await screen.findByText('Synced successfully');
    expect((await getProgressRecord('demo-student-001', 'demo-planning')).payload.completed).toBe(false);
  });
});
