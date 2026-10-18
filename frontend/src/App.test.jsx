
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

describe('RuralRise AI app', () => {
  it('renders the student dashboard and navigates to facilitator and offline lessons', async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider initialLanguage="en">
        <App />
      </LanguageProvider>,
    );

    // Accessibility: the skip link points to the main content.
    expect(
      screen.getByRole('link', { name: 'Skip to main content' }),
    ).toHaveAttribute('href', '#main');

    // The combined app opens on the student dashboard.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeInTheDocument();

    // Facilitator dashboard navigation.
    await user.click(
      screen.getByRole('button', { name: 'Facilitator dashboard' }),
    );

    expect(
      await screen.findAllByRole('heading', {
        level: 1,
        name: 'Facilitator dashboard',
      }),
    ).not.toHaveLength(0);

    // Offline lessons navigation and demo student selection.
    await user.click(
      screen.getByRole('button', { name: 'Offline lessons' }),
    );

    expect(
      await screen.findByLabelText('Select demo student'),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText('Select demo student'),
      'demo-student-002',
    );

    expect(
      await screen.findByText('Learning as: Fictional Learner'),
    ).toBeInTheDocument();
  });
});
