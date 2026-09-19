"""Core initialization utilities for the NCRB Secure Docs backend.

This module provides lightweight helpers to load settings, initialize
the Supabase client, verify JWTs, and extract user roles for RBAC.
Keep this module import-safe: avoid performing network calls at import
time — raise errors only when callers request resources.
"""
from __future__ import annotations

from typing import Any, Dict, Optional
import os
import logging

from fastapi import HTTPException, status

from dotenv import load_dotenv

try:
    import jwt  # PyJWT
except Exception:  # pragma: no cover - dependency may be missing in tests
    jwt = None

try:
    from supabase import create_client, Client
except Exception:  # pragma: no cover
    create_client = None
    Client = None

# Load environment from .env if present (safe to call on import)
load_dotenv()

ALLOWED_ROLES = {"judge", "lead_io", "public_prosecutor", "constable", "station_clerk", "defense_counsel", "media"}


def get_settings() -> Dict[str, Optional[str]]:
    """Load and validate critical environment settings.

    Returns a dictionary with keys:
      - SUPABASE_URL, SUPABASE_KEY
      - BLOCKCHAIN_RPC_URL
      - JWT_PUBLIC_KEY or SUPABASE_JWT_SECRET

    Raises:
        RuntimeError: when required environment variables are missing.
    """
    settings = {
        "SUPABASE_URL": os.getenv("SUPABASE_URL"),
        "SUPABASE_KEY": os.getenv("SUPABASE_KEY"),
        "BLOCKCHAIN_RPC_URL": os.getenv("BLOCKCHAIN_RPC_URL"),
        "JWT_PUBLIC_KEY": os.getenv("JWT_PUBLIC_KEY"),
        "SUPABASE_JWT_SECRET": os.getenv("SUPABASE_JWT_SECRET"),
    }

    # Enforce presence of Supabase and blockchain config
    if not settings["SUPABASE_URL"] or not settings["SUPABASE_KEY"]:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_KEY environment variables")

    if not settings["BLOCKCHAIN_RPC_URL"]:
        raise RuntimeError("Missing BLOCKCHAIN_RPC_URL environment variable for Polygon RPC")

    if not (settings["JWT_PUBLIC_KEY"] or settings["SUPABASE_JWT_SECRET"]):
        raise RuntimeError("Missing JWT_PUBLIC_KEY or SUPABASE_JWT_SECRET for token verification")

    return settings


def get_supabase_client() -> Any:
    """Return an initialized Supabase `Client`.

    This function validates required environment variables and creates
    the client on demand so imports remain lightweight.
    """
    settings = get_settings()

    if create_client is None:
        raise RuntimeError("supabase package not installed; run `pip install supabase`")

    client = create_client(settings["SUPABASE_URL"], settings["SUPABASE_KEY"])
    return client


def verify_jwt(token: str) -> Dict[str, Any]:
    """Verify a JWT and return decoded claims.

    Attempts RS256 verification using `JWT_PUBLIC_KEY` if present,
    otherwise falls back to HS256 with `SUPABASE_JWT_SECRET`.

    Raises:
        HTTPException (401) on invalid or missing token.
    """
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization token")

    if jwt is None:
        raise RuntimeError("PyJWT is required for token verification (pip install PyJWT)")

    settings = get_settings()
    public_key = settings.get("JWT_PUBLIC_KEY")
    secret = settings.get("SUPABASE_JWT_SECRET")

    # Strip Bearer prefix if present
    if token.lower().startswith("bearer "):
        token = token.split(" ", 1)[1]

    try:
        if public_key:
            # Expect RS256
            claims = jwt.decode(token, public_key, algorithms=["RS256"], options={"verify_aud": False})
        elif secret:
            # HS256 using Supabase JWT secret
            claims = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No key available to verify token")
    except jwt.ExpiredSignatureError:  # type: ignore[attr-defined]
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except Exception as exc:  # pragma: no cover - depends on runtime jwt behavior
        logging.exception("JWT verification failed")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    return claims


def get_user_role(claims: Dict[str, Any]) -> str:
    """Extract the user's role from JWT claims for RBAC decisions.

    The function looks for a `role` claim, then checks common Supabase
    claim locations such as `app_metadata` or `user_metadata`.

    Raises:
        HTTPException (403) when role is missing or unauthorized.
    """
    if not claims:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing claims for role extraction")

    role = None
    # direct role claim
    role = claims.get("role") or claims.get("realm")

    # supabase sometimes puts role in `app_metadata` or `user_metadata`
    if not role:
        app_meta = claims.get("app_metadata") or {}
        role = app_meta.get("role")

    if not role:
        user_meta = claims.get("user_metadata") or {}
        role = user_meta.get("role")

    if not role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User role not found in token claims")

    role = str(role).lower()
    # Normalize some common role names
    mapping = {"admin": "lead_io", "prosecutor": "public_prosecutor"}
    role = mapping.get(role, role)

    if role not in ALLOWED_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Unauthorized role: {role}")

    return role


def core_ready() -> bool:
    """Simple health-check for core dependencies.

    Returns True when settings load successfully. Does not perform
    network calls to keep the check fast and side-effect free.
    """
    try:
        _ = get_settings()
        return True
    except Exception:
        logging.exception("Core readiness check failed")
        return False