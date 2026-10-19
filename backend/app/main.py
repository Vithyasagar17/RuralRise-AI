"""Member 3 API. Demo compatibility or opt-in Supabase authentication/ownership."""
import json
import logging
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import TypeAdapter, ValidationError

from . import career_engine, opportunity_engine
from .config import Settings
from .auth import AuthUnavailable, InvalidToken, PermissionDenied, SupabaseAuthenticator
from .database import create_store, MissingStudent, StorageUnavailable
from .recommendation_adapter import public_recommendations
from .learning_service import extend_courses, build_roadmap
from .schemas import (Course, FacilitatorResponse, Opportunity, ProfileResponse, ProgressResponse,
                      ProgressUpdate, RecommendationResponse, StudentProfile)

logger = logging.getLogger(__name__)
FilterText = Annotated[str | None, Query(min_length=1, max_length=200)]


class DatasetUnavailable(Exception):
    pass


class EngineUnavailable(Exception):
    pass


def read_catalog(data_dir: Path, name: str, model=None):
    try:
        data = json.loads((data_dir / name).read_text(encoding="utf-8"))
        if not isinstance(data, list):
            raise ValueError("Catalog must be an array")
        if model:
            data = TypeAdapter(list[model]).validate_python(data)
            data = [item.model_dump() for item in data]
        elif any(not isinstance(x, dict) or not isinstance(x.get("id"), str)
                 or not isinstance(x.get("title"), str) for x in data):
            raise ValueError("Career mock needs id and title")
        ids = [x["id"] for x in data]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate catalog id")
        return data
    except (OSError, ValueError, ValidationError, TypeError) as exc:
        logger.error("Catalog %s unavailable: %s", name, type(exc).__name__)
        raise DatasetUnavailable from exc


