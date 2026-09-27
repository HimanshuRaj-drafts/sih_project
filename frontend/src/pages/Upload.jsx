import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vault, db } from '../services/supabase';
import { registerDocumentHash } from '../services/blockchain';
import { uploadEvidence, anchorEvidence } from '../services/frontend_api';
import { UploadCloud, CheckCircle, Clock, ShieldCheck, Database, Link, AlertCircle, File, Edit2 } from 'lucide-react';
import DocumentRedactor from '../components/DocumentRedactor';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const Upload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [file, setFile] = useState(null);
  const [caseNumberInput, setCaseNumberInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle, redacting, archiving, anchoring, database, complete, error
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [showRedactor, setShowRedactor] = useState(false);
  const [redactedFile, setRedactedFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setErrorMessage('');
      setPreviewData(null);
      setShowRedactor(false);
      setRedactedFile(null);
    }
  };

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  const simulatePipeline = async () => {
    if (!file) return;
    
    if (!user?.id) {
      setErrorMessage('Officer authentication required');
      return;
    }
    
    setErrorMessage('');
    setSuccess(false);
    
    try {
      // Station 1 & 2: AI Redaction & Vault Archival (FastAPI Backend)
      console.log("Station 1: Redaction & Upload start");
      setStatus('redacting');
      const uploadRes = await uploadEvidence(file, caseNumberInput.trim(), user.id, redactedFile);
      
      setStatus('archiving');
      await delay(500); // Small delay for visual effect
      console.log("Station 2: Vault upload output result:", uploadRes);
      
      // Station 3: Blockchain Anchoring (FastAPI Backend)
      setStatus('anchoring');
      const realDocHash = uploadRes.document_hash;
      
      let realTxHash = '';
      try {
        const anchorRes = await anchorEvidence(uploadRes.document_id, uploadRes.document_hash, user.id);
        realTxHash = anchorRes.transaction_hash;
        console.log("Station 3: Blockchain anchoring complete - TxHash:", realTxHash, "DocHash:", realDocHash);
      } catch (bcError) {
        console.error("Blockchain registration failed:", bcError);
        throw new Error("Blockchain registration failed. Please ensure backend web3 configuration is correct.");
      }
      
      // Station 4: Database Registration (Actual Supabase DB)
      setStatus('database');
      const payload = {
        case_number: caseNumberInput.trim(),
        file_name: file.name,
        document_hash: realDocHash,
        blockchain_tx_hash: realTxHash,
        uploader_id: user.id
      };
      console.log("Station 4: db.saveCaseMetadata payload:", payload);
      
      try {
        const response = await db.saveCaseMetadata(payload);
        console.log("Station 4: db.saveCaseMetadata response:", response);
      } catch (dbError) {
        console.error("Database save failed:", dbError);
        throw dbError; // rethrow to be caught by the outer catch
      }
      
      setStatus('complete');
      setSuccess(true);
      setPreviewData({
        base64: uploadRes.redacted_preview_base64,
        entities: uploadRes.redacted_entities || [],
        docHash: realDocHash,
        txHash: realTxHash
      });
      
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'An error occurred during the upload pipeline.');
    }
  };

  // Helper to render step status icon
  const renderStepIcon = (stepStatus, currentStatus) => {
    const stages = ['idle', 'redacting', 'archiving', 'anchoring', 'database', 'complete', 'error'];
    const stepIndex = stages.indexOf(stepStatus);
    const currentIndex = stages.indexOf(currentStatus);
    
    if (currentStatus === 'error' && stepIndex >= currentIndex) return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (currentIndex > stepIndex || currentStatus === 'complete') return <CheckCircle className="h-5 w-5 text-emerald-500" />;
    if (currentIndex === stepIndex) return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
    return <div className="h-5 w-5 rounded-full border-2 border-slate-300" />;
  };

  return (
    <div className="p-4 sm:p-10 max-w-4xl mx-auto animate-cipher w-full" style={{animationDelay: '100ms'}}>
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2 tracking-tight">Document Ingestion</h1>
        <div className="h-[4px] w-12 bg-blue-600 rounded-full mb-4 mx-auto sm:mx-0"></div>
        <p className="text-slate-500 font-medium text-base md:text-lg">Secure cryptographic pipeline for evidence archival.</p>
      </div>

      {errorMessage && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700 shadow-sm animate-cipher" style={{animationDelay: '200ms'}}>
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-bold">{errorMessage}</p>
        </div>
      )}

      {success && previewData && (
        <div className="mb-8 p-6 bg-emerald-50 border-2 border-emerald-500 rounded-3xl flex flex-col space-y-6 shadow-sm animate-cipher" style={{animationDelay: '200ms'}}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-emerald-200 pb-4 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 text-emerald-800">
              <CheckCircle className="h-8 w-8 flex-shrink-0 text-emerald-600" />
              <div>
                <h2 className="text-lg md:text-xl font-black leading-tight">Document Secured & Registered</h2>
                <p className="text-xs md:text-sm font-semibold text-emerald-600">Redactions applied and blockchain anchor verified.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 md:py-2 px-6 rounded-xl transition-colors shadow-sm text-sm"
            >
              Go to Dashboard
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 border-b pb-2">Permanent Redaction Preview</h3>
              <div className="bg-white p-2 border border-slate-200 rounded-xl shadow-inner">
                {previewData.base64 && previewData.base64.startsWith('data:application/pdf') ? (
                  <div className="flex justify-center w-full h-96 overflow-auto bg-slate-100 rounded-lg">
                    <Document 
                      file={previewData.base64} 
                      loading={<div className="p-10 text-slate-500 font-bold">Loading Preview...</div>}
                    >
                      <Page pageNumber={1} width={300} renderTextLayer={false} renderAnnotationLayer={false} />
                    </Document>
                  </div>
                ) : previewData.base64 ? (
                  <img src={previewData.base64} className="w-full max-h-96 object-contain mx-auto rounded-lg" alt="Redacted Preview" />
                ) : (
                  <div className="h-96 flex items-center justify-center text-slate-400">Preview not available</div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 border-b pb-2 mb-4">Detected PII Masked</h3>
                <div className="flex flex-wrap gap-2">
                  {previewData.entities.length > 0 ? previewData.entities.map((ent, idx) => (
                    <span key={idx} className="inline-flex items-center px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
                      ✓ {ent.count} {ent.type} Redacted
                    </span>
                  )) : (
                    <span className="text-sm text-slate-500 font-medium">No PII detected requiring redaction.</span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 border-b pb-2 mb-4">Cryptographic Receipt</h3>
                <div className="space-y-4 bg-white p-4 rounded-xl border border-emerald-100">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Evidence Hash (SHA-256)</label>
                    <p className="font-mono text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 break-all">{previewData.docHash}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Blockchain Tx Hash</label>
                    <a 
                      href={`https://amoy.polygonscan.com/tx/${previewData.txHash}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="font-mono text-sm text-blue-600 hover:text-blue-800 underline block truncate bg-blue-50 p-2 rounded border border-blue-100"
                    >
                      {previewData.txHash}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRedactor && file && (file.type.startsWith('image/') || file.type === 'application/pdf') && (
        <DocumentRedactor 
          file={file} 
          onComplete={(newFile) => { 
            setRedactedFile(newFile); 
            setShowRedactor(false); 
          }} 
          onCancel={() => setShowRedactor(false)} 
        />
      )}

      <div className={`bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col lg:flex-row transition-all duration-500 ${success ? 'opacity-50 pointer-events-none scale-95 origin-top' : ''}`}>
        
        {/* Left Side: Upload Area */}
        <div className="w-full lg:w-1/2 p-4 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/50 flex flex-col justify-center">
          <div className="text-center">
            {file ? (
              <div className="bg-white border-2 border-dashed border-blue-200 rounded-2xl p-8 flex flex-col items-center justify-center transition-all relative">
                {redactedFile && (
                  <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-md border border-emerald-200 flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Manually Redacted</span>
                  </div>
                )}
                <File className="h-12 w-12 text-blue-600 mb-4" strokeWidth={1.5} />
                <p className="text-lg font-black text-slate-900 truncate w-full px-4">{file.name}</p>
                <p className="text-sm font-semibold text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                {status === 'idle' && (
                  <div className="flex flex-col items-center mt-4 space-y-2">
                    {(file.type.startsWith('image/') || file.type === 'application/pdf') && !showRedactor && (
                      <button 
                        onClick={() => setShowRedactor(true)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wide bg-blue-50 px-4 py-2 rounded-lg flex items-center space-x-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{redactedFile ? 'Redraw Manual Redactions' : 'Draw Manual Redactions'}</span>
                      </button>
                    )}
                    <button 
                      onClick={() => { setFile(null); setRedactedFile(null); }}
                      className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wide p-2"
                    >
                      Remove File
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative group cursor-pointer bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-12 flex flex-col items-center justify-center transition-all">
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  onChange={handleFileChange}
                />
                <UploadCloud className="h-12 w-12 text-slate-400 group-hover:text-blue-500 transition-colors mb-4" strokeWidth={1.5} />
                <p className="text-base font-bold text-slate-700">Select Document</p>
                <p className="text-xs font-medium text-slate-400 mt-2">PDF, DOCX, or Image (Max 50MB)</p>
              </div>
            )}
          </div>
          
          <div className="mt-6 text-left">
            <label className="block text-sm font-bold text-slate-700 mb-2">Case Number</label>
            <input 
              type="text" 
              placeholder="Enter official case number (e.g. NCRB-2026-001)"
              value={caseNumberInput}
              onChange={(e) => setCaseNumberInput(e.target.value)}
              disabled={status !== 'idle'}
              className="w-full px-4 py-3.5 sm:py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-slate-700 font-medium disabled:opacity-50 text-base"
            />
          </div>

          <button
            onClick={simulatePipeline}
            disabled={!file || !caseNumberInput.trim() || status !== 'idle'}
            className={`mt-8 w-full bg-slate-900 text-white rounded-xl py-4 sm:py-3.5 font-bold hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 text-base md:text-lg shadow-lg ${(!file || !caseNumberInput.trim() || status !== 'idle') ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {status === 'idle' ? 'Initiate Pipeline' : 'Pipeline Active...'}
          </button>
        </div>

        {/* Right Side: Stepper UI */}
        <div className="w-full lg:w-1/2 p-4 sm:p-8">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Pipeline Status</h3>
          
          <div className="space-y-6">
            
            {/* Step 1: AI Redaction */}
            <div className="flex items-start space-x-4">
              <div className="mt-1">
                {renderStepIcon('redacting', status)}
              </div>
              <div className={`p-4 rounded-xl border flex-1 transition-all ${status === 'redacting' ? 'border-blue-200 bg-blue-50 shadow-sm' : 'border-slate-100 bg-white'}`}>
                <div className="flex items-center space-x-3 mb-1">
                  <ShieldCheck className={`h-5 w-5 ${status === 'redacting' ? 'text-blue-600' : 'text-slate-400'}`} strokeWidth={2.5} />
                  <h4 className={`text-sm font-bold ${status === 'redacting' ? 'text-blue-900' : 'text-slate-700'}`}>Station 1: AI Redaction</h4>
                </div>
                <p className="text-xs font-medium text-slate-500 ml-8">Sanitizing PII data before storage...</p>
              </div>
            </div>

            {/* Step 2: Vault Archival */}
            <div className="flex items-start space-x-4">
              <div className="mt-1">
                {renderStepIcon('archiving', status)}
              </div>
              <div className={`p-4 rounded-xl border flex-1 transition-all ${status === 'archiving' ? 'border-blue-200 bg-blue-50 shadow-sm' : 'border-slate-100 bg-white'}`}>
                <div className="flex items-center space-x-3 mb-1">
                  <Database className={`h-5 w-5 ${status === 'archiving' ? 'text-blue-600' : 'text-slate-400'}`} strokeWidth={2.5} />
                  <h4 className={`text-sm font-bold ${status === 'archiving' ? 'text-blue-900' : 'text-slate-700'}`}>Station 2: Vault Archival</h4>
                </div>
                <p className="text-xs font-medium text-slate-500 ml-8">Uploading original to secure Supabase vault...</p>
              </div>
            </div>

            {/* Step 3: Blockchain */}
            <div className="flex items-start space-x-4">
              <div className="mt-1">
                {renderStepIcon('anchoring', status)}
              </div>
              <div className={`p-4 rounded-xl border flex-1 transition-all ${status === 'anchoring' ? 'border-blue-200 bg-blue-50 shadow-sm' : 'border-slate-100 bg-white'}`}>
                <div className="flex items-center space-x-3 mb-1">
                  <Link className={`h-5 w-5 ${status === 'anchoring' ? 'text-blue-600' : 'text-slate-400'}`} strokeWidth={2.5} />
                  <h4 className={`text-sm font-bold ${status === 'anchoring' ? 'text-blue-900' : 'text-slate-700'}`}>Station 3: Blockchain Anchor</h4>
                </div>
                <p className="text-xs font-medium text-slate-500 ml-8">Minting cryptographic proof of existence...</p>
              </div>
            </div>

            {/* Step 4: Database */}
            <div className="flex items-start space-x-4">
              <div className="mt-1">
                {renderStepIcon('database', status)}
              </div>
              <div className={`p-4 rounded-xl border flex-1 transition-all ${status === 'database' || status === 'complete' ? 'border-emerald-200 bg-emerald-50 shadow-sm' : 'border-slate-100 bg-white'}`}>
                <div className="flex items-center space-x-3 mb-1">
                  <CheckCircle className={`h-5 w-5 ${status === 'database' || status === 'complete' ? 'text-emerald-600' : 'text-slate-400'}`} strokeWidth={2.5} />
                  <h4 className={`text-sm font-bold ${status === 'database' || status === 'complete' ? 'text-emerald-800' : 'text-slate-700'}`}>Station 4: DB Registration</h4>
                </div>
                <p className="text-xs font-medium text-slate-500 ml-8">Finalizing case metadata on Supabase...</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
