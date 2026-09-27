import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { viewEvidence } from '../services/frontend_api';
import { X, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function ViewEvidenceModal({ documentId, isOpen, onClose }) {
  const { user } = useAuth();
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  // Container ref for responsive width
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(null);

  useEffect(() => {
    if (!isOpen || !documentId) return;

    let objectUrl = null;
    setLoading(true);
    setError('');
    setPageNumber(1);
    setScale(1.0);

    async function loadSecureStream() {
      try {
        const officerEmail = user?.email || 'officer@ncrb.gov.in';
        const res = await viewEvidence(documentId, officerEmail);
        objectUrl = res.objectUrl;
        setFileData(res);
      } catch (err) {
        console.error("Failed to load secure document stream:", err);
        setError(err.message || 'Failed to stream secure document. It may not exist in the vault.');
      } finally {
        setLoading(false);
      }
    }

    loadSecureStream();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [documentId, isOpen, user]);

  useEffect(() => {
    // Make PDF responsive to screen size
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
    const handleResize = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, fileData]);

  if (!isOpen) return null;

  const isPdf = fileData?.type === 'application/pdf';

  return createPortal(
    <div className="fixed top-0 left-0 z-[9999] w-screen h-screen bg-slate-900/95 flex flex-col m-0 p-0 overflow-hidden backdrop-blur-sm">
      
      {/* Top Toolbar */}
      <div className="w-full bg-slate-900 border-b border-slate-700 p-3 flex flex-wrap items-center justify-between text-white shadow-xl z-10 shrink-0 gap-3">
        <div className="flex items-center space-x-2">
          {fileData && (
            <a 
              href={fileData.objectUrl} 
              download={`evidence-${documentId}`}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download Secure Copy</span>
              <span className="sm:hidden">Download</span>
            </a>
          )}
        </div>

        {isPdf && numPages && (
          <div className="flex items-center space-x-4 bg-slate-800 rounded-lg px-2 py-1">
            <div className="flex items-center space-x-1">
              <button 
                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="p-1 hover:bg-slate-700 rounded disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-mono w-16 text-center">
                {pageNumber} / {numPages}
              </span>
              <button 
                onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
                className="p-1 hover:bg-slate-700 rounded disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="w-px h-6 bg-slate-700"></div>
            <div className="flex items-center space-x-1">
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1 hover:bg-slate-700 rounded">
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-1 hover:bg-slate-700 rounded">
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <button 
          onClick={onClose}
          className="p-2 bg-slate-800 hover:bg-red-600 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main View Area */}
      <div 
        ref={containerRef}
        className="flex-1 w-full overflow-auto flex items-start justify-center p-4 bg-slate-900/50"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center text-blue-400 h-full mt-20">
            <svg className="animate-spin h-10 w-10 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="font-bold text-sm tracking-wide animate-pulse">Establishing Secure Stream...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center max-w-md bg-white p-8 rounded-3xl mt-20">
            <div className="bg-red-100 text-red-600 p-4 rounded-full inline-block mb-4">
              <X className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Access Failed</h3>
            <p className="text-slate-600 font-medium">{error}</p>
          </div>
        )}

        {fileData && !loading && !error && (
          <div className="bg-white shadow-2xl rounded-sm overflow-hidden" style={{ transition: 'transform 0.1s' }}>
            {isPdf ? (
              <Document
                file={fileData.objectUrl}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={<div className="p-20 text-slate-500 font-bold">Decrypting PDF layers...</div>}
                className="max-w-full"
              >
                <Page 
                  pageNumber={pageNumber} 
                  scale={scale}
                  width={containerWidth ? Math.min(containerWidth - 32, 800) : undefined}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-sm"
                />
              </Document>
            ) : (
              <img 
                src={fileData.objectUrl} 
                alt="Secure Evidence"
                className="max-w-full h-auto object-contain"
                style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
              />
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
