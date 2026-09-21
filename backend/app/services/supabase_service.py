"""Supabase Vault & DB service for Station 2.

Initializes the Supabase client from environment variables and exposes
secure, in-memory helpers for uploading master PDFs, retrieving them,
inserting metadata, validating user tokens, and generating storage
paths. All file handling is done with `io.BytesIO` to avoid disk writes
and preserve master file integrity.
"""
from __future__ import annotations

from typing import Dict, Any
import os
import io
import logging
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException, status

try:
    from supabase import create_client, Client
except Exception:  # pragma: no cover - missing dependency
    create_client = None
    Client = None


_client = None
_BUCKET_NAME = "ncrb-vault"


def _get_supabase_url() -> str:
    value = os.getenv("SUPABASE_URL")
    if not value:
        raise RuntimeError("SUPABASE_URL environment variable is required")
    return value


def _get_supabase_key() -> str:
    value = os.getenv("SUPABASE_KEY")
    if not value:
        raise RuntimeError("SUPABASE_KEY environment variable is required")
    return value


def _ensure_client():
    global _client
    if _client is not None:
        return _client

    if create_client is None:
        raise RuntimeError("supabase package is required (pip install supabase)")

    _client = create_client(_get_supabase_url(), _get_supabase_key())
    return _client


def generate_storage_path(user_id: str, filename: str) -> str:
    """Generate a storage path matching the frontend expectation.
    """
    safe_name = filename.replace("/", "_")
    return f"evidence/{safe_name}"


def upload_master_pdf(file_bytes: io.BytesIO, filename: str, user_id: str) -> str:
    """Upload pristine unredacted PDF bytes to Supabase Storage.

    Args:
        file_bytes: In-memory BytesIO containing PDF bytes.
        filename: Original filename for display.
        user_id: Uploader's user id (used to group files).

    Returns:
        The storage path (bucket-relative) where the file was stored.

    Raises:
        HTTPException on Supabase errors.
    """
    if not isinstance(file_bytes, io.BytesIO):
        raise TypeError("file_bytes must be an io.BytesIO instance")

    path = generate_storage_path(user_id, filename)

    try:
        file_bytes.seek(0)
        data = file_bytes.read()
        client = _ensure_client()
        # The Python supabase client accepts bytes for upload.
        storage = client.storage.from_(_BUCKET_NAME)
        # Attempt to upload without upsert to avoid silent overwrites.
        res = storage.upload(path, data)
        # supabase-py returns a dict-like response; detect errors
        if isinstance(res, dict) and res.get("error"):
            logging.error("Supabase storage upload error: %s", res.get("error"))
            raise HTTPException(status_code=500, detail="Failed to upload file to Supabase Storage")
    except HTTPException:
        raise
    except Exception:
        logging.exception("Unexpected error uploading to Supabase Storage")
        raise HTTPException(status_code=500, detail="Unexpected error uploading file")

    return path


def get_master_pdf(path: str) -> bytes:
    """Retrieve the original PDF bytes from Supabase Storage.

    Args:
        path: Bucket-relative path returned by `upload_master_pdf`.

    Returns:
        Raw file bytes.

    Raises:
        HTTPException if file not found or Supabase errors occur.
    """
    try:
        client = _ensure_client()
        storage = client.storage.from_(_BUCKET_NAME)
        res = storage.download(path)
        # `download` should return bytes; handle supabase-py response shapes
        if isinstance(res, dict) and res.get("error"):
            logging.error("Supabase storage download error: %s", res.get("error"))
            raise HTTPException(status_code=404, detail="File not found in Supabase Storage")

        if isinstance(res, (bytes, bytearray)):
            return bytes(res)

        # If the client returns a StreamingBody-like object
        try:
            return res.read()
        except Exception:
            logging.exception("Unable to read downloaded object from Supabase Storage")
            raise HTTPException(status_code=500, detail="Failed to read file from storage")
    except HTTPException:
        raise
    except Exception:
        logging.exception("Unexpected error downloading from Supabase Storage")
        raise HTTPException(status_code=500, detail="Unexpected error retrieving file")


def insert_document_metadata(doc_hash: str, filename: str, uploader_id: str, pii_summary: Dict[str, Any], storage_path: str | None = None) -> None:
    """Insert document metadata into the `documents` table.

    The `documents` table is expected to have columns:
      - document_hash (text)
      - filename (text)
      - uploader_id (text)
      - pii_summary (jsonb)
      - uploaded_at (timestamptz)

    This function raises HTTPException on failure.
    """
    try:
        client = _ensure_client()
        payload = {
            "document_hash": doc_hash,
            "filename": filename,
            "uploader_id": uploader_id,
            "pii_summary": pii_summary or {},
            "uploaded_at": datetime.utcnow().isoformat() + "Z",
        }
        if storage_path:
            payload["storage_path"] = storage_path

        res = client.table("documents").insert(payload).execute()
        # supabase-py returns a dict-like response with 'error' key on failure
        if hasattr(res, "get") and res.get("error"):
            logging.error("Supabase insert metadata error: %s", res.get("error"))
            raise HTTPException(status_code=500, detail="Failed to insert document metadata")
    except HTTPException:
        raise
    except Exception:
        logging.exception("Unexpected error inserting document metadata into Supabase")
        raise HTTPException(status_code=500, detail="Unexpected error inserting metadata")


def update_document_metadata(doc_hash: str, updates: Dict[str, Any]) -> None:
    """Update document metadata row matching `document_hash` with provided fields.

    Raises HTTPException on failure.
    """
    try:
        client = _ensure_client()
        res = client.table("documents").update(updates).eq("document_hash", doc_hash).execute()
        if hasattr(res, "get") and res.get("error"):
            logging.error("Supabase update metadata error: %s", res.get("error"))
            raise HTTPException(status_code=500, detail="Failed to update document metadata")
    except HTTPException:
        raise
    except Exception:
        logging.exception("Unexpected error updating document metadata in Supabase")
        raise HTTPException(status_code=500, detail="Unexpected error updating metadata")


def verify_user_token(token: str) -> Dict[str, Any]:
    """Validate a Supabase JWT and return user claims.

    This uses the Supabase client auth endpoints where possible. On
    success, returns a dict-like claims object. Raises HTTPException on
    invalid token.
    """
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    try:
        client = _ensure_client()
        # Try modern client method
        user = None
        try:
            user = client.auth.get_user(token=token)
        except Exception:
            # Fallback to older API
            try:
                user = client.auth.api.get_user(token)
            except Exception:
                user = None

        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

        # `get_user` may return a dict with 'user' key
        if isinstance(user, dict) and user.get("user"):
            return user.get("user")

        return user
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error while verifying Supabase token")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token verification failed")