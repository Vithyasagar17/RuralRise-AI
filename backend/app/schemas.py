"""Shared profile/career fields are preserved; other shapes are documented proposals."""
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Identifier = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$")]
ShortList = Annotated[list[Text], Field(max_length=30)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class StudentProfile(StrictModel):
    name: Text
    education_level: Text
    location: Text
    language: Text
    interests: Annotated[list[Text], Field(min_length=1, max_length=30)]
    skills: ShortList = Field(default_factory=list)
    preferred_learning: Text
    weekly_learning_hours: Annotated[int, Field(strict=True, ge=1, le=168)]
    goals: ShortList = Field(default_factory=list)


class ProfileResponse(StrictModel):
    student_id: Identifier
    profile: StudentProfile


class CareerRecommendation(StrictModel):
    career_id: Identifier
    title: Text
    match_score: Annotated[int, Field(strict=True, ge=0, le=100)]
    reasons: ShortList
    missing_skills: ShortList
    next_steps: ShortList


class RecommendationResponse(StrictModel):
    careers: list[CareerRecommendation]


class Course(StrictModel):
    id: Identifier
    title: Text
    skill: Text
    difficulty: Literal["beginner", "intermediate", "advanced"]
    lesson: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20000)]
    practical_task: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class Opportunity(StrictModel):
    id: Identifier
    title: Text
    category: Text
    description: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]
    education_levels: ShortList
    locations: ShortList
    eligibility_requirements: ShortList
    deadline: str | None
    official_url: str
    source_name: str
    last_verified: str | None


class ProgressUpdate(StrictModel):
    student_id: Identifier
    course_id: Identifier
    completed: Annotated[bool, Field(strict=True)]
    score: Annotated[int, Field(strict=True, ge=0, le=100)] | None = None


class ProgressRecord(ProgressUpdate):
    updated_at: str


class ProgressResponse(StrictModel):
    saved: bool
    progress: ProgressRecord


class StoredStudent(ProfileResponse):
    created_at: str


class StoreData(StrictModel):
    profiles: list[StoredStudent] = Field(default_factory=list)
    progress: list[ProgressRecord] = Field(default_factory=list)

    @model_validator(mode="after")
    def unique_keys(self):
        ids = [x.student_id for x in self.profiles]
        keys = [(x.student_id, x.course_id) for x in self.progress]
        if len(ids) != len(set(ids)) or len(keys) != len(set(keys)):
            raise ValueError("Duplicate storage keys")
        return self


class FacilitatorStudent(StrictModel):
    student_id: Identifier
    profile: StudentProfile
    progress: list[ProgressRecord]


class FacilitatorResponse(StrictModel):
    students: list[FacilitatorStudent]
