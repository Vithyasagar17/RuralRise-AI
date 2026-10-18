import { describe, expect, it } from 'vitest';
import { MOCK_COURSES, MOCK_FACILITATOR_RESPONSE, MOCK_OPPORTUNITIES } from './facilitatorMockData.js';
import {
  groupSummary,
  matchesSearch,
  normalizeCourses,
  normalizeOpportunities,
  normalizeRecommendations,
  normalizeStudent,
  normalizeStudentsResponse,
  opportunityRelevance,
  sortOpportunitiesForStudent,
  suggestNextSteps,
  summarizeProgress,
} from './facilitatorUtils.js';

const courses = normalizeCourses(MOCK_COURSES);
const { students } = normalizeStudentsResponse(MOCK_FACILITATOR_RESPONSE);
const byId = Object.fromEntries(students.map((s) => [s.student_id, s]));

describe('normalizeStudentsResponse (missing or malformed data)', () => {
  it('accepts the documented backend shape unchanged', () => {
    expect(students).toHaveLength(5);
    expect(byId['demo-student-001'].profile.interests).toEqual(['electronics', 'hands-on work']);
    expect(byId['demo-student-001'].warnings).toEqual([]);
  });

  it('throws on a wrong top-level shape', () => {
    expect(() => normalizeStudentsResponse([])).toThrow();
    expect(() => normalizeStudentsResponse({ students: 'x' })).toThrow();
    expect(() => normalizeStudentsResponse(null)).toThrow();
  });

  it('skips unusable and duplicate students and counts them', () => {
    const result = normalizeStudentsResponse({
      students: [null, { profile: {} }, { student_id: 'a' }, { student_id: 'a' }, 42],
    });
    expect(result.students.map((s) => s.student_id)).toEqual(['a']);
    expect(result.skipped).toBe(4);
  });

  it('fills safe defaults and records warnings for missing profile fields', () => {
    const s = normalizeStudent({ student_id: 'x-1', profile: { name: '  ', interests: 'electronics' }, progress: 'bad' });
    expect(s.profile.name).toBe('x-1');
    expect(s.profile.interests).toEqual([]);
    expect(s.progress).toEqual([]);
    expect(s.warnings).toEqual(['name', 'education_level', 'interests']);
  });

  it('drops invalid progress records and keeps the newest per course', () => {
    const s = normalizeStudent({
      student_id: 'x',
      profile: {},
      progress: [
        { course_id: 'c1', completed: 'yes' },
        { course_id: 'c1', completed: false, updated_at: '2026-01-01T00:00:00Z' },
        { course_id: 'c1', completed: true, score: 120, updated_at: '2026-02-01T00:00:00Z' },
        { completed: true },
      ],
    });
    expect(s.progress).toEqual([{ student_id: null, course_id: 'c1', completed: true, score: null, updated_at: '2026-02-01T00:00:00Z' }]);
  });
});

describe('progress calculations', () => {
  it('computes completion against the course catalogue', () => {
    const s = summarizeProgress(byId['demo-student-001'], courses);
    expect(s).toMatchObject({ completedCount: 1, totalCourses: 2, percent: 50, averageScore: 80, status: 'in-progress' });
  });

  it('marks students with every module as completed and with none as not started', () => {
    expect(summarizeProgress(byId['demo-student-003'], courses).status).toBe('completed');
    expect(summarizeProgress(byId['demo-student-002'], courses).status).toBe('not-started');
    // completed:false record does not count as completion
    expect(summarizeProgress(byId['demo-student-004'], courses).status).toBe('not-started');
  });

  it('never guesses a percentage when the catalogue is unknown', () => {
    expect(summarizeProgress(byId['demo-student-003'], []).percent).toBeNull();
  });

  it('ignores completions for courses that are not in the catalogue', () => {
    const s = normalizeStudent({ student_id: 'z', profile: {}, progress: [{ course_id: 'gone', completed: true }] });
    expect(summarizeProgress(s, courses).completedCount).toBe(0);
  });

  it('summarises the group', () => {
    expect(groupSummary(students, courses)).toEqual({ total: 5, averagePercent: 40, notStarted: 2, inProgress: 2, completedAll: 1 });
  });
});

