-- Stage 2 migration, run using: python -m app.db_tools migrate
-- The runner supplies the transaction, advisory lock and checksum metadata.
-- No public tables or teammate schemas are altered. An existing untracked
-- ruralrise_backend schema causes migration to stop, rather than overwrite it.
CREATE SCHEMA ruralrise_backend;
REVOKE ALL ON SCHEMA ruralrise_backend FROM PUBLIC;

CREATE TABLE ruralrise_backend.schema_migrations (
    version integer PRIMARY KEY,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE ruralrise_backend.student_profiles (
    student_id text PRIMARY KEY CHECK (student_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$'),
    profile jsonb NOT NULL CHECK (jsonb_typeof(profile) = 'object'),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    is_demo boolean NOT NULL DEFAULT false
);

CREATE TABLE ruralrise_backend.learning_progress (
    student_id text NOT NULL REFERENCES ruralrise_backend.student_profiles(student_id),
    course_id text NOT NULL CHECK (course_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$'),
    completed boolean NOT NULL,
    score integer CHECK (score BETWEEN 0 AND 100),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (student_id, course_id)
);
-- Course existence is checked against Member 4's JSON catalog at the API/import
-- boundary. No duplicate SQL copy of that catalog is introduced in this stage.

ALTER TABLE ruralrise_backend.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruralrise_backend.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruralrise_backend.learning_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA ruralrise_backend FROM PUBLIC;

-- Supabase roles are absent on ordinary PostgreSQL, so revoke only if present.
DO $migration$
DECLARE role_name text;
BEGIN
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('REVOKE ALL ON SCHEMA ruralrise_backend FROM %I', role_name);
            EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA ruralrise_backend FROM %I', role_name);
        END IF;
    END LOOP;
END
$migration$;
