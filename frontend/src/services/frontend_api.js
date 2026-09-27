// frontend/src/services/frontend_api.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * 1. Upload & Redact
 * Sends FormData containing the raw evidence file, case_number, and uploader_id.
 */
export async function uploadEvidence(file, caseNumber, uploaderId, manualRedactedFile = null) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('case_number', caseNumber);
    formData.append('uploader_id', uploaderId);
    if (manualRedactedFile) {
      console.log("Sending manualRedactedFile. Size:", manualRedactedFile.size);
      formData.append('manual_redacted_file', manualRedactedFile);
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/evidence/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    // Returns { document_id, document_hash }
    return await response.json();
  } catch (error) {
    console.error("Error in uploadEvidence:", error);
    throw error;
  }
}

/**
 * 2. Gasless Blockchain Anchoring
 * Sends document_id, document_hash, and uploader_id as JSON payload.
 */
export async function anchorEvidence(documentId, documentHash, uploaderId) {
  try {
    const payload = {
      document_id: documentId,
      document_hash: documentHash,
      uploader_id: uploaderId,
    };

    const response = await fetch(`${API_BASE_URL}/api/v1/evidence/anchor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Anchoring failed: ${response.statusText}`);
    }

    // Returns { transaction_hash, status }
    return await response.json();
  } catch (error) {
    console.error("Error in anchorEvidence:", error);
    throw error;
  }
}

/**
 * 3. Dynamic Watermark Streaming
 * Fetches the document stream passing the officer's email in headers.
 * Converts the returned binary stream into an Object URL.
 */
export async function viewEvidence(documentId, officerEmail) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/evidence/view/${documentId}`, {
      method: 'GET',
      headers: {
        'X-Viewer-Email': officerEmail,
      },
    });

    if (!response.ok) {
      throw new Error(`View failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    // Convert binary stream to an Object URL for <iframe> or <img> tags
    const objectUrl = URL.createObjectURL(blob);
    return { objectUrl, type: blob.type };
  } catch (error) {
    console.error("Error in viewEvidence:", error);
    throw error;
  }
}

/**
 * 4. Zero-Knowledge Hash Verification
 * Calculates SHA-256 locally and verifies on the backend.
 */
export async function verifyEvidence(file) {
  try {
    // Read file as ArrayBuffer for hashing
    const arrayBuffer = await file.arrayBuffer();
    
    // Calculate SHA-256 hash using Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const documentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Send only the hash to the backend
    const response = await fetch(`${API_BASE_URL}/api/v1/evidence/verify/${documentHash}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Verification request failed: ${response.statusText}`);
    }

    // Returns { authentic, uploader, timestamp, ... }
    return await response.json();
  } catch (error) {
    console.error("Error in verifyEvidence:", error);
    throw error;
  }
}
