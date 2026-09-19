import re
from typing import Dict, List

def detect_pii(text: str) -> Dict[str, List[str]]:
    """
    Detects potential PII (Personally Identifiable Information) in the given text.
    Returns a dictionary of found PII tokens grouped by type.
    """
    if not text:
        return {}

    email_pattern = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
    phone_pattern = re.compile(r'\b\d{10}\b')
    # --- Existing Government IDs ---
    pan_pattern = re.compile(r'\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b')
    aadhaar_pattern = re.compile(r'\b\d{4}\s?\d{4}\s?\d{4}\b')

    # --- New Government IDs ---
    voter_id_pattern = re.compile(r'\b[A-Z]{3}[0-9]{7}\b')  # Typical EPIC format
    passport_pattern = re.compile(r'\b[A-Z][1-9]\d\s?\d{4}[1-9]\b') # Indian Passport format

    # --- Financial Data ---
    upi_pattern = re.compile(r'\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}\b')
    credit_card_pattern = re.compile(r'\b(?:\d[ -]*?){13,16}\b') # Matches 16 digits with or without spaces/dashes
    bank_account_pattern = re.compile(r'\b[0-9]{9,18}\b') # Standard Indian Bank Account length

    # --- Police Operations (IPs) ---
    ipv4_pattern = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')

    # Execute Searches
    emails = email_pattern.findall(text)
    phones = phone_pattern.findall(text)
    pans = pan_pattern.findall(text)
    aadhaars = aadhaar_pattern.findall(text)
    voter_ids = voter_id_pattern.findall(text)
    passports = passport_pattern.findall(text)
    upis = upi_pattern.findall(text)
    
    # Filter out small overlapping numbers from generic bank pattern
    raw_cards = credit_card_pattern.findall(text)
    raw_banks = bank_account_pattern.findall(text)

    # Clean up financial matches to only strings without spaces for checking
    cards = [c for c in raw_cards if len(c.replace(" ", "").replace("-", "")) >= 13]
    bank_accounts = [b for b in raw_banks if b not in phones and b not in aadhaars]
    ips = ipv4_pattern.findall(text)

    # Heuristic for detecting Names (especially from forms)
    names = []
    for label in ["Name of the Candidate", "Student Name", "Name:", "Candidate Name:"]:
        match = re.search(rf'{label}\s*\n([A-Za-z\s\.]+)', text, re.IGNORECASE)
        if match:
            candidate = match.group(1).strip()
            if candidate and len(candidate) > 2:
                names.append(candidate)
    
    # =========================================================================
    # AI & COMPUTER VISION PLACEHOLDERS (For future hackathon integration)
    # =========================================================================
    
    def detect_semantic_pii(text: str) -> List[str]:
        # TODO: Integrate spaCy NER or LLM (e.g., Gemini / Google Cloud DLP)
        # to detect context-aware sensitive records:
        # - Intimate medical examinations
        # - Psychiatric evaluations
        # - Informant details & undercover operations
        return []

    def detect_visual_pii(pdf_bytes) -> List[str]:
        # TODO: Integrate OpenCV / YOLO to detect:
        # - Photographs of victims/minors
        # - Signatures & Thumbprints
        # Return coordinates for redaction_service.py to draw boxes
        return []

    # Return structure expected by redaction service
    return {
        "emails": emails,
        "phones": phones,
        "pan": pans,
        "aadhaar": aadhaars,
        "voter_id": voter_ids,
        "passport": passports,
        "upi": upis,
        "credit_cards": cards,
        "bank_accounts": bank_accounts,
        "ips": ips,
        "names": names + detect_semantic_pii(text),
        "addresses": []
    }
