from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
import io
import hashlib
import logging

from app.core import get_supabase_client, get_user_role
from app.core.security import get_current_user
from app.services import supabase_service, redaction_service, watermark_service

router = APIRouter()


@router.get("/{doc_id}/metadata")
async def get_metadata(doc_id: str):
	client = get_supabase_client()
	try:
		res = client.table("documents").select("*").eq("document_hash", doc_id).limit(1).execute()
		data = None
		if hasattr(res, "get") and res.get("data"):
			rows = res.get("data")
			if rows:
				data = rows[0]
		elif hasattr(res, "data"):
			data = res.data[0] if res.data else None
		if not data:
			raise HTTPException(status_code=404, detail="Metadata not found")
		return data
	except HTTPException:
		raise
	except Exception:
		logging.exception("Failed to fetch metadata from Supabase")
		raise HTTPException(status_code=500, detail="Failed to retrieve metadata")


@router.get("/{doc_id}/download")
async def download_document(doc_id: str, authorization: str | None = Header(None)):
	if not authorization:
		raise HTTPException(status_code=401, detail="Missing authorization header")

	# Authenticate and get role
	claims = get_current_user(authorization)
	role = get_user_role(claims)

	# Retrieve metadata to find storage path and pii
	client = get_supabase_client()
	try:
		res = client.table("documents").select("*").eq("document_hash", doc_id).limit(1).execute()
		data = None
		if hasattr(res, "get") and res.get("data"):
			rows = res.get("data")
			if rows:
				data = rows[0]
		elif hasattr(res, "data"):
			data = res.data[0] if res.data else None
		if not data:
			raise HTTPException(status_code=404, detail="Document metadata not found")
	except HTTPException:
		raise
	except Exception:
		logging.exception("Failed to query document metadata")
		raise HTTPException(status_code=500, detail="Failed to query metadata")

	storage_path = data.get("storage_path")
	filename = data.get("filename") or f"{doc_id}.pdf"
	pii_summary = data.get("pii_summary") or {}

	if not storage_path:
		raise HTTPException(status_code=500, detail="Storage path not recorded for document")

	# Fetch master bytes
	master_bytes = supabase_service.get_master_pdf(storage_path)

	# High-clearance roles receive original content (optionally watermarked)
	high_roles = {"judge", "lead_io", "public_prosecutor"}
	try:
		if role in high_roles:
			# Attempt dynamic watermark if available
			if hasattr(watermark_service, "apply_watermark"):
				out_stream = watermark_service.apply_watermark(io.BytesIO(master_bytes), user_claims=claims)
			else:
				out_stream = io.BytesIO(master_bytes)
		else:
			# Lower clearance: irreversible redaction in-memory
			redacted = redaction_service.apply_redactions(master_bytes, pii_summary)
			# Optionally watermark redacted output
			if hasattr(watermark_service, "apply_watermark"):
				out_stream = watermark_service.apply_watermark(redacted, user_claims=claims)
			else:
				out_stream = redacted

		out_bytes = out_stream.getvalue()
		# Integrity: compute SHA-256 (can be compared to blockchain externally)
		served_hash = hashlib.sha256(out_bytes).hexdigest()

		# Verify integrity against blockchain (Station 3) if available.
		auth_status = "unknown"
		try:
			from app.services import blockchain_service
			try:
				verified = blockchain_service.verify_document(served_hash)
				if verified:
					auth_status = "authentic"
				else:
					# Tampering suspected; block delivery
					logging.error("Served document hash %s not found on-chain for doc %s", served_hash, doc_id)
					raise HTTPException(status_code=412, detail="Document integrity check failed: hash not found on blockchain (possible tampering)")
			except Exception:
				logging.exception("Blockchain verification failed; proceeding with unknown authenticity")
				auth_status = "unknown"
		except Exception:
			# blockchain_service not available; continue but mark unknown
			logging.warning("Blockchain service unavailable; cannot verify document authenticity")
			auth_status = "unknown"

		headers = {
			"Content-Disposition": f"attachment; filename=\"{filename}\"",
			"X-Document-Hash": served_hash,
			"X-Document-Authenticity": auth_status,
		}
		return StreamingResponse(io.BytesIO(out_bytes), media_type="application/pdf", headers=headers)

	except HTTPException:
		raise
	except Exception:
		logging.exception("Failed to prepare document for download")
		raise HTTPException(status_code=500, detail="Failed to prepare document")