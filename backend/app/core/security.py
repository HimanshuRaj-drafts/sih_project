"""JWT security utilities for NCRB Secure Docs.

Provides token creation, decoding, current-user extraction, and
role-based enforcement using PyJWT and settings from `config.py`.
"""
from __future__ import annotations

from typing import Any, Dict, List
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

try:
    import jwt
    from jwt import ExpiredSignatureError, InvalidTokenError
except Exception:  # pragma: no cover - dependency
    jwt = None
    ExpiredSignatureError = Exception
    InvalidTokenError = Exception

from app.core.config import get_settings


def _get_secret_and_alg() -> tuple[str, str]:
    settings = get_settings()
    return settings.JWT_SECRET, settings.JWT_ALGORITHM


def create_access_token(data: Dict[str, Any], expires_minutes: int = 60) -> str:
    """Create a JWT access token containing `data` and expiry.

    Args:
        data: Claims to include in the token (e.g., `sub`, `role`).
        expires_minutes: Minutes until token expiration.

    Returns:
        Encoded JWT as a string.

    Raises:
        RuntimeError: if PyJWT is not installed.
    """
    if jwt is None:
        raise RuntimeError("PyJWT is required (pip install PyJWT)")

    secret, alg = _get_secret_and_alg()
    now = datetime.now(timezone.utc)
    payload = dict(data)
    payload.update({
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_minutes)).timestamp()),
    })

    token = jwt.encode(payload, secret, algorithm=alg)
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and verify a JWT, returning its claims.

    Raises HTTPException(401) for expired or invalid tokens.
    """
    if jwt is None:
        raise RuntimeError("PyJWT is required (pip install PyJWT)")

    secret, alg = _get_secret_and_alg()
    if token.lower().startswith("bearer "):
        token = token.split(" ", 1)[1]

    try:
        claims = jwt.decode(token, secret, algorithms=[alg])
    except ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token verification failed")

    return claims


def get_current_user(token: str) -> Dict[str, Any]:
    """Return decoded claims for the token representing the current user.

    Raises HTTPException when token is invalid.
    """
    claims = decode_token(token)
    return claims


def enforce_rbac(role: str, allowed_roles: List[str]) -> None:
    """Enforce that `role` is present in `allowed_roles`.

    Role comparison is case-insensitive. Raises HTTPException(403)
    when access is denied.
    """
    if not role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing user role")

    norm = role.strip().lower()
    allowed = {r.strip().lower() for r in allowed_roles}
    if norm not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient privileges")