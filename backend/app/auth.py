"""Opt-in Supabase access-token verification; passwords stay with Supabase Auth.

Tokens are verified via the configured Auth server's /user endpoint, not decoded
without verification. User-editable metadata never supplies application roles.
"""
from dataclasses import dataclass
from uuid import UUID

import httpx


class InvalidToken(Exception):
    pass


class AuthUnavailable(Exception):
    pass


class PermissionDenied(Exception):
    pass


@dataclass(frozen=True)
class Principal:
    user_id: str
    role: str


class SupabaseAuthenticator:
    def __init__(self, settings):
        self.settings = settings

    def verify(self, token: str) -> str:
        if not token or len(token) > 16384:
            raise InvalidToken
        try:
            with httpx.Client(timeout=self.settings.auth_timeout_seconds, follow_redirects=False) as client:
                response = client.get(self.settings.supabase_url.rstrip("/") + "/auth/v1/user",
                    headers={"apikey": self.settings.supabase_publishable_key,
                             "Authorization": "Bearer " + token})
        except httpx.RequestError:
            raise AuthUnavailable from None
        if response.status_code in {401, 403}:
            raise InvalidToken
        if response.status_code != 200:
            raise AuthUnavailable
        try:
            user = response.json()
            if user.get("is_anonymous") is True:
                raise InvalidToken
            return str(UUID(user["id"]))
        except (ValueError, KeyError, TypeError, AttributeError):
            raise AuthUnavailable from None
