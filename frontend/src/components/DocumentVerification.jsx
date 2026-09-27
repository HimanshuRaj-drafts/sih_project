import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, UploadCloud, Link as LinkIcon, Calendar, Hash, User, FileText } from 'lucide-react';
import { calculateFileHash } from '../utils/crypto';

export default function DocumentVerification() {
  const [status, setStatus] = useState('idle'); // 'idle', 'hashing', 'querying', 'authentic', 'tampered', 'error'
  const [matchData, setMatchData] = useState(null);
  const [computedHash, setComputedHash] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const verifyHashOnBackend = async (hashToVerify) => {
    setStatus('querying');
    try {
      // Direct call to FastAPI backend
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/v1/evidence/verify/${hashToVerify}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      
      if (data.is_authentic) {
        setMatchData(data);
        setStatus('authentic');
      } else {
        setErrorMessage(data.message || 'Evidence not found on ledger or document has been modified.');
        setStatus('tampered');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Error communicating with verification server.');
      setStatus('error');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus('hashing');
      setMatchData(null);
      setErrorMessage('');
      
      const hash = await calculateFileHash(file);
      setComputedHash(hash);
      
      await verifyHashOnBackend(hash);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to hash document locally.');
      setStatus('error');
    }
  };



  return (
    <div className="w-full">
      {/* Input Area */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-8 mb-8 shadow-sm transition-all">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-4">Upload Document for Local Hashing & Verification</label>
          <input 
            type="file" 
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer border border-slate-200 rounded-xl"
          />
        </div>

        {/* Loading States */}
        {status === 'hashing' && (
          <div className="mt-6 flex items-center space-x-3 text-blue-600">
            <UploadCloud className="h-5 w-5 animate-pulse" />
            <span className="font-semibold text-sm">Calculating cryptographic hash locally...</span>
          </div>
        )}
        {status === 'querying' && (
          <div className="mt-6 flex items-center space-x-3 text-blue-600">
            <LinkIcon className="h-5 w-5 animate-spin-slow" />
            <span className="font-semibold text-sm">Querying blockchain ledger for hash...</span>
          </div>
        )}
      </div>

      {/* Result Area */}
      {status === 'authentic' && matchData && (
        <div className="p-6 bg-emerald-50 border-2 border-emerald-500 rounded-2xl shadow-sm animate-cipher">
          <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-emerald-200/50">
            <ShieldCheck className="h-10 w-10 text-emerald-600" />
            <div>
              <h2 className="text-2xl font-black text-emerald-800 tracking-tight">TAMPER-PROOF & VERIFIED</h2>
              <p className="text-emerald-600 font-semibold text-sm">Document integrity mathematically proven.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-emerald-700 mb-1">
                <User className="h-4 w-4" />
                <span className="font-bold text-xs uppercase tracking-wider">Anchoring Officer</span>
              </div>
              <p className="text-slate-800 font-mono text-sm break-all bg-white/50 p-2 rounded-lg border border-emerald-100">{matchData.uploader}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-emerald-700 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="font-bold text-xs uppercase tracking-wider">Timestamp</span>
              </div>
              <p className="text-slate-800 font-medium bg-white/50 p-2 rounded-lg border border-emerald-100">
                {new Date(matchData.timestamp * 1000).toLocaleString()}
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-emerald-700 mb-1">
                <FileText className="h-4 w-4" />
                <span className="font-bold text-xs uppercase tracking-wider">Document ID</span>
              </div>
              <p className="text-slate-800 font-medium bg-white/50 p-2 rounded-lg border border-emerald-100">{matchData.document_id}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-emerald-700 mb-1">
                <LinkIcon className="h-4 w-4" />
                <span className="font-bold text-xs uppercase tracking-wider">Blockchain Evidence</span>
              </div>
              <div className="bg-white/50 p-2 rounded-lg border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-semibold mb-1">Block #{matchData.block_number}</p>
                  <a href={matchData.explorer_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 font-mono text-sm underline truncate block max-w-[200px]">
                    {matchData.transaction_hash}
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-emerald-200/50">
             <div className="flex items-center space-x-2 text-emerald-700 mb-1">
                <Hash className="h-4 w-4" />
                <span className="font-bold text-xs uppercase tracking-wider">Verified Hash</span>
              </div>
              <p className="text-slate-600 font-mono text-xs break-all">{matchData.document_hash}</p>
          </div>
        </div>
      )}

      {(status === 'tampered' || status === 'error') && (
        <div className="p-6 bg-red-50 border-2 border-red-500 rounded-2xl shadow-sm animate-cipher">
          <div className="flex items-start space-x-4 mb-4">
            <ShieldAlert className="h-10 w-10 flex-shrink-0 text-red-600" />
            <div>
              <h2 className="text-2xl font-black text-red-800 tracking-tight mb-1">INTEGRITY CHECK FAILED</h2>
              <p className="text-red-700 font-medium">{errorMessage}</p>
            </div>
          </div>
          
          {computedHash && (
             <div className="mt-6 pt-4 border-t border-red-200/50">
               <div className="flex items-center space-x-2 text-red-700 mb-2">
                  <Hash className="h-4 w-4" />
                  <span className="font-bold text-xs uppercase tracking-wider">Queried Hash</span>
                </div>
                <p className="text-slate-800 font-mono text-sm break-all bg-white/60 p-3 rounded-lg border border-red-200">{computedHash}</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
