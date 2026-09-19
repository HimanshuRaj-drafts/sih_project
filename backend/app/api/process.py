from fastapi import APIRouter, UploadFile, File, HTTPException, status, Header
from pydantic import BaseModel
from typing import Dict, Any
import io
import logging

from app.services.ocr_service import compute_sha256, ingest_and_extract_text
from app.services.pii_service import detect_pii
from app.services import supabase_service, redaction_service
import base64

router = APIRouter()


class UploadResponse(BaseModel):
    hash: str
    filename: str
    size: int
    ocr_snippet: str | None = None
    redacted_snippet: str | None = None
    redacted_pdf_base64: str | None = None
    pii_summary: Dict[str, Any] | None = None


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(file: UploadFile = File(...), authorization: str | None = Header(None)) -> UploadResponse:
	"""Accept a file upload, compute SHA-256, and return metadata.

	This is a fast, in-memory implementation intended as the Station 1
	starting point. Downstream actions (OCR, PII detection, Supabase
	storage, blockchain commit) will be wired to this pipeline.
	"""
	try:
		if not authorization:
			raise HTTPException(status_code=401, detail="Missing authorization header")

		# Verify user token via Supabase helper to extract uploader id
		claims = supabase_service.verify_user_token(authorization)
		# common claim keys for user id
		uploader_id = None
		if isinstance(claims, dict):
			uploader_id = claims.get("id") or claims.get("sub") or claims.get("user_id")
		# fallback
		if not uploader_id:
			uploader_id = "anonymous"

		contents = await file.read()
		if not contents:
			raise HTTPException(status_code=400, detail="Empty file")

		sha256 = compute_sha256(contents)
		size = len(contents)

		# Extract text (in-memory). This may be a best-effort OCR.
		text = ""
		try:
			result = ingest_and_extract_text(contents, file.filename)
			text = result.get("raw_text", "")
			snippet = text[:1000] if text else ""
		except Exception:
			snippet = None

		# Detect PII in extracted text (best-effort)
		try:
			pii = detect_pii(text) if text else {}
		except Exception:
			pii = {}

		# Generate Redacted Text Snippet
		try:
			redacted_text = redaction_service.sanitize_text(text, pii) if text else ""
			redacted_snippet = redacted_text[:1000] if redacted_text else ""
		except Exception:
			redacted_snippet = None

		# Generate Redacted PDF Base64
		redacted_b64 = None
		try:
			if file.filename.lower().endswith(".pdf"):
				# 1. Apply Redaction
				redacted_stream = redaction_service.apply_redactions(contents, pii)
				
				# 2. Apply Watermark
				from app.services import watermark_service
				# Extract user id from token (or default to Investigator)
				user_id = claims.get("sub", claims.get("id", "Investigator_UI")) if claims else "Investigator_UI"
				watermarked_stream = watermark_service.apply_watermark(redacted_stream, user_claims={"id": user_id})
				
				redacted_b64 = base64.b64encode(watermarked_stream.getvalue()).decode('utf-8')
		except Exception as e:
			logging.exception("Failed to generate redacted PDF on upload")
			redacted_b64 = None

		# Upload pristine master PDF to Supabase (in-memory)
		file_stream = io.BytesIO(contents)
		try:
			storage_path = supabase_service.upload_master_pdf(file_stream, file.filename, uploader_id)
		except HTTPException:
			logging.exception("Failed to upload master PDF to Supabase")
			raise
		except Exception:
			logging.exception("Unexpected error uploading to Supabase")
			raise HTTPException(status_code=500, detail="Failed to persist file")

		# Insert metadata record
		try:
			supabase_service.insert_document_metadata(sha256, file.filename, uploader_id, pii, storage_path)
		except HTTPException:
			raise
		except Exception:
			logging.exception("Failed to insert document metadata")
			raise HTTPException(status_code=500, detail="Failed to persist metadata")

		# Attempt to anchor document hash on-chain (Station 3)
		try:
			from app.services import blockchain_service

			try:
				tx_hash = blockchain_service.register_document(sha256)
				# Persist tx_hash into metadata
				try:
					supabase_service.update_document_metadata(sha256, {"tx_hash": tx_hash, "chain": "polygon"})
				except Exception:
					logging.exception("Failed to update metadata with tx hash")
			except Exception:
				logging.exception("Blockchain anchoring failed; continuing without tx")
		except Exception:
			# If blockchain_service import fails, don't block the upload
			logging.exception("Blockchain service unavailable; skipping anchoring")

		return UploadResponse(
			hash=sha256, 
			filename=file.filename, 
			size=size, 
			ocr_snippet=snippet, 
			redacted_snippet=redacted_snippet,
			redacted_pdf_base64=redacted_b64,
			pii_summary=pii
		)
	finally:
		await file.close()