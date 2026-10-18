"""Proposed opt-in account read responses; shared existing schemas are untouched."""
from typing import Literal
from .schemas import StrictModel, ProgressRecord


class AccountResponse(StrictModel):
    user_id: str
    role: Literal["student", "teacher"]


class ProgressList(StrictModel):
    progress: list[ProgressRecord]
