"""Backend-owned identity, profile ownership and teacher assignment storage."""
import json
from uuid import UUID, uuid4

from .auth import PermissionDenied, Principal
from .database import MissingStudent
from .postgres_store import _progress
from .schemas import ProfileResponse, ProgressUpdate, StudentProfile


def user_id(value):
    return str(UUID(str(value)))


class IdentityStore:
    def __init__(self, store):
        self.db = store

    def ensure_user(self, subject):
        subject = user_id(subject)
        with self.db.transaction() as cursor:
            cursor.execute("""INSERT INTO ruralrise_backend.app_users (user_id) VALUES (%s)
                ON CONFLICT (user_id) DO NOTHING""", (subject,))
            cursor.execute("SELECT app_role, is_active FROM ruralrise_backend.app_users WHERE user_id = %s", (subject,))
            row = cursor.fetchone()
            if not row or not row["is_active"] or row["app_role"] not in {"student", "teacher"}:
                raise PermissionDenied
            actor = Principal(subject, row["app_role"])
        return actor

    def set_role(self, subject, role):
        subject = user_id(subject)
        if role not in {"student", "teacher"}:
            raise ValueError("Unsupported application role")
        with self.db.transaction() as cursor:
            cursor.execute("""INSERT INTO ruralrise_backend.app_users (user_id, app_role) VALUES (%s, %s)
                ON CONFLICT (user_id) DO UPDATE SET app_role = EXCLUDED.app_role""", (subject, role))
        return {"user_id": subject, "role": role}

    def set_active(self, subject, active):
        subject = user_id(subject)
        with self.db.transaction() as cursor:
            cursor.execute("UPDATE ruralrise_backend.app_users SET is_active = %s WHERE user_id = %s RETURNING user_id",
                           (bool(active), subject))
            if cursor.fetchone() is None:
                raise MissingStudent
        return {"user_id": subject, "active": bool(active)}

    def link_profile(self, subject, student):
        subject = user_id(subject)
        with self.db.transaction() as cursor:
            cursor.execute("""SELECT user_id FROM ruralrise_backend.app_users
                WHERE user_id = %s AND app_role = 'student' AND is_active FOR UPDATE""", (subject,))
            if cursor.fetchone() is None:
                raise PermissionDenied
            cursor.execute("SELECT student_id FROM ruralrise_backend.student_profiles WHERE student_id = %s AND NOT is_demo FOR UPDATE", (student,))
            if cursor.fetchone() is None:
                raise MissingStudent
            cursor.execute("""SELECT student_id, user_id::text AS user_id FROM ruralrise_backend.student_owners
                WHERE student_id = %s OR user_id = %s""", (student, subject))
            rows = cursor.fetchall()
            if rows:
                if len(rows) == 1 and rows[0]["student_id"] == student and rows[0]["user_id"] == subject:
                    return {"student_id": student, "user_id": subject, "linked": True}
                raise PermissionDenied
            cursor.execute("INSERT INTO ruralrise_backend.student_owners (student_id, user_id) VALUES (%s, %s)", (student, subject))
        return {"student_id": student, "user_id": subject, "linked": True}

    def save_profile(self, subject, profile):
        subject = user_id(subject)
        valid = StudentProfile.model_validate(profile).model_dump()
        with self.db.transaction() as cursor:
            cursor.execute("""SELECT user_id FROM ruralrise_backend.app_users
                WHERE user_id = %s AND app_role = 'student' AND is_active FOR UPDATE""", (subject,))
            if cursor.fetchone() is None:
                raise PermissionDenied
            cursor.execute("SELECT student_id FROM ruralrise_backend.student_owners WHERE user_id = %s", (subject,))
            owned = cursor.fetchone()
            if owned:
                student_id = owned["student_id"]
                cursor.execute("UPDATE ruralrise_backend.student_profiles SET profile = %s::jsonb WHERE student_id = %s",
                               (json.dumps(valid, ensure_ascii=False), student_id))
            else:
                student_id = str(uuid4())
                cursor.execute("""INSERT INTO ruralrise_backend.student_profiles (student_id, profile)
                    VALUES (%s, %s::jsonb)""", (student_id, json.dumps(valid, ensure_ascii=False)))
                cursor.execute("INSERT INTO ruralrise_backend.student_owners (student_id, user_id) VALUES (%s, %s)",
                               (student_id, subject))
        return {"student_id": student_id, "profile": valid}

    def owned_profile(self, subject):
        with self.db.transaction() as cursor:
            cursor.execute("""SELECT p.student_id, p.profile FROM ruralrise_backend.student_profiles p
                JOIN ruralrise_backend.student_owners o ON o.student_id = p.student_id WHERE o.user_id = %s""",
                (user_id(subject),))
            row = cursor.fetchone()
            if row is None:
                raise MissingStudent
            result = ProfileResponse.model_validate(dict(row)).model_dump()
        return result

    def save_progress(self, subject, update):
        valid = ProgressUpdate.model_validate(update).model_dump()
        with self.db.transaction() as cursor:
            cursor.execute("""SELECT o.student_id FROM ruralrise_backend.student_owners o
                JOIN ruralrise_backend.app_users u ON u.user_id = o.user_id
                WHERE o.user_id = %s AND o.student_id = %s AND u.app_role = 'student' AND u.is_active FOR SHARE""",
                (user_id(subject), valid["student_id"]))
            if cursor.fetchone() is None:
                # Does not reveal whether another student's identifier exists.
                raise MissingStudent
            cursor.execute("""INSERT INTO ruralrise_backend.learning_progress
                (student_id, course_id, completed, score) VALUES (%s, %s, %s, %s)
                ON CONFLICT (student_id, course_id) DO UPDATE SET
                completed = EXCLUDED.completed, score = EXCLUDED.score, updated_at = clock_timestamp()
                RETURNING student_id, course_id, completed, score, updated_at""",
                (valid["student_id"], valid["course_id"], valid["completed"], valid["score"]))
            result = _progress(cursor.fetchone())
        return result

    def own_progress(self, subject):
        profile = self.owned_profile(subject)
        return self.db.get_progress(profile["student_id"])

    def assign_student(self, teacher, student):
        teacher = user_id(teacher)
        with self.db.transaction() as cursor:
            cursor.execute("""SELECT user_id FROM ruralrise_backend.app_users
                WHERE user_id = %s AND app_role = 'teacher' AND is_active FOR SHARE""", (teacher,))
            if cursor.fetchone() is None:
                raise PermissionDenied
            cursor.execute("""SELECT o.student_id FROM ruralrise_backend.student_owners o
                JOIN ruralrise_backend.app_users u ON u.user_id = o.user_id
                WHERE o.student_id = %s AND u.app_role = 'student' AND u.is_active FOR SHARE""", (student,))
            if cursor.fetchone() is None:
                raise MissingStudent
            cursor.execute("""INSERT INTO ruralrise_backend.teacher_student_assignments (teacher_id, student_id)
                VALUES (%s, %s) ON CONFLICT DO NOTHING""", (teacher, student))
        return {"teacher_id": teacher, "student_id": student, "assigned": True}

    def assigned_students(self, teacher):
        with self.db.transaction() as cursor:
            cursor.execute("""SELECT p.student_id, p.profile FROM ruralrise_backend.student_profiles p
                JOIN ruralrise_backend.teacher_student_assignments a ON a.student_id = p.student_id
                JOIN ruralrise_backend.app_users u ON u.user_id = a.teacher_id
                WHERE a.teacher_id = %s AND u.app_role = 'teacher' AND u.is_active ORDER BY p.student_id""",
                (user_id(teacher),))
            profiles = [ProfileResponse.model_validate(dict(row)).model_dump() for row in cursor.fetchall()]
            ids = [row["student_id"] for row in profiles]
            cursor.execute("""SELECT student_id, course_id, completed, score, updated_at
                FROM ruralrise_backend.learning_progress WHERE student_id = ANY(%s) ORDER BY course_id""", (ids,))
            progress = [_progress(row) for row in cursor.fetchall()]
        return [{**profile, "progress": [row for row in progress if row["student_id"] == profile["student_id"]]}
                for profile in profiles]

    def unassign_student(self, teacher, student):
        teacher = user_id(teacher)
        with self.db.transaction() as cursor:
            cursor.execute("DELETE FROM ruralrise_backend.teacher_student_assignments WHERE teacher_id = %s AND student_id = %s",
                           (teacher, student))
        return {"teacher_id": teacher, "student_id": student, "assigned": False}
