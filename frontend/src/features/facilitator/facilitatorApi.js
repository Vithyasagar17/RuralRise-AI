// Data access for the facilitator dashboard. Uses only Member 3's documented
// endpoints and JSON shapes (docs/api-contracts.md):
//   GET  /facilitator/students -> { students: [{ student_id, profile, progress }] }
//   GET  /courses              -> [Course]
//   GET  /opportunities        -> [Opportunity]
//   POST /recommendations      <- StudentProfile, -> { careers: [...] }
import { ApiError, requestJson } from '../common/apiClient.js';
import { getSavedLessons } from '../offline/lessonStore.js';
import {
  MOCK_COURSES,
  MOCK_FACILITATOR_RESPONSE,
  MOCK_OPPORTUNITIES,
  MOCK_RECOMMENDATIONS,
} from './facilitatorMockData.js';
import {
  normalizeCourses,
  normalizeOpportunities,
  normalizeRecommendations,
  normalizeStudentsResponse,
} from './facilitatorUtils.js';

function asDataError(error) {
  return error instanceof ApiError ? error : new ApiError(error?.message || 'Unreadable data.', { kind: 'invalid-data' });
}

export async function fetchFacilitatorStudents({ fetchImpl } = {}) {
  const json = await requestJson('/facilitator/students', { fetchImpl });
  try {
    return normalizeStudentsResponse(json);
  } catch (error) {
    throw asDataError(error);
  }
}

export async function fetchCourses({ fetchImpl } = {}) {
  const json = await requestJson('/courses', { fetchImpl });
  try {
    return normalizeCourses(json);
  } catch (error) {
    throw asDataError(error);
  }
}

export async function fetchOpportunities({ fetchImpl } = {}) {
  const json = await requestJson('/opportunities', { fetchImpl });
  try {
    return normalizeOpportunities(json);
  } catch (error) {
    throw asDataError(error);
  }
}

const PROFILE_FIELDS = [
  'name',
  'education_level',
  'location',
  'language',
  'interests',
  'skills',
  'preferred_learning',
  'weekly_learning_hours',
  'goals',
];

/**
 * Builds a StudentProfile body that the backend will accept (it rejects extra
 * fields). Returns null when a required field is missing, so we never send a
 * request that is certain to fail with 422.
 */
export function toRecommendationRequest(profile) {
  if (!profile) return null;
  const body = Object.fromEntries(PROFILE_FIELDS.map((f) => [f, profile[f]]));
  body.skills = Array.isArray(body.skills) ? body.skills : [];
  body.goals = Array.isArray(body.goals) ? body.goals : [];
  const requiredText = ['name', 'education_level', 'location', 'language', 'preferred_learning'];
  if (requiredText.some((f) => typeof body[f] !== 'string' || !body[f].trim())) return null;
  if (!Array.isArray(body.interests) || body.interests.length === 0) return null;
  if (!Number.isInteger(body.weekly_learning_hours) || body.weekly_learning_hours < 1 || body.weekly_learning_hours > 168) {
    return null;
  }
  return body;
}

/** Career recommendations for one student profile. source: 'api' | 'mock'. */
export async function fetchRecommendations(profile, { fetchImpl, source = 'api' } = {}) {
  if (source === 'mock') return normalizeRecommendations(MOCK_RECOMMENDATIONS);
  const body = toRecommendationRequest(profile);
  if (!body) {
    throw new ApiError('The student profile is incomplete, so recommendations cannot be requested.', {
      kind: 'incomplete-profile',
    });
  }
  const json = await requestJson('/recommendations', { method: 'POST', body, fetchImpl });
  try {
    return normalizeRecommendations(json);
  } catch (error) {
    throw asDataError(error);
  }
}

function mockBundle() {
  return {
    students: normalizeStudentsResponse(MOCK_FACILITATOR_RESPONSE).students,
    skipped: 0,
    courses: normalizeCourses(MOCK_COURSES),
    coursesSource: 'mock',
    coursesError: null,
    opportunities: normalizeOpportunities(MOCK_OPPORTUNITIES),
    opportunitiesError: null,
  };
}

/**
 * Loads everything the dashboard needs.
 *
 * dataSource:
 *   'auto' (default) – use the backend; if it cannot be reached, show mock data and say so.
 *   'api'            – backend only; show an error instead of mock data.
 *   'mock'           – fictional data only (no network).
 *
 * Resolves to { source: 'api'|'mock', error, students, skipped, courses,
 * coursesSource: 'api'|'device'|'mock'|'none', coursesError, opportunities, opportunitiesError }.
 */
export async function loadFacilitatorData({ dataSource = 'auto', fetchImpl } = {}) {
  if (dataSource === 'mock') return { source: 'mock', error: null, ...mockBundle() };

  let studentsResult;
  try {
    studentsResult = await fetchFacilitatorStudents({ fetchImpl });
  } catch (error) {
    if (dataSource === 'api') {
      return {
        source: 'api',
        error,
        students: [],
        skipped: 0,
        courses: [],
        coursesSource: 'none',
        coursesError: null,
        opportunities: [],
        opportunitiesError: null,
      };
    }
    return { source: 'mock', error, ...mockBundle() };
  }

  const [coursesResult, opportunitiesResult] = await Promise.allSettled([
    fetchCourses({ fetchImpl }),
    fetchOpportunities({ fetchImpl }),
  ]);

  let courses = [];
  let coursesSource = 'none';
  let coursesError = null;
  if (coursesResult.status === 'fulfilled') {
    courses = coursesResult.value;
    coursesSource = 'api';
  } else {
    coursesError = coursesResult.reason;
    try {
      const saved = await getSavedLessons();
      if (saved.lessons.length) {
        courses = saved.lessons;
        coursesSource = 'device';
      }
    } catch {
      // No offline copy available.
    }
  }

  return {
    source: 'api',
    error: null,
    students: studentsResult.students,
    skipped: studentsResult.skipped,
    courses,
    coursesSource,
    coursesError,
    opportunities: opportunitiesResult.status === 'fulfilled' ? opportunitiesResult.value : [],
    opportunitiesError: opportunitiesResult.status === 'rejected' ? opportunitiesResult.reason : null,
  };
}
