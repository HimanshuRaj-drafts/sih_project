// api.js - Main API service for the frontend

// --- START: PDF STREAM FETCHER ---
export async function fetchSecureDocumentStream(documentId) {
  try {
    const response = await fetch(`/api/stream/${documentId}`, {
      method: 'GET',
      // CRITICAL for receiving the PDF stream properly from FastAPI
      headers: {
        'Accept': 'application/pdf',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }

    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Error fetching secure document stream:', error);
    throw error;
  }
}
// --- END ---
