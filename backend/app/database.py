"""Storage boundary: single-process JSON or an explicitly selected PostgreSQL adapter."""
import json
import logging
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from uuid import uuid4

from pydantic import ValidationError
from .schemas import StoreData

logger = logging.getLogger(__name__)


class StorageUnavailable(Exception):
    pass


class MissingStudent(Exception):
    pass


def create_store(settings):
    if settings.storage_backend == "json":
        return JsonStore(settings.storage_file)
    # Optional driver is required only in PostgreSQL mode; never fall back to JSON.
    from .postgres_store import PostgresStore
    return PostgresStore(settings)


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def demo_profiles():
    """Only these two fictional identities are visible through facilitator mode."""
    return [
        {"student_id": "demo-student-001", "profile": {
            "name": "Demo Student", "education_level": "Class 12", "location": "Tamil Nadu",
            "language": "Tamil", "interests": ["electronics", "hands-on work"],
            "skills": ["basic mathematics"], "preferred_learning": "practical",
            "weekly_learning_hours": 5, "goals": ["find vocational training"]}},
        {"student_id": "demo-student-002", "profile": {
            "name": "Fictional Learner", "education_level": "Class 10", "location": "Tamil Nadu",
            "language": "Tamil", "interests": ["agriculture"], "skills": [],
            "preferred_learning": "practical", "weekly_learning_hours": 3,
            "goals": ["explore learning pathways"]}},
    ]


class JsonStore:
    def __init__(self, path: Path):
        self.path = path
        self.lock = RLock()

    def _read(self):
        if not self.path.exists():
            return StoreData().model_dump()
        # Never reset or overwrite corrupt storage automatically.
        raw = json.loads(self.path.read_text(encoding="utf-8"))
        return StoreData.model_validate(raw).model_dump()

    def _write(self, state):
        validated = StoreData.model_validate(state).model_dump()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=self.path.parent,
                                             prefix=".store-", suffix=".tmp", delete=False) as handle:
                temp_path = Path(handle.name)
                json.dump(validated, handle, ensure_ascii=False, indent=2, allow_nan=False)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temp_path, self.path)
        finally:
            if temp_path and temp_path.exists():
                temp_path.unlink()

    def _transaction(self, operation, write=False):
        try:
            with self.lock:
                state = self._read()
                result = operation(state)
                if write:
                    self._write(state)
                return result
        except (OSError, ValueError, ValidationError, TypeError) as exc:
            logger.error("Demo storage could not be read or written: %s", type(exc).__name__)
            raise StorageUnavailable from exc

    def create_profile(self, profile):
        def operation(state):
            record = {"student_id": str(uuid4()), "profile": profile, "created_at": utc_now()}
            state["profiles"].append(record)
            return {"student_id": record["student_id"], "profile": record["profile"]}
        return self._transaction(operation, write=True)

    def save_progress(self, update):
        def operation(state):
            allowed = {p["student_id"] for p in state["profiles"]} | {p["student_id"] for p in demo_profiles()}
            if update["student_id"] not in allowed:
                raise MissingStudent
            record = {**update, "updated_at": utc_now()}
            state["progress"] = [p for p in state["progress"] if
                                 (p["student_id"], p["course_id"]) !=
                                 (record["student_id"], record["course_id"])]
            state["progress"].append(record)
            return record
        return self._transaction(operation, write=True)

    def facilitator_students(self):
        def operation(state):
            # Deliberately excludes every user-submitted profile. No real access control exists yet.
            return [{**p, "progress": [r for r in state["progress"] if r["student_id"] == p["student_id"]]}
                    for p in demo_profiles()]
        return self._transaction(operation)
