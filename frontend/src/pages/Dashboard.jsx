import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { db, supabase } from '../services/supabase';
import { verifyDocumentHash } from '../services/blockchain';
import { RefreshCw, Search, FileText, X, Loader, Eye, ShieldCheck } from 'lucide-react';
import ViewEvidenceModal from '../components/ViewEvidenceModal';

const Dashboard = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';
  const [selectedDocId, setSelectedDocId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await db.fetchCases();
      console.log("Fetched cases:", data);
      setCases(data);
    } catch (error) {
      console.error("Failed to fetch cases:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleViewDocument = (fileName) => {
    setSelectedDocId(fileName);
    setIsModalOpen(true);
  };

  const filteredCases = cases.filter(c => 
    c.case_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.file_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleVerifyBlockchain = async (docHash) => {
    if (!docHash) {
      alert("No document hash available for verification.");
      return;
    }
    try {
      const result = await verifyDocumentHash(docHash);
      if (result.exists) {
        alert(`✅ Document verified on blockchain!\n\nUploader: ${result.uploader}\nTimestamp: ${new Date(result.timestamp).toLocaleString()}`);
      } else {
        alert("❌ Document not found on the blockchain.");
      }
    } catch (error) {
      console.error("Verification error:", error);
      alert("Verification failed. Make sure MetaMask is connected.\n" + (error.reason || error.message));
    }
  };

  return (
    <div className="p-4 sm:p-8 animate-cipher" style={{animationDelay: '100ms'}}>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Dashboard</h1>
          <div className="h-[4px] w-12 bg-blue-600 rounded-full"></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by case number or filename..."
            value={searchTerm}
            onChange={(e) => setSearchParams(e.target.value ? { q: e.target.value } : {})}
            className="w-full pl-10 pr-4 py-3 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-base sm:text-sm"
          />
        </div>
        <button
          onClick={fetchCases}
          disabled={loading}
          className="flex items-center justify-center w-full sm:w-auto space-x-2 px-4 py-3 sm:py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 font-semibold"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
              <th className="p-4 font-semibold">Case Number</th>
              <th className="p-4 font-semibold">File Name</th>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Tx Hash</th>
              <th className="p-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500">Loading cases...</td>
              </tr>
            ) : filteredCases.length > 0 ? (
              filteredCases.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-900">{c.case_number}</td>
                  <td className="p-4 flex items-center space-x-2 text-slate-700">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span>{c.file_name}</span>
                  </td>
                  <td className="p-4 text-slate-600">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-slate-500 font-mono text-xs truncate max-w-[150px]" title={c.blockchain_tx_hash}>
                    {c.blockchain_tx_hash}
                  </td>
                  <td className="p-4 text-right flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                    {/* <button
                      onClick={() => handleVerifyBlockchain(c.document_hash)}
                      className="inline-flex items-center justify-center space-x-1 text-sm text-emerald-600 hover:text-emerald-800 transition-colors font-medium bg-emerald-50 px-3 py-3 sm:py-1.5 rounded-lg hover:bg-emerald-100 min-h-[44px] sm:min-h-0"
                      title="Verify on Blockchain"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Verify</span>
                    </button> */}
                    <button
                      onClick={() => handleViewDocument(c.file_name)}
                      className="inline-flex items-center justify-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium bg-blue-50 px-3 py-3 sm:py-1.5 rounded-lg hover:bg-blue-100 min-h-[44px] sm:min-h-0"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500">No cases found.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Document Viewer Modal */}
      <ViewEvidenceModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDocId('');
        }}
        documentId={selectedDocId}
      />
    </div>
  );
};

export default Dashboard;
