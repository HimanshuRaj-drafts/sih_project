import time
import secrets

# In-memory ledger to store anchored evidence for the mock relayer
MOCK_LEDGER = {
    # Pre-seeded dummy record for hackathon judges
    "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92": {
        "uploader_id": "0xPoliceRelayer999",
        "document_id": "DEMO-DOC-777",
        "timestamp": int(time.time()),
        "tx_hash": "0x" + secrets.token_hex(32),
        "block_number": 458920
    }
}
_CURRENT_BLOCK = 458920

def store_evidence_mock(document_hash: str, document_id: str, uploader_id: str) -> dict:
    """Simulates anchoring evidence on a blockchain testnet."""
    global _CURRENT_BLOCK
    
    # Generate realistic EVM transaction hash
    tx_hash = "0x" + secrets.token_hex(32)
    
    # Increment mock block number
    _CURRENT_BLOCK += 1
    
    # Store record
    record = {
        "uploader_id": uploader_id,
        "document_id": document_id,
        "timestamp": int(time.time()),
        "tx_hash": tx_hash,
        "block_number": _CURRENT_BLOCK
    }
    
    MOCK_LEDGER[document_hash] = record
    
    return {
      "status": "anchored",
      "transaction_hash": tx_hash,
      "block_number": _CURRENT_BLOCK,
      "network": "Polygon Amoy",
      "explorer_url": f"https://amoy.polygonscan.com/tx/{tx_hash}"
    }

def get_evidence_mock(document_hash: str) -> dict:
    """Retrieves mocked anchored evidence from the in-memory ledger."""
    record = _LEDGER.get(document_hash)
    
    if record:
        return {
            "is_authentic": True,
            "uploader": record["uploader_id"],
            "timestamp": record["timestamp"],
            "document_id": record["document_id"],
            "transaction_hash": record["tx_hash"],
            "block_number": record["block_number"]
        }
    else:
        return {
            "is_authentic": False,
            "message": "Hash not found on ledger or evidence altered."
        }
