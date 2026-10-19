// Student calls use the same transport and existing API shapes as Member 5.
import { ApiError, requestJson } from '../features/common/apiClient.js';
const id = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value);
const text = (value) => typeof value === 'string' && !!value.trim();
const texts = (value) => Array.isArray(value) && value.every(text);
function checked(data, valid) {
  if (!valid(data)) throw new ApiError('The server returned incomplete data. Try again or contact the project coordinator.', { kind: 'invalid-data' });
  return data;
}
const profileRecord = (value) => id(value?.student_id) && ['name', 'education_level', 'location', 'language', 'preferred_learning'].every((field) => text(value.profile?.[field])) && ['interests', 'skills', 'goals'].every((field) => texts(value.profile?.[field])) && Number.isInteger(value.profile.weekly_learning_hours);
const progressRecord = (value) => id(value?.student_id) && id(value?.course_id) && typeof value?.completed === 'boolean' && (value.score === null || Number.isInteger(value.score)) && text(value.updated_at);
export const saveProfile = async (profile) => checked(await requestJson('/profile', { method: 'POST', body: profile }), profileRecord);
export const recommend = async (profile) => checked(await requestJson('/recommendations', { method: 'POST', body: profile }), (value) => Array.isArray(value?.careers) && value.careers.every((career) => id(career.career_id) && text(career.title) && Number.isInteger(career.match_score) && career.match_score >= 0 && career.match_score <= 100 && ['reasons', 'missing_skills', 'next_steps'].every((field) => texts(career[field]))));
export const loadCourses = () => requestJson('/courses');
export async function loadOpportunities(filters = {}, options = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => String(value ?? '').trim()));
  return checked(await requestJson(`/opportunities${query.size ? `?${query}` : ''}`, options), (rows) => Array.isArray(rows) && rows.every((row) => id(row.id) && text(row.title) && typeof row.description === 'string' && ['locations', 'education_levels', 'eligibility_requirements'].every((field) => texts(row[field]))));
}
export const loadAccount = async () => checked(await requestJson('/account'), (value) => text(value?.user_id) && ['student', 'teacher'].includes(value.role));
export const loadOwnProfile = async () => checked(await requestJson('/profile'), profileRecord);
export const loadOwnProgress = async () => checked(await requestJson('/progress'), (value) => Array.isArray(value?.progress) && value.progress.every(progressRecord));
export const loadRoadmap = async (profile, career_id) => checked(await requestJson('/roadmap', { method: 'POST', body: { profile, career_id } }), (value) => value?.career_id === career_id && Array.isArray(value.modules) && value.modules.length > 0 && value.modules.every((module) => id(module.module_id) && text(module.title) && text(module.description) && Number.isFinite(module.estimated_hours)) && Array.isArray(value.weekly_plan) && value.weekly_plan.every((week) => Number.isInteger(week.week) && Array.isArray(week.items)) && Number.isFinite(value.estimated_learning_time?.total_hours) && Number.isInteger(value.estimated_learning_time?.estimated_weeks) && Array.isArray(value.warnings));
