import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBackend, freshIndexedDb, jsonResponse } from '../../test/helpers.js';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import FacilitatorDashboard from './FacilitatorDashboard.jsx';

beforeEach(freshIndexedDb);

function renderDashboard(props) {
  return render(
    <LanguageProvider initialLanguage="en">
      <FacilitatorDashboard {...props} />
    </LanguageProvider>,
  );
}

describe('FacilitatorDashboard', () => {
  it('shows the group overview and one card per student from the API', async () => {
    renderDashboard({ fetchImpl: fakeBackend() });
    expect(await screen.findByText('Live data from the RuralRise server.')).toBeInTheDocument();
    const overview = screen.getByRole('region', { name: 'Group overview' });
    expect(within(overview).getByText('5')).toBeInTheDocument();
    expect(within(overview).getByText('40%')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Student list' });
    expect(within(list).getAllByRole('article')).toHaveLength(5);
    expect(screen.getAllByRole('progressbar', { name: '1 of 2 modules completed (50%)' })).toHaveLength(2);
    expect(screen.getByRole('progressbar', { name: '2 of 2 modules completed (100%)' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('Showing 5 of 5 students.')).toBeInTheDocument();
  });

  it('filters by search text and by status', async () => {
    const user = userEvent.setup();
    renderDashboard({ fetchImpl: fakeBackend() });
    await screen.findByText('Showing 5 of 5 students.');
    await user.type(screen.getByLabelText('Search by name, ID, education or interest'), 'agriculture');
    expect(screen.getByText('Showing 1 of 5 students.')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Search by name, ID, education or interest'));
    await user.selectOptions(screen.getByLabelText('Show'), 'completed');
    expect(screen.getByText('Showing 1 of 5 students.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Search by name, ID, education or interest'), 'zzz');
    expect(screen.getByText('No students match your search.')).toBeInTheDocument();
  });

  it('opens the student details view and returns to the list', async () => {
    const user = userEvent.setup();
    const fetchImpl = fakeBackend();
    renderDashboard({ fetchImpl });
    await user.click(await screen.findByRole('button', { name: 'View details for Demo Student' }));

    const heading = screen.getByRole('heading', { level: 2, name: 'Demo Student' });
    expect(heading).toHaveFocus();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('5 hours')).toBeInTheDocument();
    expect(screen.getByText('Demo: Recognising electrical hazards')).toBeInTheDocument();
    expect(screen.getByText(/Score 80/)).toBeInTheDocument();
    expect(await screen.findByText('Solar PV Technician')).toBeInTheDocument();
    expect(screen.getByText('Encourage the student to continue with “Demo: Plan a learning week”.')).toBeInTheDocument();
    expect(screen.getByText('Discuss the recommended pathway “Solar PV Technician” with the student.')).toBeInTheDocument();
    expect(screen.getByText('Lists Class 12')).toBeInTheDocument();
    expect(screen.getAllByText('No verified official link').length).toBeGreaterThan(0);
    expect(fetchImpl.mock.calls.some(([url, init]) => url.endsWith('/recommendations') && init.method === 'POST')).toBe(true);

    await user.click(screen.getAllByRole('button', { name: /Back to all students/ })[0]);
    expect(screen.getByRole('region', { name: 'Group overview' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'View details for Demo Student' })).toHaveFocus());
  });

  it('falls back to labelled demo data when the server is unreachable', async () => {
    renderDashboard({ fetchImpl: fakeBackend({ 'GET /facilitator/students': 'offline' }) });
    expect(await screen.findByText('Server not reachable.')).toBeInTheDocument();
    expect(screen.getByText(/Cannot reach the server/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing here is real/)).toBeInTheDocument();
    expect(screen.getAllByRole('article').length).toBe(5);
  });

  it('shows an error with retry (and no fake data) in api-only mode', async () => {
    const user = userEvent.setup();
    let fail = true;
    const fetchImpl = fakeBackend({
      'GET /facilitator/students': () => (fail ? jsonResponse({ detail: 'down' }, 503) : jsonResponse({ students: [] })),
    });
    renderDashboard({ dataSource: 'api', fetchImpl });
    expect(await screen.findByText('Student records could not be loaded.')).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No students are assigned yet.')).toBeInTheDocument();
  });

  it('explains when recommendations cannot load', async () => {
    const user = userEvent.setup();
    renderDashboard({ fetchImpl: fakeBackend({ 'POST /recommendations': () => jsonResponse({ detail: 'x' }, 503) }) });
    await user.click(await screen.findByRole('button', { name: 'View details for Demo Student' }));
    expect(await screen.findByText('Recommendations could not be loaded.')).toBeInTheDocument();
    expect(screen.getByText('The service is temporarily unavailable. Please try again later.')).toBeInTheDocument();
  });

  it('copies opportunity text for sharing without inventing a link', async () => {
    const user = userEvent.setup();
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { copied = t; } }, configurable: true });
    renderDashboard({ dataSource: 'mock' });
    await user.click(await screen.findByRole('button', { name: 'Share: FICTIONAL DEMO: Practical learning programme' }));
    expect(await screen.findByText('Copied. You can paste it into a message.')).toBeInTheDocument();
    expect(copied).toContain('FICTIONAL DEMO: Practical learning programme');
    expect(copied).toContain('Please confirm eligibility');
    expect(copied).not.toMatch(/https?:/);
  });

  it('shows an access message and loads nothing when not authorised', () => {
    const fetchImpl = fakeBackend();
    renderDashboard({ isAuthorized: false, fetchImpl });
    expect(screen.getByRole('alert')).toHaveTextContent('You do not have permission');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('warns about records that could not be read', async () => {
    renderDashboard({
      fetchImpl: fakeBackend({
        'GET /facilitator/students': () => jsonResponse({ students: [{ student_id: 'ok-1', profile: {} }, { profile: {} }] }),
      }),
    });
    expect(await screen.findByText('Records skipped because they could not be read: 1.')).toBeInTheDocument();
    expect(screen.getByText('⚠ Some profile details are missing.')).toBeInTheDocument();
  });
});