def create_app(settings: Settings | None = None):
    settings = settings or Settings.from_env()
    api = FastAPI(title="RuralRise AI Backend", version="0.3.0",
                  description="Member 3 backend. Authentication is opt-in; catalogs/engines may still be fixtures.")
    api.state.settings = settings
    api.state.store = create_store(settings)
    if settings.auth_mode == "supabase":
        from .identity_store import IdentityStore
        api.state.identities = IdentityStore(api.state.store)
        api.state.authenticator = SupabaseAuthenticator(settings)
        bearer = HTTPBearer(auto_error=False)

        def current_actor(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
            if credentials is None:
                raise InvalidToken
            subject = api.state.authenticator.verify(credentials.credentials)
            return api.state.identities.ensure_user(subject)
    else:
        def current_actor():
            return None

    def student_only(actor):
        if actor is not None and actor.role != "student":
            raise PermissionDenied
    api.add_middleware(CORSMiddleware, allow_origins=list(settings.cors_origins),
                       allow_credentials=False, allow_methods=["GET", "POST"],
                       allow_headers=["Content-Type", "Authorization"])

    @api.exception_handler(InvalidToken)
    async def invalid_token(request, exc):
        return JSONResponse(status_code=401, content={"detail": "A valid login access token is required."},
                            headers={"WWW-Authenticate": "Bearer"})

    @api.exception_handler(AuthUnavailable)
    async def auth_unavailable(request, exc):
        return JSONResponse(status_code=503, content={"detail": "Authentication service is unavailable."})

    @api.exception_handler(PermissionDenied)
    async def permission_denied(request, exc):
        return JSONResponse(status_code=403, content={"detail": "Permission denied."})

    @api.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc):
        # Exclude raw submitted values from error responses.
        issues = [{"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
        return JSONResponse(status_code=422, content={"detail": issues})

    @api.exception_handler(DatasetUnavailable)
    async def dataset_error(request, exc):
        return JSONResponse(status_code=503, content={"detail": "Required dataset is unavailable or invalid."})

    @api.exception_handler(StorageUnavailable)
    async def storage_error(request, exc):
        return JSONResponse(status_code=503, content={"detail": "Development storage is unavailable. Contact the backend owner."})

    @api.exception_handler(EngineUnavailable)
    async def engine_error(request, exc):
        return JSONResponse(status_code=503, content={"detail": "Component engine is unavailable or returned invalid data."})

    @api.exception_handler(Exception)
    async def unexpected_error(request, exc):
        logger.error("Unexpected backend error: %s", type(exc).__name__)
        return JSONResponse(status_code=500, content={"detail": "Internal backend error."})

    @api.get("/health")
    def health():
        return {"status": "ok"}

    @api.post("/profile", response_model=ProfileResponse, status_code=201)
    def profile(payload: StudentProfile, actor=Depends(current_actor)):
        student_only(actor)
        if actor is not None:
            return api.state.identities.save_profile(actor.user_id, payload.model_dump())
        return api.state.store.create_profile(payload.model_dump())

    @api.post("/recommendations", response_model=RecommendationResponse)
    def recommendations(payload: StudentProfile, actor=Depends(current_actor)):
        careers = read_catalog(settings.data_dir, "careers.json")
        try:
            result = career_engine.recommend_careers(payload.model_dump(), careers)
            return public_recommendations(result)
        except Exception as exc:
            logger.error("Career adapter failed: %s", type(exc).__name__)
            raise EngineUnavailable from exc

    @api.get("/courses", response_model=list[Course])
    def courses():
        try:
            return extend_courses(settings, read_catalog(settings.data_dir, "courses.json", Course))
        except (OSError, ValueError, TypeError, ValidationError):
            raise DatasetUnavailable from None

    @api.get("/opportunities", response_model=list[Opportunity])
    def opportunities(category: FilterText = None, education_level: FilterText = None,
                      location: FilterText = None, search: FilterText = None):
        entries = read_catalog(settings.data_dir, "opportunities.json", Opportunity)
        try:
            result = opportunity_engine.filter_opportunities(entries, category=category,
                education_level=education_level, location=location, search=search)
            return TypeAdapter(list[Opportunity]).validate_python(result)
        except Exception as exc:
            logger.error("Opportunity adapter failed: %s", type(exc).__name__)
            raise EngineUnavailable from exc

    @api.post("/progress", response_model=ProgressResponse)
    def progress(payload: ProgressUpdate, actor=Depends(current_actor)):
        student_only(actor)
        entries = courses()
        if payload.course_id not in {x["id"] for x in entries}:
            raise HTTPException(404, "Unknown course_id.")
        try:
            if actor is not None:
                record = api.state.identities.save_progress(actor.user_id, payload.model_dump())
            else:
                record = api.state.store.save_progress(payload.model_dump())
        except MissingStudent:
            raise HTTPException(404, "Unknown student_id.") from None
        return {"saved": True, "progress": record}

    @api.get("/facilitator/students", response_model=FacilitatorResponse)
    def facilitator_students(actor=Depends(current_actor)):
        if actor is not None:
            if actor.role != "teacher":
                raise PermissionDenied
            return {"students": api.state.identities.assigned_students(actor.user_id)}
        return {"students": api.state.store.facilitator_students()}

    if settings.enable_learning_routes:
        from .learning_schemas import RoadmapRequest, RoadmapResponse

        @api.post('/roadmap', response_model=RoadmapResponse)
        def roadmap(payload: RoadmapRequest, actor=Depends(current_actor)):
            careers = read_catalog(settings.data_dir, 'careers.json')
            try:
                return build_roadmap(settings, payload.profile.model_dump(), payload.career_id, careers, courses())
            except KeyError:
                raise HTTPException(404, 'Unknown career_id.') from None
            except (OSError, ValueError, TypeError, ValidationError):
                raise DatasetUnavailable from None
            except DatasetUnavailable:
                raise
            except Exception as exc:
                logger.error('Roadmap engine failed: %s', type(exc).__name__)
                raise EngineUnavailable from exc

    # Proposed additions are disabled until frontend/facilitator owners review them.
    if settings.enable_account_routes:
        from .account_schemas import AccountResponse, ProgressList

        @api.get("/account", response_model=AccountResponse)
        def account(actor=Depends(current_actor)):
            return {"user_id": actor.user_id, "role": actor.role}

        @api.get("/profile", response_model=ProfileResponse)
        def own_profile(actor=Depends(current_actor)):
            student_only(actor)
            try:
                return api.state.identities.owned_profile(actor.user_id)
            except MissingStudent:
                raise HTTPException(404, "No profile has been saved for this account.") from None

        @api.get("/progress", response_model=ProgressList)
        def own_progress(actor=Depends(current_actor)):
            student_only(actor)
            try:
                return {"progress": api.state.identities.own_progress(actor.user_id)}
            except MissingStudent:
                raise HTTPException(404, "No profile has been saved for this account.") from None

    return api


app = create_app()
