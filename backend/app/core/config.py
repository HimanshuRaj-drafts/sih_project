"""Configuration loader for NCRB Secure Docs.

Loads environment variables from a `.env` file and provides a
typed `Settings` dataclass with validation.
"""
from dataclasses import dataclass
import os
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    SUPABASE_URL: str
    SUPABASE_KEY: str
    POLYGON_RPC_URL: str
    CONTRACT_ADDRESS: str
    JWT_SECRET: str
    JWT_ALGORITHM: str


def _require(key: str) -> str:
    val = os.getenv(key)
    if not val:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return val


def get_settings() -> Settings:
    """Return a validated Settings instance built from environment variables."""
    return Settings(
        SUPABASE_URL=_require("SUPABASE_URL"),
        SUPABASE_KEY=_require("SUPABASE_KEY"),
        POLYGON_RPC_URL=_require("POLYGON_RPC_URL"),
        CONTRACT_ADDRESS=_require("CONTRACT_ADDRESS"),
        JWT_SECRET=_require("JWT_SECRET"),
        # Provide a sensible default for algorithm to ease local setup.
        JWT_ALGORITHM=os.getenv("JWT_ALGORITHM") or "HS256",
    )