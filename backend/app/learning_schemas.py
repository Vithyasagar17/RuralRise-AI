"""Additive, configuration-gated roadmap contract; original API models unchanged."""
from typing import Annotated
from pydantic import Field
from .schemas import Identifier, ShortList, StrictModel, StudentProfile, Text

Hours = Annotated[float, Field(ge=0, le=1000, allow_inf_nan=False)]

class RoadmapRequest(StrictModel):
    profile: StudentProfile
    career_id: Identifier

class RoadmapModule(StrictModel):
    module_id: Identifier
    title: Text
    description: str
    level: str
    estimated_hours: Hours
    skills_taught: ShortList
    practical_task: str
    completion_criteria: str

class WeeklyItem(StrictModel):
    module_id: Identifier
    title: Text
    hours_this_week: Hours
    continues_next_week: bool
    practical_task: str

class WeeklyPlan(StrictModel):
    week: Annotated[int, Field(ge=1, le=1000)]
    planned_hours: Hours
    items: list[WeeklyItem]
    focus: str

class LearningTime(StrictModel):
    total_hours: Hours
    available_hours_per_week: Hours
    estimated_weeks: Annotated[int, Field(ge=0, le=1000)]
    note: str

class Assessment(StrictModel):
    module_id: Identifier
    title: Text
    completion_criteria: str

class RoadmapResponse(StrictModel):
    career_id: Identifier
    career_title: Text
    learning_goals: ShortList
    required_skills: ShortList
    missing_skills: ShortList
    modules: list[RoadmapModule]
    weekly_plan: list[WeeklyPlan]
    estimated_learning_time: LearningTime
    assessment_criteria: list[Assessment]
    next_steps: ShortList
    warnings: list[str]
