-- Opt-in authentication migration, run through: python -m app.db_tools migrate-auth
-- Migration 001 remains unchanged. Roles are backend-managed, not taken from a
-- caller's body, user_metadata, or unverified JWT claims.
CREATE TABLE ruralrise_backend.app_users (
    user_id uuid PRIMARY KEY,
    app_role text NOT NULL DEFAULT 'student' CHECK (app_role IN ('student', 'teacher')),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE ruralrise_backend.student_owners (
    student_id text PRIMARY KEY REFERENCES ruralrise_backend.student_profiles(student_id),
    user_id uuid NOT NULL UNIQUE REFERENCES ruralrise_backend.app_users(user_id)
);
CREATE TABLE ruralrise_backend.teacher_student_assignments (
    teacher_id uuid NOT NULL REFERENCES ruralrise_backend.app_users(user_id),
    student_id text NOT NULL REFERENCES ruralrise_backend.student_owners(student_id),
    PRIMARY KEY (teacher_id, student_id)
);
ALTER TABLE ruralrise_backend.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruralrise_backend.student_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruralrise_backend.teacher_student_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA ruralrise_backend FROM PUBLIC;
DO $identity$
DECLARE role_name text;
BEGIN
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA ruralrise_backend FROM %I', role_name);
        END IF;
    END LOOP;
END
$identity$;
