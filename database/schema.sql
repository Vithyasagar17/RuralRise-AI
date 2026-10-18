-- PROPOSED PostgreSQL/Supabase migration scaffold. Not executed or connected.
-- Review with the team; never apply over an existing schema without review.
-- Backend currently uses JSON storage and does not read DATABASE_URL.
BEGIN;
CREATE TABLE student_profiles (
    student_id uuid PRIMARY KEY,
    profile jsonb NOT NULL CHECK (jsonb_typeof(profile) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE courses (
    course_id text PRIMARY KEY,
    content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object')
);
CREATE TABLE learning_progress (
    student_id uuid NOT NULL REFERENCES student_profiles(student_id),
    course_id text NOT NULL REFERENCES courses(course_id),
    completed boolean NOT NULL,
    score integer CHECK (score BETWEEN 0 AND 100),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, course_id)
);
CREATE TABLE opportunities (
    opportunity_id text PRIMARY KEY,
    content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object')
);
CREATE TABLE facilitator_students (
    facilitator_id uuid NOT NULL,
    student_id uuid NOT NULL REFERENCES student_profiles(student_id),
    PRIMARY KEY (facilitator_id, student_id)
);
-- No public policies. Identity provider mapping and server role remain team work.
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilitator_students ENABLE ROW LEVEL SECURITY;
COMMIT;
