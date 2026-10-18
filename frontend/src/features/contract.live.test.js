// LIVE integration test against Member 3's running FastAPI backend.
//   1. Start the backend (see README) on http://127.0.0.1:8000
//   2. cd frontend && npm run test:live
// It uses the app's real client code (no mocks). It writes ONE progress
// record for the fictional demo-student-002 / demo-planning, then restores it
// to completed=false so repeated runs leave the demo data as they found it.
import { beforeAll, describe, expect, it } from 'vitest';
import { ApiError, getApiBaseUrl, requestJson } from './common/apiClient.js';
import { fetchCourses, fetchOpportunities, fetchRecommendations, loadFacilitatorData } from './facilitator/facilitatorApi.js';

const STUDENT = 'demo-student-002';
const COURSE = 'demo-planning';

beforeAll(async () => {
  try {
    await requestJson('/health', { timeoutMs: 3000 });
  } catch (error) {
    throw new Error(`Backend not reachable at ${getApiBaseUrl()}. Start it first. (${error.message})`);
  }
});

describe('live backend contract (Member 3 API)', () => {
  it('GET /health -> {"status":"ok"}', async () => {
    expect(await requestJson('/health')).toEqual({ status: 'ok' });
  });

  it('GET /facilitator/students matches the shape the dashboard expects', async () => {
    const raw = await requestJson('/facilitator/students');
    expect(Array.isArray(raw.students)).toBe(true);
    for (const s of raw.students) {
      expect(Object.keys(s).sort()).toEqual(['profile', 'progress', 'student_id']);
      expect(typeof s.profile.name).toBe('string');
      expect(Array.isArray(s.profile.interests)).toBe(true);
    }
    const data = await loadFacilitatorData({ dataSource: 'api' });
    expect(data.error).toBeNull();
    expect(data.skipped).toBe(0);
    expect(data.coursesSource).toBe('api');
  });

  it('GET /courses and GET /opportunities are readable by the dashboard', async () => {
    const courses = await fetchCourses();
    expect(courses.length).toBeGreaterThan(0);
    expect(courses.find((c) => c.id === COURSE)).toBeTruthy();
    expect(Array.isArray(await fetchOpportunities())).toBe(true);
  });

  it('POST /recommendations accepts a profile from /facilitator/students', async () => {
    const { students } = await loadFacilitatorData({ dataSource: 'api' });
    const careers = await fetchRecommendations(students[0].profile);
    expect(careers.length).toBeGreaterThan(0);
    for (const c of careers) expect(Object.keys(c).sort()).toEqual(['career_id', 'match_score', 'missing_skills', 'next_steps', 'reasons', 'title']);
  });

  it('POST /progress saves, upserts and shows up in the facilitator view', async () => {
    const saved = await requestJson('/progress', {
      method: 'POST',
      body: { student_id: STUDENT, course_id: COURSE, completed: true, score: 70 },
    });
    expect(saved.saved).toBe(true);
    expect(saved.progress).toMatchObject({ student_id: STUDENT, course_id: COURSE, completed: true, score: 70 });
    expect(typeof saved.progress.updated_at).toBe('string');

    // Same key again: upsert, never a duplicate row.
    await requestJson('/progress', { method: 'POST', body: { student_id: STUDENT, course_id: COURSE, completed: true, score: 70 } });
    const { students } = await loadFacilitatorData({ dataSource: 'api' });
    const rows = students.find((s) => s.student_id === STUDENT).progress.filter((r) => r.course_id === COURSE);
    expect(rows).toHaveLength(1);
    expect(rows[0].completed).toBe(true);

    // Restore the demo record.
    await requestJson('/progress', { method: 'POST', body: { student_id: STUDENT, course_id: COURSE, completed: false, score: null } });
  });

  it('POST /progress error codes match what the sync manager expects', async () => {
    const unknownStudent = await requestJson('/progress', {
      method: 'POST',
      body: { student_id: 'no-such-student', course_id: COURSE, completed: true },
    }).catch((e) => e);
    expect(unknownStudent).toBeInstanceOf(ApiError);
    expect(unknownStudent.status).toBe(404);
    expect(unknownStudent.retryable).toBe(false);

    const invalid = await requestJson('/progress', {
      method: 'POST',
      body: { student_id: STUDENT, course_id: COURSE, completed: 'yes' },
    }).catch((e) => e);
    expect(invalid.status).toBe(422);
    expect(invalid.retryable).toBe(false);
  });
});
