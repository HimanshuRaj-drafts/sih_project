import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { ShieldCheck, ShieldAlert, FileText, UploadCloud, Calendar, Tag } from 'lucide-react';

const Verify = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, hashing, querying, success, error
  const [matchData, setMatchData] = useState(null);

  const computeHash = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setMatchData(null);
      
      try {
        setStatus('hashing');
        const hash = await computeHash(selectedFile);
        console.log("Computed SHA-256:", hash);
        
        setStatus('querying');
        const { data, error } = await supabase
          .from('cases')
          .select('*')
          .eq('document_hash', hash)
          .single();
          
        if (error) {
          throw error;
        }
        
        if (data) {
          setMatchData(data);
          setStatus('success');
        } else {
          throw new Error('Not found');
        }
        
      } catch (err) {
        console.error("Verification failed:", err);
        setStatus('error');
      }
    }
  };

  return (
    <div className="p-10 max-w-4xl mx-auto animate-cipher" style={{animationDelay: '100ms'}}>
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Zero-Trust Evidence Verifier</h1>
        <div className="h-[4px] w-12 bg-blue-600 rounded-full mb-4"></div>
        <p className="text-slate-500 font-medium text-lg">Select a local file. We will hash it locally in your browser and mathematically verify it against the immutable database records to prove it hasn't been tampered with.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 mb-8 shadow-sm">
        <label className="block text-sm font-bold text-slate-700 mb-4">Upload Document for Verification</label>
        <input 
          type="file" 
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer border border-slate-200 rounded-xl"
        />
        {(status === 'hashing' || status === 'querying') && (
          <div className="mt-6 flex items-center space-x-3 text-blue-600">
            <UploadCloud className="h-5 w-5 animate-pulse" />
            <span className="font-semibold text-sm">Calculating cryptographic hash...</span>
          </div>
        )}
      </div>

      {status === 'success' && matchData && (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm animate-cipher" style={{animationDelay: '200ms'}}>
          <div className="flex items-center space-x-3 mb-4">
            <ShieldCheck className="h-8 w-8 text-emerald-600" />
            <h2 className="text-2xl font-black text-emerald-800 tracking-tight">Authentic Document</h2>
          </div>
          <p className="text-emerald-800 font-medium leading-relaxed">
            Cryptographic Hash Match: This file is verified to be the exact, untampered evidence for Case No: <strong className="font-bold">{matchData.case_number}</strong>. Uploaded on: <strong className="font-bold">{new Date(matchData.created_at).toLocaleString()}</strong>.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl shadow-sm flex items-start space-x-4 animate-cipher" style={{animationDelay: '200ms'}}>
          <ShieldAlert className="h-8 w-8 flex-shrink-0 text-red-600" />
          <div>
            <h2 className="text-2xl font-black text-red-800 tracking-tight mb-2">Tampering Detected or Not Found</h2>
            <p className="text-red-700 font-medium">This file's hash does not exist in the NCRB ledger. It may have been forged or altered.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Verify;
