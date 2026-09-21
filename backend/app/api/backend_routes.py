from fastapi import APIRouter, File, UploadFile, Form, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import hashlib
import uuid
import io
import os
import base64
from web3 import Web3
from datetime import datetime

# Mocks and placeholders for external services
from app.services.ocr_service import ingest_and_extract_text
from app.services.pii_service import detect_pii
from app.services.redaction_service import apply_redactions
from app.services.supabase_service import upload_master_pdf, get_master_pdf
from app.services.watermark_service import apply_watermark
from app.services.blockchain_service import store_evidence_mock, get_evidence_mock


# Web3 setup
# Use an environment variable for the private key and RPC URL
RPC_URL = os.getenv("POLYGON_AMOY_RPC_URL", "https://rpc-amoy.polygon.technology")
PRIVATE_KEY = os.getenv("MASTER_WALLET_PRIVATE_KEY", "0x0000000000000000000000000000000000000000000000000000000000000000")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "0x0000000000000000000000000000000000000000")
CONTRACT_ABI = [
    # Minimal ABI for storeEvidence and getEvidence
    {
        "inputs": [
            {"internalType": "string", "name": "documentHash", "type": "string"},
            {"internalType": "string", "name": "documentId", "type": "string"}
        ],
        "name": "storeEvidence",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "documentHash", "type": "string"}],
        "name": "getEvidence",
        "outputs": [
            {"internalType": "address", "name": "uploader", "type": "address"},
            {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
            {"internalType": "string", "name": "documentId", "type": "string"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

w3 = Web3(Web3.HTTPProvider(RPC_URL))

# Mocking contract instantiation (will fail if address is invalid but it's an integration example)
try:
    contract = w3.eth.contract(
        address=w3.to_checksum_address(CONTRACT_ADDRESS) if CONTRACT_ADDRESS.startswith('0x') else None, 
        abi=CONTRACT_ABI
    )
except Exception:
    contract = None

router = APIRouter(prefix="/api/v1/evidence", tags=["evidence"])

class AnchorRequest(BaseModel):
    document_id: str
    document_hash: str
    uploader_id: str

@router.post("/upload")
async def upload_evidence(
    file: UploadFile = File(...),
    case_number: str = Form(...),
    uploader_id: str = Form(...)
):
    try:
        content = await file.read()
        filename = file.filename
        
        # 1. OCR Extraction
        ocr_result = ingest_and_extract_text(content, filename)
        extracted_text = ocr_result["raw_text"]
        
        # 2. PII Detection
        pii_data = detect_pii(extracted_text)
        
        # 3. Redaction (returns io.BytesIO)
        if filename.lower().endswith('.pdf'):
            redacted_io = apply_redactions(content, pii_data)
            mime_type = "application/pdf"
        else:
            redacted_io = io.BytesIO(content) # Fallback for non-pdfs for now
            mime_type = "image/jpeg" if filename.lower().endswith(('.jpg', '.jpeg')) else "image/png"
            
        # Generate Preview & Entities
        redacted_preview_base64 = f"data:{mime_type};base64," + base64.b64encode(redacted_io.getvalue()).decode('utf-8')
        
        redacted_entities = []
        for k, v in pii_data.items():
            items = list(v) if v else []
            if items:
                redacted_entities.append({"type": k.capitalize(), "count": len(items)})

        # 4. Cryptographic Hashing of ORIGINAL Content (for Zero-Trust Verification)
        # We must anchor the raw original evidence hash, not the redacted version.
        doc_hash = hashlib.sha256(content).hexdigest()
        
        # 5. Generate document ID
        document_id = str(uuid.uuid4())
        
        # 6. Secure Vault Storage (Supabase)
        try:
            upload_master_pdf(redacted_io, filename, uploader_id)
        except Exception as e:
            print(f"Supabase upload failed (bypassing for demo if keys not set): {e}")
            pass
        
        return {
            "document_id": document_id,
            "document_hash": doc_hash,
            "message": "File processed, redacted, and uploaded successfully",
            "redacted_preview_base64": redacted_preview_base64,
            "redacted_entities": redacted_entities
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/anchor")
async def anchor_evidence(payload: AnchorRequest):
    try:
        receipt = store_evidence_mock(
            document_hash=payload.document_hash,
            document_id=payload.document_id,
            uploader_id=payload.uploader_id
        )
        return receipt
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mock Blockchain anchor failed: {str(e)}")

@router.get("/view/{document_id}")
async def view_evidence(
    document_id: str,
    x_viewer_email: str = Header(...)
):
    try:
        # 1. Fetch file from Supabase into memory
        try:
            # The frontend passes the filename (with extension) as document_id
            # We match the path generated in generate_storage_path which is just "evidence/{filename}"
            file_content = get_master_pdf(f"evidence/{document_id}")
            file_stream = io.BytesIO(file_content)
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Document not found or Supabase fetch failed: {e}")
        # 2. Apply watermark
        user_claims = {"id": x_viewer_email}
        watermarked_io = apply_watermark(file_stream, user_claims)
        
        # 3. Return as stream
        watermarked_io.seek(0)
        return StreamingResponse(watermarked_io, media_type="application/pdf", headers={
            "Content-Disposition": f"inline; filename={document_id}.pdf"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

import re
from app.services.blockchain_service import MOCK_LEDGER

@router.get("/verify/{document_hash}")
def verify_evidence(document_hash: str):
    clean_hash = document_hash.strip().lower()
    
    # Validate it's a 64-character hex string
    if not re.match(r"^[a-f0-9]{64}$", clean_hash):
        return {
            "is_authentic": False,
            "document_hash": clean_hash,
            "message": "Invalid hash format. Must be a 64-character hex string."
        }
        
    record = MOCK_LEDGER.get(clean_hash)

    if not record:
        return {
            "is_authentic": False,
            "document_hash": clean_hash,
            "message": "Evidence not found on ledger or document has been modified.",
        }

    return {
        "is_authentic": True,
        "document_hash": clean_hash,
        "uploader": record.get("uploader_id", "0xPoliceRelayer999"),
        "timestamp": record.get("timestamp"),
        "document_id": record.get("document_id"),
        "transaction_hash": record.get("tx_hash"),
        "block_number": record.get("block_number"),
        "explorer_url": f"https://amoy.polygonscan.com/tx/{record.get('tx_hash')}",
    }
