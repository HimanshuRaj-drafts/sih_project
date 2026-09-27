import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { db, supabase } from '../services/supabase';
import { verifyDocumentHash } from '../services/blockchain';
import { RefreshCw, Search, FileText, X, Loader, Eye, ShieldCheck, Info, User } from 'lucide-react';
import ViewEvidenceModal from '../components/ViewEvidenceModal';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';
  const [selectedDocId, setSelectedDocId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoData, setInfoData] = useState(null);
  const { user } = useAuth();

  const maskEmail = (email) => {
    if (!email) return 'usr*********@ncrb.gov.in';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    const maskedName = name.substring(0, 3) + '*********';
    return `${maskedName}@${domain}`;
  };

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

  const handleInfoClick = (c) => {
    setInfoData(c);
    setInfoModalOpen(true);
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
                      onClick={() => handleInfoClick(c)}
                      className="inline-flex items-center justify-center space-x-1 text-sm text-slate-600 hover:text-slate-800 transition-colors font-medium bg-slate-100 px-3 py-3 sm:py-1.5 rounded-lg hover:bg-slate-200 min-h-[44px] sm:min-h-0"
                      title="View Info"
                    >
                      <Info className="h-4 w-4" />
                    </button>
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

      {/* Info Modal */}
      {infoModalOpen && infoData && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-cipher relative">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-900">Document Information</h3>
              <button onClick={() => setInfoModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Uploaded Date</label>
                <p className="text-slate-900 font-medium">{new Date(infoData.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Uploaded Time</label>
                <p className="text-slate-900 font-medium">{new Date(infoData.created_at).toLocaleTimeString()}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Uploaded By</label>
                <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-slate-900 font-bold text-sm">
                      {infoData.profiles?.full_name || 'Unknown Officer'} 
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                        {infoData.profiles?.role?.toUpperCase() || 'OFFICER'}
                      </span>
                    </p>
                    <p className="text-slate-500 text-xs font-medium mt-0.5">
                      {infoData.uploader_id === user?.id ? maskEmail(user?.email) : maskEmail(infoData.profiles?.email)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Dashboard;
