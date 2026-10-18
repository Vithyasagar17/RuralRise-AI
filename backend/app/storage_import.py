"""Validate a Stage 1 JSON snapshot before any PostgreSQL writes."""
import json
from datetime import datetime
from pathlib import Path

from .database import demo_profiles
from .schemas import StoreData


def timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("Import timestamps must include a timezone.")
    return parsed


def load_snapshot(path: Path, course_ids: set[str]):
    # Missing/corrupt files are errors, not an empty migration.
    state = StoreData.model_validate(json.loads(path.read_text(encoding="utf-8"))).model_dump()
    demo_ids = {item["student_id"] for item in demo_profiles()}
    profile_ids = {item["student_id"] for item in state["profiles"]}
    if profile_ids & demo_ids:
        raise ValueError("Saved profiles must not reuse reserved fictional demo IDs.")
    for item in state["profiles"]:
        timestamp(item["created_at"])
    for item in state["progress"]:
        timestamp(item["updated_at"])
        if item["student_id"] not in profile_ids | demo_ids:
            raise ValueError("Progress refers to an unknown student.")
        if item["course_id"] not in course_ids:
            raise ValueError("Progress refers to an unknown course.")
    return state
