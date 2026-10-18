"""Deterministic, explainable career recommendations for RuralRise AI.

This module intentionally uses only the Python standard library. It can be
imported by the shared FastAPI application, or exercised directly in tests.
It does not call an LLM, train a model, or make claims about employment outcomes.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Mapping, Optional, Sequence

DATA_DIR = Path(__file__).resolve().parents[1] / "data"

# Each dimension is a transparent rule-based contribution to a 0-100 score.
SCORING_WEIGHTS = {
    "interests": 45.0,
    "skills": 30.0,
    "goals": 15.0,
    "learning_preference": 10.0,
}
SINGLE_SIGNAL_DISCOUNT = 0.75

EDUCATION_RANKS = {
    "class 8": 0,
    "class 10": 1,
    "class 12": 2,
    "diploma": 3,
    "undergraduate": 4,
    "graduate": 4,
    "postgraduate": 5,
}


def _read_json(path: Path) -> Any:
    """Read a UTF-8 JSON file and provide a clearer error if it is invalid."""
    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError as exc:
        raise FileNotFoundError(f"Required RuralRise data file was not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Invalid JSON in {path} at line {exc.lineno}, column {exc.colno}: {exc.msg}"
        ) from exc


def load_careers(path: Optional[str | Path] = None) -> list[dict[str, Any]]:
    """Load and minimally validate the career dataset."""
    source = Path(path) if path is not None else DATA_DIR / "careers.json"
    payload = _read_json(source)
    # The integrated FastAPI catalog contract is a top-level JSON array. The
    # standalone component also accepts the original metadata-wrapped format.
    records = payload if isinstance(payload, list) else payload.get("careers") if isinstance(payload, dict) else None
    if not isinstance(records, list) or not records:
        raise ValueError(f"{source} must contain a non-empty careers list or array")
    seen: set[str] = set()
    for item in records:
        if not isinstance(item, dict) or not item.get("career_id") or not item.get("title"):
            raise ValueError(f"Every career in {source} needs 'career_id' and 'title'")
        career_id = str(item["career_id"])
        if career_id in seen:
            raise ValueError(f"Duplicate career_id in {source}: {career_id}")
        seen.add(career_id)
    return records


def load_courses(path: Optional[str | Path] = None) -> dict[str, Any]:
    """Load the curated learning-module dataset."""
    # Member 3's courses.json is the strict six-field API catalog used by
    # GET /courses and progress tracking. Keep it unchanged. Roadmap modules
    # therefore live in a separate richer dataset.
    source = Path(path) if path is not None else DATA_DIR / "career_learning_modules.json"
    payload = _read_json(source)
    records = payload if isinstance(payload, list) else payload.get("courses") if isinstance(payload, dict) else None
    if not isinstance(records, list):
        raise ValueError(f"{source} must contain a 'courses' list or a module array")
    return payload


def _normalise_term(value: Any) -> str:
    """Lowercase a term and standardise punctuation/spacing for comparisons."""
    if not isinstance(value, str):
        return ""
    value = value.strip().lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def _term_matches(left: Any, right: Any) -> bool:
    """Compare whole normalised phrases, allowing a phrase inside a longer one."""
    a = _normalise_term(left)
    b = _normalise_term(right)
    if not a or not b:
        return False
    return a == b or f" {a} " in f" {b} " or f" {b} " in f" {a} "


def _clean_string_list(
    value: Any, field_name: str, warnings: list[str]
) -> list[str]:
    """Clean a list field while recovering safely from common beginner inputs."""
    if value is None:
        return []
    if isinstance(value, str):
        value = [value]
        warnings.append(f"'{field_name}' was a string; it was treated as a one-item list.")
    if not isinstance(value, (list, tuple, set)):
        warnings.append(f"'{field_name}' must be a list of strings; the value was ignored.")
        return []

    result: list[str] = []
    seen: set[str] = set()
    for item in value:
        if not isinstance(item, str):
            warnings.append(f"A non-string item in '{field_name}' was ignored.")
            continue
        cleaned = item.strip()
        key = _normalise_term(cleaned)
        if cleaned and key not in seen:
            result.append(cleaned)
            seen.add(key)
    return result


def _normalise_profile(profile: Any) -> tuple[dict[str, Any], list[str]]:
    """Validate profile fields without requiring a name or rejecting partial profiles."""
    warnings: list[str] = []
    if profile is None:
        profile = {}
        warnings.append("No student profile was supplied; recommendations need more information.")
    elif not isinstance(profile, Mapping):
        profile = {}
        warnings.append("Student profile must be a JSON object; it was treated as an empty profile.")

    normalised: dict[str, Any] = {
        "name": profile.get("name") if isinstance(profile.get("name"), str) else None,
        "education_level": profile.get("education_level", ""),
        "location": profile.get("location", ""),
        "language": profile.get("language", ""),
        "interests": _clean_string_list(profile.get("interests"), "interests", warnings),
        "skills": _clean_string_list(profile.get("skills"), "skills", warnings),
        "goals": _clean_string_list(profile.get("goals"), "goals", warnings),
        "preferred_learning": profile.get("preferred_learning", ""),
        "weekly_learning_hours": profile.get("weekly_learning_hours"),
    }
    for field in ("education_level", "location", "language", "preferred_learning"):
        value = normalised[field]
        if value is None:
            normalised[field] = ""
        elif not isinstance(value, str):
            warnings.append(f"'{field}' must be text; the value was ignored.")
            normalised[field] = ""
        else:
            normalised[field] = value.strip()

    hours = normalised["weekly_learning_hours"]
    if isinstance(hours, bool) or not isinstance(hours, (int, float)) or hours <= 0:
        if hours not in (None, ""):
            warnings.append("'weekly_learning_hours' must be a positive number; a 3-hour default was used.")
        else:
            warnings.append("Weekly learning time was not provided; a planning default of 3 hours was used.")
        normalised["weekly_learning_hours"] = 3.0
    else:
        normalised["weekly_learning_hours"] = min(float(hours), 80.0)
        if float(hours) > 80:
            warnings.append("'weekly_learning_hours' exceeded 80; it was capped at 80 for planning.")

    return normalised, warnings


def _as_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if isinstance(item, str) and item.strip()]


def _matching_values(student_values: Sequence[str], career_values: Sequence[str]) -> list[str]:
    """Return student-provided values that match at least one dataset value."""
    return [
        value for value in student_values
        if any(_term_matches(value, career_value) for career_value in career_values)
    ]


def _education_rank(value: str) -> Optional[int]:
    return EDUCATION_RANKS.get(_normalise_term(value))


def _check_prerequisites(profile: Mapping[str, Any], career: Mapping[str, Any]) -> dict[str, Any]:
    """Check only mandatory education requirements explicitly recorded in the data."""
    rules = career.get("education_prerequisites")
    rules = rules if isinstance(rules, dict) else {}
    minimum = rules.get("minimum_level")
    mandatory = rules.get("mandatory") is True
    note = rules.get("notes")
    note = note if isinstance(note, str) else "Verify formal entry requirements with the relevant training provider or employer."

    if not minimum or not mandatory:
        return {"status": "not_specified", "items": [], "note": note, "penalty": 0.0}

    student_rank = _education_rank(str(profile.get("education_level", "")))
    minimum_rank = _education_rank(str(minimum))
    if student_rank is None or minimum_rank is None:
        return {
            "status": "unknown", "items": [f"Verify the recorded minimum education level: {minimum}."],
            "note": note, "penalty": 7.5,
        }
    if student_rank < minimum_rank:
        return {
            "status": "not_met",
            "items": [f"The dataset records {minimum} as a mandatory minimum; this profile lists {profile.get('education_level') or 'no education level'}."],
            "note": note,
            "penalty": 15.0,
        }
    return {"status": "met", "items": [], "note": note, "penalty": 0.0}


def _score_career(profile: Mapping[str, Any], career: Mapping[str, Any]) -> dict[str, Any]:
    interests = profile["interests"]
    skills = profile["skills"]
    goals = profile["goals"]
    preferred_learning = profile["preferred_learning"]

    career_interests = _as_list(career.get("interests"))
    career_relevant_skills = _as_list(career.get("relevant_skills"))
    career_goal_tags = _as_list(career.get("goal_tags"))
    career_learning_modes = _as_list(career.get("learning_preferences"))

    matched_interests = _matching_values(interests, career_interests)
    matched_skills = _matching_values(skills, career_relevant_skills)
    matched_goals = _matching_values(goals, career_goal_tags)
    learning_match = bool(
        preferred_learning and any(_term_matches(preferred_learning, mode) for mode in career_learning_modes)
    )

    # Fixed weights keep the score explainable and comparable across profiles.
    # Missing profile dimensions contribute zero instead of inflating a partial profile.
    interest_ratio = len(matched_interests) / len(interests) if interests else 0.0
    skill_ratio = len(matched_skills) / len(skills) if skills else 0.0
    goal_ratio = len(matched_goals) / len(goals) if goals else 0.0
    learning_ratio = 1.0 if learning_match else 0.0
    base_score = (
        SCORING_WEIGHTS["interests"] * interest_ratio
        + SCORING_WEIGHTS["skills"] * skill_ratio
        + SCORING_WEIGHTS["goals"] * goal_ratio
        + SCORING_WEIGHTS["learning_preference"] * learning_ratio
    )

    supplied_dimensions = sum(bool(profile[field]) for field in ("interests", "skills", "goals", "preferred_learning"))
    evidence_strength = "strong" if supplied_dimensions >= 3 else "moderate" if supplied_dimensions == 2 else "limited"
    if supplied_dimensions == 1:
        base_score *= SINGLE_SIGNAL_DISCOUNT

    prereq = _check_prerequisites(profile, career)
    final_score = max(0.0, min(100.0, base_score - prereq["penalty"]))

    required_skills = _as_list(career.get("required_skills"))
    missing_skills = [
        required for required in required_skills
        if not any(_term_matches(required, student_skill) for student_skill in skills)
    ]

    reasons: list[str] = []
    if matched_interests:
        reasons.append("Interest match: " + ", ".join(matched_interests) + ".")
    if matched_skills:
        reasons.append("Related existing skills: " + ", ".join(matched_skills) + ".")
    if matched_goals:
        reasons.append("Goal alignment: " + ", ".join(matched_goals) + ".")
    if learning_match:
        reasons.append(f"The {preferred_learning} learning preference is supported by this pathway's learning modes.")
    if not reasons:
        reasons.append("There is no direct match in the supplied profile; treat this as a weak exploratory option.")
    if prereq["status"] in ("not_met", "unknown"):
        reasons.append("Check the listed education requirement before committing to a training route.")

    practical_steps = _as_list(career.get("practical_next_steps"))
    next_steps: list[str] = []
    if missing_skills:
        next_steps.append(f"Start by learning: {missing_skills[0]}.")
    next_steps.extend(practical_steps)

    return {
        "career_id": str(career["career_id"]),
        "title": str(career["title"]),
        "description": str(career.get("description", "")),
        "match_score": int(round(final_score)),
        "reasons": reasons,
        "matched_interests": matched_interests,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "prerequisites": prereq["items"],
        "prerequisite_status": prereq["status"],
        "prerequisite_note": prereq["note"],
        "evidence_strength": evidence_strength,
        "next_steps": list(dict.fromkeys(next_steps)),
        "opportunity_categories": _as_list(career.get("opportunity_categories")),
    }


def recommend_careers(
    profile: Any,
    careers: Optional[Sequence[Mapping[str, Any]] | Mapping[str, Any]] = None,
    top_k: int = 3,
) -> dict[str, Any]:
    """Return a transparent ranked list of career pathways for a student profile.

    Args:
        profile: Mapping in the RuralRise student-profile format. The name is optional.
        careers: Optional list of career records, or dataset object with a 'careers' list.
                 When omitted, backend/data/careers.json is loaded.
        top_k: Maximum number of recommendations to return.

    Returns:
        JSON-serialisable dictionary containing 'careers', 'warnings', 'message', and
        'score_note'. Match scores are rule-based fit indicators, not probabilities.
    """
    cleaned_profile, warnings = _normalise_profile(profile)
    if isinstance(top_k, bool) or not isinstance(top_k, int) or top_k < 1:
        raise ValueError("top_k must be a positive integer")

    if careers is None:
        career_records: Sequence[Mapping[str, Any]] = load_careers()
    elif isinstance(careers, Mapping):
        records = careers.get("careers")
        if not isinstance(records, list):
            raise ValueError("The careers argument must contain a 'careers' list")
        career_records = records
    elif isinstance(careers, Sequence) and not isinstance(careers, (str, bytes)):
        career_records = careers
    else:
        raise ValueError("careers must be a list of career records or a dataset object")

    signal_count = sum(
        bool(cleaned_profile[field])
        for field in ("interests", "skills", "goals", "preferred_learning")
    )
    if signal_count == 0:
        warnings.append("Add at least one interest, skill, goal, or learning preference for meaningful matching.")
        return {
            "careers": [],
            "warnings": list(dict.fromkeys(warnings)),
            "message": "Not enough career-matching information is available yet. Add interests, skills, goals, or a learning preference.",
            "score_note": "Scores are rule-based fit indicators from 0 to 100, not probabilities of success or job-placement chances.",
        }

    scored: list[dict[str, Any]] = []
    for career in career_records:
        if not isinstance(career, Mapping) or not career.get("career_id") or not career.get("title"):
            warnings.append("A malformed career record was skipped because it lacked career_id or title.")
            continue
        scored.append(_score_career(cleaned_profile, career))

    # Stable sorting preserves the dataset order when two scores are tied.
    scored.sort(key=lambda record: record["match_score"], reverse=True)
    positive = [record for record in scored if record["match_score"] > 0]
    selected = positive[:top_k]
    if not selected:
        warnings.append("No direct matches were found in the supplied data; review the profile terms and career tags.")
        message = "No strong direct match was found. Add more detail or review the curated career tags before relying on a ranking."
    else:
        message = "Recommendations are ranked using the profile fields supplied. Review prerequisites and missing skills before choosing a path."
        if signal_count == 1:
            warnings.append("The profile has only one matching-information category; rankings are low-confidence and exploratory.")

    return {
        "careers": selected,
        "warnings": list(dict.fromkeys(warnings)),
        "message": message,
        "score_note": "Scores are rule-based fit indicators from 0 to 100, not probabilities of success or job-placement chances.",
    }


def _resolve_career(career: Any, careers: Optional[Sequence[Mapping[str, Any]] | Mapping[str, Any]]) -> Mapping[str, Any]:
    if isinstance(career, Mapping):
        if not (career.get("career_id") and career.get("title")):
            raise ValueError("career dictionary must include 'career_id' and 'title'")
        # Recommendation result objects contain the public display fields but do not
        # repeat the entire knowledge-base record. Merge missing canonical fields so
        # passing result["careers"][0] directly still generates a complete roadmap.
        career_id = str(career["career_id"])
        try:
            canonical_records = load_careers()
        except (FileNotFoundError, ValueError):
            canonical_records = []
        canonical = next(
            (item for item in canonical_records if item.get("career_id") == career_id),
            None,
        )
        if canonical is None:
            return career
        merged = dict(canonical)
        merged.update(career)
        for required_field in (
            "required_skills", "relevant_skills", "education_prerequisites",
            "learning_modules", "practical_next_steps", "opportunity_categories",
        ):
            if required_field not in career:
                merged[required_field] = canonical.get(required_field)
        return merged

    if not isinstance(career, str) or not career.strip():
        raise ValueError("career must be a career record or a non-empty career_id string")
    if careers is None:
        records: Sequence[Mapping[str, Any]] = load_careers()
    elif isinstance(careers, Mapping):
        raw = careers.get("careers")
        if not isinstance(raw, list):
            raise ValueError("The careers argument must contain a 'careers' list")
        records = raw
    else:
        records = careers
    for item in records:
        if isinstance(item, Mapping) and item.get("career_id") == career.strip():
            return item
    raise ValueError(f"Career ID '{career}' was not found in the supplied career dataset")


def _round_hours(value: float) -> float:
    return round(value, 2)


def generate_learning_roadmap(
    profile: Any,
    career: Any,
    courses: Optional[Sequence[Mapping[str, Any]] | Mapping[str, Any]] = None,
) -> dict[str, Any]:
    """Build a deterministic, ordered roadmap from curated course-module data.

    Args:
        profile: Student profile; weekly_learning_hours influences scheduling.
        career: Career dictionary (recommended) or stable career_id string.
        courses: Optional list of course modules, or object with a 'courses' list.
                 When omitted, backend/data/career_learning_modules.json is loaded.

    Returns:
        JSON-serialisable career roadmap with ordered modules, skills to develop,
        a week-by-week schedule, estimated time, assessments, and next steps.
    """
    cleaned_profile, warnings = _normalise_profile(profile)
    career_record = _resolve_career(career, None)

    if courses is None:
        course_records: Sequence[Mapping[str, Any]] = load_courses()["courses"]
    elif isinstance(courses, Mapping):
        raw_courses = courses.get("courses")
        if not isinstance(raw_courses, list):
            raise ValueError("The courses argument must contain a 'courses' list")
        course_records = raw_courses
    elif isinstance(courses, Sequence) and not isinstance(courses, (str, bytes)):
        course_records = courses
    else:
        raise ValueError("courses must be a list of modules or a dataset object")

    career_id = str(career_record["career_id"])
    selected_modules: list[Mapping[str, Any]] = []
    seen_module_ids: set[str] = set()
    for module in course_records:
        if not isinstance(module, Mapping):
            warnings.append("A malformed course record was skipped.")
            continue
        module_id = module.get("module_id")
        targets = module.get("career_ids", [])
        if not isinstance(targets, list):
            targets = []
        if career_id in targets or "all" in targets:
            if not module_id or str(module_id) in seen_module_ids:
                warnings.append(f"Duplicate or missing module_id skipped for career '{career_id}'.")
                continue
            try:
                estimate = float(module.get("estimated_hours", 0))
            except (TypeError, ValueError):
                estimate = 0.0
            if estimate <= 0:
                warnings.append(f"Module '{module_id}' has invalid estimated_hours and was skipped.")
                continue
            selected_modules.append(module)
            seen_module_ids.add(str(module_id))

    selected_modules.sort(key=lambda item: (int(item.get("sequence", 9999)), str(item.get("module_id", ""))))
    if not selected_modules:
        warnings.append(f"No curated learning modules were found for career '{career_id}'.")

    required_skills = _as_list(career_record.get("required_skills"))
    missing_skills = [
        required for required in required_skills
        if not any(_term_matches(required, existing) for existing in cleaned_profile["skills"])
    ]
    if cleaned_profile["skills"]:
        learning_goals = [f"Develop or demonstrate {skill}." for skill in missing_skills]
    else:
        learning_goals = [f"Develop or demonstrate {skill}; existing experience has not yet been recorded." for skill in required_skills]
    if not learning_goals:
        learning_goals = ["Practise the core skills for this pathway and review the module completion criteria."]

    roadmap_modules: list[dict[str, Any]] = []
    for module in selected_modules:
        roadmap_modules.append({
            "module_id": str(module["module_id"]),
            "title": str(module.get("title", "Untitled module")),
            "description": str(module.get("description", "")),
            "level": str(module.get("level", "foundation")),
            "estimated_hours": _round_hours(float(module["estimated_hours"])),
            "skills_taught": _as_list(module.get("skills_taught")),
            "practical_task": str(module.get("practical_task", "Complete the module practice activity.")),
            "completion_criteria": str(module.get("completion_criteria", "Review the lesson and complete its practice task.")),
        })

    weekly_hours = float(cleaned_profile["weekly_learning_hours"])
    total_hours = sum(item["estimated_hours"] for item in roadmap_modules)
    weekly_plan: list[dict[str, Any]] = []

    # Allocate modules sequentially; a module can span multiple weeks if it is
    # longer than the available weekly study time. The order is never changed.
    current_week: dict[str, Any] = {"week": 1, "planned_hours": 0.0, "items": []}
    for module in roadmap_modules:
        remaining = float(module["estimated_hours"])
        while remaining > 0.00001:
            capacity = weekly_hours - current_week["planned_hours"]
            if capacity <= 0.00001:
                current_week["planned_hours"] = _round_hours(current_week["planned_hours"])
                weekly_plan.append(current_week)
                current_week = {"week": len(weekly_plan) + 1, "planned_hours": 0.0, "items": []}
                capacity = weekly_hours
            allocation = min(remaining, capacity)
            remaining_after = max(0.0, remaining - allocation)
            current_week["items"].append({
                "module_id": module["module_id"],
                "title": module["title"],
                "hours_this_week": _round_hours(allocation),
                "continues_next_week": remaining_after > 0.00001,
                "practical_task": module["practical_task"] if remaining_after <= 0.00001 else "Continue the module; finish its practical task when the module is complete.",
            })
            current_week["planned_hours"] += allocation
            remaining = remaining_after
    if current_week["items"]:
        current_week["planned_hours"] = _round_hours(current_week["planned_hours"])
        weekly_plan.append(current_week)

    for week in weekly_plan:
        unique_titles = list(dict.fromkeys(item["title"] for item in week["items"]))
        week["focus"] = ", ".join(unique_titles)

    practical_next_steps = _as_list(career_record.get("practical_next_steps"))
    next_steps = list(practical_next_steps)
    if roadmap_modules:
        next_steps.insert(0, f"Begin with '{roadmap_modules[0]['title']}' and complete its practical task.")
    next_steps.append("Verify any formal course, certification, or employer requirements before paying for training.")

    return {
        "career_id": career_id,
        "career_title": str(career_record["title"]),
        "learning_goals": learning_goals,
        "required_skills": required_skills,
        "missing_skills": missing_skills,
        "modules": roadmap_modules,
        "weekly_plan": weekly_plan,
        "estimated_learning_time": {
            "total_hours": _round_hours(total_hours),
            "available_hours_per_week": _round_hours(weekly_hours),
            "estimated_weeks": len(weekly_plan),
            "note": "Estimates are planning guidance based on the curated module data, not a promise of mastery or accreditation.",
        },
        "assessment_criteria": [
            {"module_id": item["module_id"], "title": item["title"], "completion_criteria": item["completion_criteria"]}
            for item in roadmap_modules
        ],
        "next_steps": list(dict.fromkeys(next_steps)),
        "warnings": list(dict.fromkeys(warnings)),
    }
