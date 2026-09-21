import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { viewEvidence } from '../services/frontend_api';
import { X, Lock } from 'lucide-react';

export default function ViewEvidenceModal({ documentId, isOpen, onClose }) {
  const { user } = useAuth();
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !documentId) return;

    let objectUrl = null;
    setLoading(true);
    setError('');

    async function loadSecureStream() {
      try {
        const officerEmail = user?.email || 'officer@ncrb.gov.in'; // Fallback for testing
        // viewEvidence fetches the binary blob and returns an object URL
        objectUrl = await viewEvidence(documentId, officerEmail);
        setPdfUrl(objectUrl);
      } catch (err) {
        console.error("Failed to load secure document stream:", err);
        setError(err.message || 'Failed to stream secure document. It may not exist in the vault.');
      } finally {
        setLoading(false);
      }
    }

    loadSecureStream();

    // Clean up the blob URL when the modal closes or documentId changes
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [documentId, isOpen, user]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed top-0 left-0 z-[9999] w-screen h-screen bg-[#F8FAFC] m-0 p-0 overflow-hidden">
      
      {/* Floating Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-[10000] p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors shadow-xl backdrop-blur-md cursor-pointer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Modal Body */}
      <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-[#F8FAFC] text-slate-900 m-0 p-0">
          {loading && (
            <div className="flex flex-col items-center justify-center text-blue-600">
              <svg className="animate-spin h-10 w-10 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="font-bold text-sm tracking-wide animate-pulse">Establishing Secure Stream...</p>
            </div>
          )}

          {error && !loading && (
            <div className="text-center max-w-md">
              <div className="bg-red-100 text-red-600 p-4 rounded-full inline-block mb-4">
                <X className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Access Failed</h3>
              <p className="text-slate-600 font-medium">{error}</p>
            </div>
          )}

          {pdfUrl && !loading && !error && (
            <iframe
              src={pdfUrl}
              className="w-full h-full bg-white border-none m-0 p-0 block"
              style={{ width: '100vw', height: '100vh' }}
              title="Secure Evidence Viewer"
            />
          )}
        </div>
    </div>,
    document.body
  );
}
