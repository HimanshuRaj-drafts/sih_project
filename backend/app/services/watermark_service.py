"""In-memory dynamic watermarking for PDFs using PyMuPDF.

Provides a function to apply a diagonal, semi-transparent watermark
containing user identifier and timestamp to each page in-memory.
"""
from __future__ import annotations

import io
import logging
from datetime import datetime
from typing import Dict

try:
    import pymupdf as fitz  # PyMuPDF
except Exception:  # pragma: no cover - dependency
    fitz = None


def apply_watermark(pdf_stream: io.BytesIO, user_claims: Dict[str, str], opacity: float = 0.15, fontsize: int = 36) -> io.BytesIO:
    """Apply a diagonal watermark with user info to the PDF in-memory.

    Args:
        pdf_stream: BytesIO containing source PDF bytes (position will be reset).
        user_claims: Dictionary of user claims; `sub` or `id` used as identifier.
        opacity: Watermark opacity between 0 (transparent) and 1 (opaque).
        fontsize: Font size for watermark text.

    Returns:
        BytesIO containing the watermarked PDF.

    Raises:
        RuntimeError: if PyMuPDF is not available or processing fails.
    """
    if fitz is None:
        raise RuntimeError("PyMuPDF (fitz) is required for watermarking")

    if not isinstance(pdf_stream, io.BytesIO):
        raise TypeError("pdf_stream must be an io.BytesIO instance")

    try:
        pdf_stream.seek(0)
        doc = fitz.open(stream=pdf_stream.read(), filetype="pdf")
    except Exception:
        logging.exception("Failed to open PDF for watermarking")
        raise RuntimeError("Failed to open PDF for watermarking")

    identifier = user_claims.get("sub") or user_claims.get("id") or "user"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    stamp_text = f"CONFIDENTIAL - NCRB // VIEWED BY: {identifier} // {timestamp}"

    try:
        for page in doc:
            rect = page.rect
            
            # Tile the watermark across the page
            # We use a nested loop starting from outside the visible page to ensure full coverage
            x_step = 400
            y_step = 150
            
            for y in range(-int(rect.height), int(rect.height) * 2, y_step):
                for x in range(-int(rect.width), int(rect.width) * 2, x_step):
                    start_point = fitz.Point(x, y)
                    page.insert_text(
                        start_point,
                        stamp_text,
                        fontsize=12,
                        fontname="helv",
                        color=(0.8, 0.1, 0.1), # Reddish color
                        morph=(start_point, fitz.Matrix(-35)), # Diagonal rotation
                        render_mode=0,
                    )

            # attempt to set transparency for the last drawing (best-effort)
            try:
                for annot in page.annots() or []:
                    annot.set_opacity(opacity)
            except Exception:
                # ignore if not supported
                pass

        out = io.BytesIO()
        doc.save(out)
        out.seek(0)
        return out
    except Exception:
        logging.exception("Watermarking process failed")
        raise RuntimeError("Watermarking failed")
    finally:
        try:
            doc.close()
        except Exception:
            pass