describe('suggestNextSteps', () => {
  const now = Date.parse('2026-10-18T00:00:00Z');

  it('suggests the first module for a student who has not started', () => {
    const steps = suggestNextSteps({ student: byId['demo-student-002'], courses, now });
    expect(steps[0]).toEqual({ key: 'next.startFirst', vars: { title: courses[0].title } });
    expect(steps.at(-1)).toEqual({ key: 'next.reviewCareers' });
  });

  it('suggests the next incomplete module and adds recommendation steps without duplicates', () => {
    const recs = [
      { title: 'Solar PV Technician', next_steps: ['Do A', 'Do B'] },
      { title: 'Other', next_steps: ['Do A'] },
    ];
    const steps = suggestNextSteps({ student: byId['demo-student-001'], courses, recommendations: recs, now });
    expect(steps).toEqual([
      { key: 'next.continue', vars: { title: courses[1].title } },
      { key: 'next.discussCareer', vars: { title: 'Solar PV Technician' } },
      { text: 'Do A' },
      { text: 'Do B' },
    ]);
  });

  it('flags inactivity after 14 days and celebrates completion', () => {
    const steps = suggestNextSteps({ student: byId['demo-student-004'], courses, now });
    expect(steps).toContainEqual({ key: 'next.checkIn', vars: { days: 27 } });
    expect(suggestNextSteps({ student: byId['demo-student-003'], courses, now })[0]).toEqual({ key: 'next.allDone' });
  });

  it('handles a missing catalogue and missing interests', () => {
    const s = normalizeStudent({ student_id: 'n', profile: {} });
    const steps = suggestNextSteps({ student: s, courses: [], now });
    expect(steps[0]).toEqual({ key: 'next.noCourses' });
    expect(steps).toContainEqual({ key: 'next.askInterests' });
  });
});

describe('opportunities', () => {
  const opps = normalizeOpportunities(MOCK_OPPORTUNITIES);

  it('reports listed / unknown tags without deciding eligibility', () => {
    const profile = byId['demo-student-001'].profile; // Class 12, Tamil Nadu
    expect(opportunityRelevance(opps[0], profile)).toEqual({ education: 'listed', location: 'listed' });
    expect(opportunityRelevance(opps[1], profile)).toEqual({ education: 'unknown', location: 'unknown' });
    expect(opportunityRelevance(opps[0], byId['demo-student-002'].profile).education).toBe('not-listed');
  });

  it('sorts matching opportunities first', () => {
    const sorted = sortOpportunitiesForStudent([...opps].reverse(), byId['demo-student-001'].profile);
    expect(sorted[0].id).toBe('demo-training-001');
  });

  it('drops non-http links so we never show an unsafe or invented URL', () => {
    const [o] = normalizeOpportunities([{ ...MOCK_OPPORTUNITIES[0], official_url: 'javascript:alert(1)' }]);
    expect(o.official_url).toBe('');
    expect(() => normalizeOpportunities({})).toThrow();
  });
});

describe('other normalisers and search', () => {
  it('normalises recommendations and rejects bad shapes', () => {
    const recs = normalizeRecommendations({ careers: [{ career_id: 'a', title: 'A', match_score: 101 }, { title: 'no id' }] });
    expect(recs).toEqual([{ career_id: 'a', title: 'A', match_score: null, reasons: [], missing_skills: [], next_steps: [] }]);
    expect(() => normalizeRecommendations([])).toThrow();
  });

  it('drops invalid and duplicate courses', () => {
    expect(normalizeCourses([{ id: 'a', title: 'A' }, { id: 'a', title: 'dup' }, { title: 'no id' }])).toHaveLength(1);
  });

  it('searches name, id, education and interests case-insensitively', () => {
    expect(matchesSearch(byId['demo-student-001'], 'ELECTRONICS')).toBe(true);
    expect(matchesSearch(byId['demo-student-001'], 'class 12')).toBe(true);
    expect(matchesSearch(byId['demo-student-001'], 'agri')).toBe(false);
    expect(matchesSearch(byId['demo-student-001'], '   ')).toBe(true);
  });
});
