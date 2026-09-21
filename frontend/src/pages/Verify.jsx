import React from 'react';
import DocumentVerification from '../components/DocumentVerification';

const Verify = () => {
  return (
    <div className="p-10 max-w-4xl mx-auto animate-cipher" style={{animationDelay: '100ms'}}>
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Zero-Trust Evidence Verifier</h1>
        <div className="h-[4px] w-12 bg-blue-600 rounded-full mb-4"></div>
        <p className="text-slate-500 font-medium text-lg">
          Select a local file or paste an evidence hash. We mathematically verify it against immutable database records to prove it hasn't been tampered with.
        </p>
      </div>

      <DocumentVerification />
    </div>
  );
};

export default Verify;
