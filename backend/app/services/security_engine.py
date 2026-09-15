import io
import re
import hashlib
import fitz  # PyMuPDF

# --- START: SIH STATION 1 & 4 SECURITY ENGINE ---

def compute_sha256(file_bytes: bytes) -> str:
    """Compute the SHA-256 hash of the given bytes."""
    return hashlib.sha256(file_bytes).hexdigest()

def apply_redactions(pdf_bytes: bytes) -> bytes:
    """Apply redactions to sensitive information in the PDF."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    
    # Simple regex patterns for demonstration
    patterns = [
        re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'),  # Email
        re.compile(r'\b\d{10}\b'),  # Phone
        re.compile(r'[A-Z]{5}[0-9]{4}[A-Z]{1}')  # PAN
    ]
    
    for page in doc:
        text = page.get_text()
        for pattern in patterns:
            for match in pattern.finditer(text):
                # Search for the matched text to get its coordinates
                instances = page.search_for(match.group())
                for inst in instances:
                    # Add redaction annotation
                    page.add_redact_annot(inst, fill=(0, 0, 0))
        # Apply the redactions
        page.apply_redactions()
        
    out_pdf = doc.write()
    doc.close()
    return out_pdf

def apply_forensic_watermark(pdf_bytes: bytes, watermark_text: str) -> bytes:
    """Apply a forensic watermark to the PDF."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    
    for page in doc:
        # Insert watermark text at the bottom or diagonally
        rect = page.rect
        p = fitz.Point(50, rect.height - 50)
        page.insert_text(p, watermark_text, fontsize=12, color=(1, 0, 0), rotate=0)
        
    out_pdf = doc.write()
    doc.close()
    return out_pdf

# --- END: SIH SECURITY ENGINE ---
