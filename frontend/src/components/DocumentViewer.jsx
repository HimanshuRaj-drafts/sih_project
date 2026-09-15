import React, { useState, useEffect } from 'react';
import { fetchSecureDocumentStream } from '../services/api';
// import { ethers } from 'ethers'; // Assuming ethers is available

export default function DocumentViewer({ documentId }) {
  // Add state variables for pdfUrl, isVerifying, and verificationStatus
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);

  // Create a useEffect that calls fetchSecureDocumentStream
  useEffect(() => {
    if (!documentId) return;

    let objectUrl = null;

    async function loadDocument() {
      try {
        const blob = await fetchSecureDocumentStream(documentId);
        setPdfBlob(blob);
        // Converts the blob to an Object URL (URL.createObjectURL)
        objectUrl = URL.createObjectURL(blob);
        // Sets it to pdfUrl for display
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

  // Add a verifyIntegrity() function that hashes the downloaded blob
  async function verifyIntegrity() {
    if (!pdfBlob) return;
    
    setIsVerifying(true);
    setVerificationStatus('Verifying...');
    
    try {
      const arrayBuffer = await pdfBlob.arrayBuffer();
      // hashes the downloaded blob using crypto.subtle.digest('SHA-256')
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const hashBytes32 = "0x" + hashHex;
      
      console.log("Document Hash:", hashBytes32);

      // Compares it with the Polygon smart contract using Ethers.js
      // (Placeholder for the actual ethers.js call)
      /*
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI, provider);
      const isValid = await contract.verifyDocument(hashBytes32);
      if (isValid) {
         setVerificationStatus('Document Verified!');
      } else {
         setVerificationStatus('Document Tampered or Not Found!');
      }
      */
      
      // Simulate verification
      setTimeout(() => {
        setVerificationStatus(`Verification completed for hash: ${hashBytes32.substring(0, 10)}...`);
        setIsVerifying(false);
      }, 1500);

    } catch (error) {
      console.error("Verification failed", error);
      setVerificationStatus('Verification Failed');
      setIsVerifying(false);
    }
  }

  return (
    <div className="document-viewer">
      <div className="viewer-controls">
        <h2>Document Viewer</h2>
        {/* Added Verify Button for Station 4 */}
        <button 
          onClick={verifyIntegrity} 
          disabled={isVerifying || !pdfUrl}
        >
          {isVerifying ? 'Verifying...' : 'Verify Integrity'}
        </button>
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
