"""In-memory irreversible redaction utilities using PyMuPDF.

Provides functions to black out detected PII regions inside a PDF
without writing temporary files. Redactions are applied permanently
to preserve integrity guarantees.
"""
from __future__ import annotations

import io
import logging
from typing import Dict, Iterable

try:
    import pymupdf as fitz  # PyMuPDF
except Exception:  # pragma: no cover - dependency
    fitz = None


def _iter_tokens(pii_data: Dict[str, Iterable[str]]) -> Iterable[str]:
    keys = (
        "names", "addresses", "aadhaar", "pan", "phones", "emails",
        "voter_id", "passport", "upi", "credit_cards", "bank_accounts", "ips"
    )
    for k in keys:
        for item in pii_data.get(k, []) or []:
            if item:
                yield str(item)


def apply_redactions(pdf_bytes: bytes, pii_data: Dict[str, Iterable[str]]) -> io.BytesIO:
    """Apply irreversible black redactions to `pdf_bytes` for detected PII.

    Args:
        pdf_bytes: Raw PDF file bytes.
        pii_data: Dictionary containing lists of PII tokens (names, aadhaar, pan, phones, addresses).

    Returns:
        An in-memory `BytesIO` containing the redacted PDF.

    Raises:
        RuntimeError: when PyMuPDF is unavailable or redaction fails.
        ValueError: when inputs are invalid.
    """
    if not isinstance(pdf_bytes, (bytes, bytearray)):
        raise ValueError("pdf_bytes must be raw bytes")

    if fitz is None:
        raise RuntimeError("PyMuPDF (fitz) is required for redaction")

    if not pdf_bytes:
        raise ValueError("Empty PDF bytes provided")

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        logging.exception("Failed to open PDF for redaction")
        raise RuntimeError("Failed to open PDF for redaction") from exc

    try:
        # Strip hidden metadata (Author, Subject, Keywords, etc.) to prevent data leaks
        doc.set_metadata({})

        for page in doc:
            for token in _iter_tokens(pii_data):
                try:
                    # search_for returns list of rectangles where the token appears
                    rects = page.search_for(token)
                    for r in rects:
                        page.add_redact_annot(r, fill=(0, 0, 0))
                except Exception:
                    # continue on token-specific failures
                    logging.debug("search/add_redact failed for token on page", exc_info=True)
            
            # Apply redactions to the page to make them permanent
            page.apply_redactions()

        out = io.BytesIO()
        doc.save(out)
        out.seek(0)
        return out
    except Exception as exc:
        logging.exception("Failed during PDF redaction process")
        raise RuntimeError("PDF redaction failed") from exc
    finally:
        try:
            doc.close()
        except Exception:
            pass


# Backwards-compatible alias for older callers/tests that still use the misspelled name.
sapply_redactions = apply_redactions


def sanitize_text(text: str, pii_data: Dict[str, Iterable[str]] = None) -> str:
    """Return a preview-safe version of `text` where sensitive tokens are masked.
    Uses the exact tokens found in pii_data to ensure consistency with PDF redaction.
    """
    if not text or not pii_data:
        return text

    for token in _iter_tokens(pii_data):
        if not token: continue
        # Replace instances of the exact token with block characters
        text = text.replace(token, "█" * len(token))

    return text