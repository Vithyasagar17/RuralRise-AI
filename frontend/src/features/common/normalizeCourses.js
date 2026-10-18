// Shared by the facilitator dashboard and the offline lesson reader.
// Validates GET /courses (Member 3 contract: array of Course). Kept separate so
// both features use exactly the same rules.

const cleanText = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** Validates GET /courses (an array). Invalid items are dropped. Throws on a non-array. */
export function normalizeCourses(json) {
  if (!Array.isArray(json)) throw new TypeError('Expected an array of courses');
  const seen = new Set();
  return json.flatMap((c) => {
    if (!isPlainObject(c)) return [];
    const id = cleanText(c.id);
    const title = cleanText(c.title);
    if (!id || !title || seen.has(id)) return [];
    seen.add(id);
    return [{
      id,
      title,
      skill: cleanText(c.skill),
      difficulty: cleanText(c.difficulty),
      lesson: cleanText(c.lesson) ?? '',
      practical_task: cleanText(c.practical_task) ?? '',
    }];
  });
}

