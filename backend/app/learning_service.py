"""Validate the module/course bridge before calling the unchanged Member 2 engine."""
import json
import math
from pydantic import TypeAdapter
from . import career_engine
from .learning_schemas import RoadmapResponse
from .schemas import Course

def extend_courses(settings, original):
    if not settings.enable_learning_routes:
        return original
    raw = json.loads((settings.data_dir / 'practice_courses.json').read_text(encoding='utf-8'))
    courses = [item.model_dump() for item in TypeAdapter(list[Course]).validate_python(raw)]
    combined = [*original, *courses]
    ids = [row['id'] for row in combined]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate lesson identifier')
    return combined

def build_roadmap(settings, profile, career_id, careers, courses):
    career = next((row for row in careers if row.get('career_id') == career_id), None)
    if career is None:
        raise KeyError('Unknown career')
    payload = json.loads((settings.data_dir / 'career_learning_modules.json').read_text(encoding='utf-8'))
    modules = payload.get('courses') if isinstance(payload, dict) else None
    if not isinstance(modules, list) or len(modules) > 100:
        raise ValueError('Invalid module catalog')
    seen = set(); selected = []; total = 0.0
    course_ids = {row['id'] for row in courses}
    for module in modules:
        if not isinstance(module, dict) or not isinstance(module.get('career_ids'), list):
            raise ValueError('Invalid module record')
        module_id = module.get('module_id')
        if not isinstance(module_id, str) or not module_id or module_id in seen:
            raise ValueError('Invalid or duplicate module identifier')
        seen.add(module_id)
        hours = module.get('estimated_hours')
        sequence = module.get('sequence')
        if isinstance(hours, bool) or not isinstance(hours, (int, float)) or not math.isfinite(hours) or not 0 < hours <= 100:
            raise ValueError('Invalid module duration')
        if isinstance(sequence, bool) or not isinstance(sequence, int) or not 1 <= sequence <= 100:
            raise ValueError('Invalid module order')
        if career_id in module['career_ids'] or 'all' in module['career_ids']:
            if module_id not in course_ids:
                raise ValueError('A roadmap lesson is unavailable')
            selected.append(module_id); total += hours
    if not selected or total > 500 or any(mid not in selected for mid in career.get('learning_modules', [])):
        raise ValueError('Incomplete or unbounded learning pathway')
    result = career_engine.generate_learning_roadmap(profile, career, {'courses': modules})
    return RoadmapResponse.model_validate(result)
