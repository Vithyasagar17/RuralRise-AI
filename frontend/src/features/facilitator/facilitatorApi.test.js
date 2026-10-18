import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBackend, freshIndexedDb, jsonResponse } from '../../test/helpers.js';
import { saveLessons } from '../offline/lessonStore.js';
import { fetchRecommendations, loadFacilitatorData, toRecommendationRequest } from './facilitatorApi.js';
import { MOCK_FACILITATOR_RESPONSE } from './facilitatorMockData.js';

beforeEach(freshIndexedDb);

describe('loadFacilitatorData', () => {
  it('loads students, courses and opportunities from the API', async () => {
    const data = await loadFacilitatorData({ fetchImpl: fakeBackend() });
    expect(data.source).toBe('api');
    expect(data.error).toBeNull();
    expect(data.students).toHaveLength(5);
    expect(data.coursesSource).toBe('api');
    expect(data.opportunities).toHaveLength(2);
  });

  it('falls back to clearly-labelled mock data when the server is unreachable (auto)', async () => {
    const data = await loadFacilitatorData({ fetchImpl: fakeBackend({ 'GET /facilitator/students': 'offline' }) });
    expect(data.source).toBe('mock');
    expect(data.error.kind).toBe('network');
    expect(data.students.length).toBeGreaterThan(0);
  });

  it('shows an error instead of mock data when dataSource="api"', async () => {
    const data = await loadFacilitatorData({
      dataSource: 'api',
      fetchImpl: fakeBackend({ 'GET /facilitator/students': () => jsonResponse({ detail: 'x' }, 503) }),
    });
    expect(data.source).toBe('api');
    expect(data.error.status).toBe(503);
    expect(data.students).toEqual([]);
  });

  it('treats a malformed facilitator response as an error', async () => {
    const data = await loadFacilitatorData({
      dataSource: 'api',
      fetchImpl: fakeBackend({ 'GET /facilitator/students': () => jsonResponse({ learners: [] }) }),
    });
    expect(data.error.kind).toBe('invalid-data');
  });

  it('uses lessons saved on the device when /courses fails', async () => {
    await saveLessons([{ id: 'demo-safety', title: 'Saved', skill: null, difficulty: null, lesson: 'x', practical_task: '' }]);
    const data = await loadFacilitatorData({ fetchImpl: fakeBackend({ 'GET /courses': 'offline' }) });
    expect(data.coursesSource).toBe('device');
    expect(data.courses[0].title).toBe('Saved');
  });

  it('keeps working when /courses and /opportunities both fail', async () => {
    const data = await loadFacilitatorData({
      fetchImpl: fakeBackend({ 'GET /courses': () => jsonResponse({ detail: 'x' }, 503), 'GET /opportunities': 'offline' }),
    });
    expect(data.source).toBe('api');
    expect(data.coursesSource).toBe('none');
    expect(data.coursesError.status).toBe(503);
    expect(data.opportunitiesError.kind).toBe('network');
  });

  it('mock mode never calls the network', async () => {
    const fetchImpl = fakeBackend();
    const data = await loadFacilitatorData({ dataSource: 'mock', fetchImpl });
    expect(data.source).toBe('mock');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('recommendations request', () => {
  const profile = MOCK_FACILITATOR_RESPONSE.students[0].profile;

  it('sends exactly the StudentProfile fields (backend forbids extra fields)', async () => {
    const fetchImpl = fakeBackend();
    await fetchRecommendations({ ...profile, warnings: ['x'], extra: 1 }, { fetchImpl });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(Object.keys(body).sort()).toEqual(
      ['education_level', 'goals', 'interests', 'language', 'location', 'name', 'preferred_learning', 'skills', 'weekly_learning_hours'],
    );
  });

  it('does not call the API for an incomplete profile', async () => {
    const fetchImpl = fakeBackend();
    expect(toRecommendationRequest({ ...profile, weekly_learning_hours: null })).toBeNull();
    expect(toRecommendationRequest({ ...profile, interests: [] })).toBeNull();
    const error = await fetchRecommendations({ ...profile, location: null }, { fetchImpl }).catch((e) => e);
    expect(error.kind).toBe('incomplete-profile');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
