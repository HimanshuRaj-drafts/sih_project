import React, { useState, useEffect } from 'react';
import { viewEvidence } from '../services/frontend_api';
import { useAuth } from '../context/AuthContext'; // Import auth to get user email

export default function DocumentViewer({ documentId }) {
  const { user } = useAuth();
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  // We don't store pdfBlob anymore since viewEvidence returns objectUrl directly
  
  useEffect(() => {
    if (!documentId) return;

    let objectUrl = null;

    async function loadDocument() {
      try {
        const officerEmail = user?.email || 'unknown_officer@ncrb.gov.in';
        objectUrl = await viewEvidence(documentId, officerEmail);
        setPdfUrl(objectUrl);
      } catch (error) {
        console.error("Failed to load secure document stream:", error);
      }
    }

    loadDocument();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [documentId]);

  // Verification is now handled by the Zero-Trust Verify component directly.
  const verifyIntegrity = () => {
    alert("Please use the Zero-Trust Verifier tool from the sidebar to cryptographically verify this document.");
  }

  return (
    <div className="document-viewer">
      <div className="viewer-controls">
        <h2>Document Viewer</h2>
        {/* Added Verify Button for Station 4 */}
        {/* <button 
          onClick={verifyIntegrity} 
          disabled={isVerifying || !pdfUrl}
        >
          {isVerifying ? 'Verifying...' : 'Verify Integrity'}
        </button> */}
        {verificationStatus && <span className="status">{verificationStatus}</span>}
      </div>

      <div className="viewer-content">
        {pdfUrl ? (
          <iframe 
            src={pdfUrl} 
            title="PDF Document" 
            width="100%" 
            height="600px" 
            style={{ border: '1px solid #ccc' }}
          />
        ) : (
          <p>Loading document stream...</p>
        )}
      </div>
    </div>
  );
}
