// Smoke test for the temporary integration harness: both Member 5 screens render together.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBackend, freshIndexedDb } from './test/helpers.js';
import App from './App.jsx';
import { LanguageProvider } from './features/i18n';

beforeEach(async () => {
  await freshIndexedDb();
  window.location.hash = '';
  vi.stubGlobal('fetch', fakeBackend());
});

describe('App harness', () => {
  it('renders the dashboard, then switches to lessons and between demo students', async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider initialLanguage="en">
        <App />
      </LanguageProvider>,
    );
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main');
    expect(await screen.findByRole('heading', { level: 1, name: 'Facilitator dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Facilitator dashboard' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: 'My lessons (offline)' }));
    expect(window.location.hash).toBe('#lessons');
    expect(await screen.findByText('Learning as: Demo Student')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Demo student'), 'demo-student-002');
    expect(await screen.findByText('Learning as: Fictional Learner')).toBeInTheDocument();

    // Changing the URL hash (e.g. browser Back) switches the tab too.
    window.location.hash = '#facilitator';
    expect(await screen.findByRole('heading', { level: 1, name: 'Facilitator dashboard' })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
