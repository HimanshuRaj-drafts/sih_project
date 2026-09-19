import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vault, db } from '../services/supabase';
import { registerDocumentHash } from '../services/blockchain';
import { UploadCloud, CheckCircle, Clock, ShieldCheck, Database, Link, AlertCircle, File } from 'lucide-react';

const Upload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [file, setFile] = useState(null);
  const [caseNumberInput, setCaseNumberInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle, redacting, archiving, anchoring, database, complete, error
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setErrorMessage('');
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
      // Station 1: AI Redaction (Mock)
      console.log("Station 1: Redaction simulation start");
      setStatus('redacting');
      await delay(2000);
      
      // Station 2: Vault Archival (Actual Supabase Storage)
      setStatus('archiving');
      const storagePath = await vault.uploadEvidence(file, file.name);
      console.log("Station 2: Vault upload output path:", storagePath);
      
      // Station 3: Blockchain Anchoring (Actual)
      setStatus('anchoring');
      
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const realDocHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      let realTxHash = '';
      try {
        realTxHash = await registerDocumentHash(realDocHash);
        console.log("Station 3: Blockchain anchoring complete - TxHash:", realTxHash, "DocHash:", realDocHash);
      } catch (bcError) {
        console.error("Blockchain registration failed:", bcError);
        throw new Error("Blockchain registration failed. Please ensure your wallet is connected and you are the contract owner.");
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
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
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
    <div className="p-10 max-w-4xl mx-auto animate-cipher" style={{animationDelay: '100ms'}}>
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Document Ingestion</h1>
        <div className="h-[4px] w-12 bg-blue-600 rounded-full mb-4"></div>
        <p className="text-slate-500 font-medium text-lg">Secure cryptographic pipeline for evidence archival.</p>
      </div>

      {errorMessage && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700 shadow-sm animate-cipher" style={{animationDelay: '200ms'}}>
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-bold">{errorMessage}</p>
        </div>
      )}

      {success && (
        <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-800 shadow-sm animate-cipher" style={{animationDelay: '200ms'}}>
          <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-emerald-600" />
          <p className="text-sm font-bold">Document Secured & Registered</p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col lg:flex-row">
        
        {/* Left Side: Upload Area */}
        <div className="lg:w-1/2 p-8 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/50 flex flex-col justify-center">
          <div className="text-center">
            {file ? (
              <div className="bg-white border-2 border-dashed border-blue-200 rounded-2xl p-8 flex flex-col items-center justify-center transition-all">
                <File className="h-12 w-12 text-blue-600 mb-4" strokeWidth={1.5} />
                <p className="text-lg font-black text-slate-900 truncate w-full px-4">{file.name}</p>
                <p className="text-sm font-semibold text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                {status === 'idle' && (
                  <button 
                    onClick={() => setFile(null)}
                    className="mt-4 text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wide"
                  >
                    Remove File
                  </button>
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
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-slate-700 font-medium disabled:opacity-50"
            />
          </div>

          <button
            onClick={simulatePipeline}
            disabled={!file || !caseNumberInput.trim() || status !== 'idle'}
            className={`mt-8 w-full bg-slate-900 text-white rounded-xl py-3.5 font-bold hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 text-base shadow-lg ${(!file || !caseNumberInput.trim() || status !== 'idle') ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {status === 'idle' ? 'Initiate Pipeline' : 'Pipeline Active...'}
          </button>
        </div>

        {/* Right Side: Stepper UI */}
        <div className="lg:w-1/2 p-8">
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
