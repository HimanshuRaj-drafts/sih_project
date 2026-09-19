"""Service package initializer for NCRB Secure Docs.

Exports service modules and provides `init_services()` to perform
lightweight dependency checks at application startup.
"""

from __future__ import annotations

from typing import List
import importlib
import logging

def _import_optional(name: str):
	try:
		return importlib.import_module(f"app.services.{name}")
	except Exception:
		return None

ocr_service = _import_optional("ocr_service")
pii_service = _import_optional("pii_service")
redaction_service = _import_optional("redaction_service")
watermark_service = _import_optional("watermark_service")
supabase_service = _import_optional("supabase_service")
blockchain_service = _import_optional("blockchain_service")

__all__: List[str] = [
	"ocr_service",
	"pii_service",
	"redaction_service",
	"watermark_service",
	"supabase_service",
	"blockchain_service",
	"init_services",
]


def init_services() -> None:
	"""Verify availability of optional external dependencies and log status.

	Checks: PyMuPDF, pytesseract + Pillow, spaCy model `en_core_web_sm`,
	Supabase client, and Web3. Logs warnings on missing pieces but
	does not raise to allow degraded startup.
	"""
	logger = logging.getLogger("services")
	status_ok = True

	# PyMuPDF
	try:
		fitz = importlib.import_module("fitz")
		logger.info("PyMuPDF available: %s", getattr(fitz, "__version__", "unknown"))
	except Exception:
		logger.warning("PyMuPDF (fitz) not available — PDF features degraded")
		status_ok = False

	# pytesseract + Pillow
	try:
		importlib.import_module("pytesseract")
		importlib.import_module("PIL")
		logger.info("pytesseract and Pillow available")
	except Exception:
		logger.warning("pytesseract/Pillow not available — image OCR degraded")
		status_ok = False

	# spaCy model
	try:
		spacy = importlib.import_module("spacy")
		try:
			spacy.load("en_core_web_sm")
			logger.info("spaCy model 'en_core_web_sm' available")
		except Exception:
			logger.warning("spaCy installed but model 'en_core_web_sm' not found")
			status_ok = False
	except Exception:
		logger.warning("spaCy not installed — NER/PII detection degraded")
		status_ok = False

	# Supabase client
	try:
		client = getattr(supabase_service, "_client", None)
		if client is None:
			raise RuntimeError("Supabase client not initialized")
		logger.info("Supabase client available")
	except Exception:
		logger.warning("Supabase client not available — storage/database operations will fail")
		status_ok = False

	# Web3 / blockchain
	try:
		web3_module = importlib.import_module("web3")
		logger.info("web3.py available: %s", getattr(web3_module, "__version__", "unknown"))
	except Exception:
		logger.warning("web3.py not available — blockchain integration degraded")
		status_ok = False

	if status_ok:
		logger.info("Service dependency check passed")
	else:
		logger.warning("One or more optional service dependencies are missing; running in degraded mode")