// Pure functions for the facilitator dashboard: validation of incoming data,
// progress maths, and rule-based "suggested next steps". No React, no network,
// so every function here is unit-tested in facilitatorUtils.test.js.

import { normalizeCourses } from '../common/normalizeCourses.js';

export { normalizeCourses };

const DAY_MS = 24 * 60 * 60 * 1000;
export const INACTIVE_AFTER_DAYS = 14;

const cleanText = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const cleanList = (value) => (Array.isArray(value) ? value.map(cleanText).filter(Boolean) : []);
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function validTime(iso) {
  if (typeof iso !== 'string') return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/** Returns a cleaned progress record, or null if it is unusable. */
export function normalizeProgressRecord(raw) {
  if (!isPlainObject(raw)) return null;
  const course_id = cleanText(raw.course_id);
  if (!course_id || typeof raw.completed !== 'boolean') return null;
  const score = Number.isInteger(raw.score) && raw.score >= 0 && raw.score <= 100 ? raw.score : null;
  return {
    student_id: cleanText(raw.student_id),
    course_id,
    completed: raw.completed,
    score,
    updated_at: validTime(raw.updated_at) != null ? raw.updated_at : null,
  };
}

/**
 * Cleans one item of GET /facilitator/students. Missing optional details are
 * replaced with safe defaults and listed in `warnings` so the UI can say so.
 * Returns null when the record has no usable student_id.
 */
export function normalizeStudent(raw) {
  if (!isPlainObject(raw)) return null;
  const student_id = cleanText(raw.student_id);
  if (!student_id) return null;
  const p = isPlainObject(raw.profile) ? raw.profile : {};
  const warnings = [];
  const name = cleanText(p.name);
  if (!name) warnings.push('name');
  const education_level = cleanText(p.education_level);
  if (!education_level) warnings.push('education_level');
  const interests = cleanList(p.interests);
  if (!interests.length) warnings.push('interests');

  // Keep only the newest record per course (protects against duplicates).
  const byCourse = new Map();
  for (const record of (Array.isArray(raw.progress) ? raw.progress : []).map(normalizeProgressRecord)) {
    if (!record) continue;
    const existing = byCourse.get(record.course_id);
    if (!existing || (validTime(record.updated_at) ?? 0) >= (validTime(existing.updated_at) ?? 0)) {
      byCourse.set(record.course_id, record);
    }
  }

  return {
    student_id,
    profile: {
      name: name ?? student_id,
      education_level,
      location: cleanText(p.location),
      language: cleanText(p.language),
      interests,
      skills: cleanList(p.skills),
      preferred_learning: cleanText(p.preferred_learning),
      weekly_learning_hours:
        Number.isInteger(p.weekly_learning_hours) && p.weekly_learning_hours > 0 ? p.weekly_learning_hours : null,
      goals: cleanList(p.goals),
    },
    progress: [...byCourse.values()],
    warnings,
  };
}

/** Validates the whole GET /facilitator/students body. Throws on a wrong top-level shape. */
export function normalizeStudentsResponse(json) {
  if (!isPlainObject(json) || !Array.isArray(json.students)) {
    throw new TypeError('Expected {"students": [...]}');
  }
  const seen = new Set();
  const students = [];
  let skipped = 0;
  for (const raw of json.students) {
    const student = normalizeStudent(raw);
    if (!student || seen.has(student.student_id)) {
      skipped += 1;
      continue;
    }
    seen.add(student.student_id);
    students.push(student);
  }
  return { students, skipped };
}

/** Validates GET /opportunities (an array). Invalid items are dropped. Throws on a non-array. */
export function normalizeOpportunities(json) {
  if (!Array.isArray(json)) throw new TypeError('Expected an array of opportunities');
  return json.flatMap((o) => {
    if (!isPlainObject(o)) return [];
    const id = cleanText(o.id);
    const title = cleanText(o.title);
    if (!id || !title) return [];
    return [{
      id,
      title,
      category: cleanText(o.category),
      description: cleanText(o.description) ?? '',
      education_levels: cleanList(o.education_levels),
      locations: cleanList(o.locations),
      eligibility_requirements: cleanList(o.eligibility_requirements),
      deadline: cleanText(o.deadline),
      official_url: /^https?:\/\//i.test(cleanText(o.official_url) ?? '') ? o.official_url.trim() : '',
      source_name: cleanText(o.source_name) ?? '',
      last_verified: cleanText(o.last_verified),
    }];
  });
}

/** Validates POST /recommendations -> { careers: [...] }. Throws on a wrong top-level shape. */
export function normalizeRecommendations(json) {
  if (!isPlainObject(json) || !Array.isArray(json.careers)) throw new TypeError('Expected {"careers": [...]}');
  return json.careers.flatMap((c) => {
    if (!isPlainObject(c)) return [];
    const career_id = cleanText(c.career_id);
    const title = cleanText(c.title);
    if (!career_id || !title) return [];
    return [{
      career_id,
      title,
      match_score: Number.isInteger(c.match_score) && c.match_score >= 0 && c.match_score <= 100 ? c.match_score : null,
      reasons: cleanList(c.reasons),
      missing_skills: cleanList(c.missing_skills),
      next_steps: cleanList(c.next_steps),
    }];
  });
}

/**
 * Progress summary for one student against the course catalogue.
 * percent is null when the catalogue is unknown (we never guess a total).
 */
export function summarizeProgress(student, courses = []) {
  const courseIds = new Set(courses.map((c) => c.id));
  const completed = student.progress.filter((r) => r.completed && (!courses.length || courseIds.has(r.course_id)));
  const completedIds = new Set(completed.map((r) => r.course_id));
  const total = courses.length;
  const percent = total ? Math.round((completedIds.size / total) * 100) : null;
  const scores = student.progress.map((r) => r.score).filter((s) => s != null);
  const averageScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const times = student.progress.map((r) => validTime(r.updated_at)).filter((t) => t != null);
  const lastActivity = times.length ? new Date(Math.max(...times)).toISOString() : null;
  let status = 'in-progress';
  if (completedIds.size === 0) status = 'not-started';
  else if (total && completedIds.size >= total) status = 'completed';
  return { completedIds, completedCount: completedIds.size, totalCourses: total, percent, averageScore, lastActivity, status };
}

/** Group-level numbers for the summary cards. */
export function groupSummary(students, courses = []) {
  const summaries = students.map((s) => summarizeProgress(s, courses));
  const percents = summaries.map((s) => s.percent).filter((p) => p != null);
  return {
    total: students.length,
    averagePercent: percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null,
    notStarted: summaries.filter((s) => s.status === 'not-started').length,
    inProgress: summaries.filter((s) => s.status === 'in-progress').length,
    completedAll: summaries.filter((s) => s.status === 'completed').length,
  };
}

/**
 * Simple, explainable rules for what a facilitator could do next.
 * Returns items as {key, vars} (translated by the UI) or {text} (text that
 * came from the recommendation engine and is shown as-is).
 */
export function suggestNextSteps({ student, courses = [], recommendations = null, now = Date.now() }) {
  const summary = summarizeProgress(student, courses);
  const steps = [];
  const nextCourse = courses.find((c) => !summary.completedIds.has(c.id));

  if (!courses.length) steps.push({ key: 'next.noCourses' });
  else if (summary.completedCount === 0) steps.push({ key: 'next.startFirst', vars: { title: nextCourse.title } });
  else if (nextCourse) steps.push({ key: 'next.continue', vars: { title: nextCourse.title } });
  else steps.push({ key: 'next.allDone' });

  const last = validTime(summary.lastActivity);
  if (last != null) {
    const days = Math.floor((now - last) / DAY_MS);
    if (days >= INACTIVE_AFTER_DAYS) steps.push({ key: 'next.checkIn', vars: { days } });
  }
  if (!student.profile.interests.length) steps.push({ key: 'next.askInterests' });

  if (recommendations && recommendations.length) {
    steps.push({ key: 'next.discussCareer', vars: { title: recommendations[0].title } });
    const seen = new Set();
    for (const text of recommendations.flatMap((r) => r.next_steps)) {
      if (!seen.has(text)) {
        seen.add(text);
        steps.push({ text });
      }
    }
  } else {
    steps.push({ key: 'next.reviewCareers' });
  }
  return steps;
}

const fold = (s) => s.trim().toLocaleLowerCase();

/**
 * Whether an opportunity's catalogue tags mention the student's education
 * level / location. 'unknown' when either side is empty. This is NOT an
 * eligibility decision (backend contract: empty lists mean unknown).
 */
export function opportunityRelevance(opportunity, profile) {
  const check = (tags, value) => {
    if (!tags.length || !value) return 'unknown';
    return tags.map(fold).includes(fold(value)) ? 'listed' : 'not-listed';
  };
  return {
    education: check(opportunity.education_levels, profile.education_level),
    location: check(opportunity.locations, profile.location),
  };
}

const RELEVANCE_RANK = { listed: 0, unknown: 1, 'not-listed': 2 };

/** Puts opportunities whose tags mention the student first; keeps original order otherwise. */
export function sortOpportunitiesForStudent(opportunities, profile) {
  return opportunities
    .map((o, index) => {
      const r = opportunityRelevance(o, profile);
      return { o, index, rank: RELEVANCE_RANK[r.education] + RELEVANCE_RANK[r.location] };
    })
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((x) => x.o);
}

/** Case-insensitive search over name, id, interests and education level. */
export function matchesSearch(student, query) {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  const haystack = [student.profile.name, student.student_id, student.profile.education_level ?? '', ...student.profile.interests]
    .join(' ')
    .toLocaleLowerCase();
  return haystack.includes(q);
}
