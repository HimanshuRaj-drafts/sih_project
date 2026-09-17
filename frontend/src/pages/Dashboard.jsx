import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db, supabase } from '../services/supabase';
import { RefreshCw, Search, FileText, X, Loader, Eye } from 'lucide-react';

const Dashboard = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocUrl, setSelectedDocUrl] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDocLoading, setIsDocLoading] = useState(false);

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

  const handleViewDocument = async (fileName) => {
    setIsModalOpen(true);
    setIsDocLoading(true);
    setSelectedDocUrl('');

    try {
      const { data, error } = await supabase.storage
        .from('ncrb-vault')
        .createSignedUrl('evidence/' + fileName, 60);

      if (error) {
        console.error("Error generating signed URL:", error);
        return;
      }
      
      if (data?.signedUrl) {
        setSelectedDocUrl(data.signedUrl);
      }
    } catch (error) {
      console.error("Error in handleViewDocument:", error);
    } finally {
      setIsDocLoading(false);
    }
  };

  const filteredCases = cases.filter(c => 
    c.case_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.file_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 animate-cipher" style={{animationDelay: '100ms'}}>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Dashboard</h1>
          <div className="h-[4px] w-12 bg-blue-600 rounded-full"></div>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by case number or filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <button
          onClick={fetchCases}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 font-semibold"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
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
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleViewDocument(c.file_name)}
                      className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
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

      {/* Document Viewer Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col transition-opacity animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-900 shadow-sm backdrop-blur-md">
            <h3 className="font-semibold text-slate-200 flex items-center gap-3 text-lg tracking-tight">
              <FileText className="h-5 w-5 text-blue-500" />
              Secure Document Viewer
            </h3>
            <button
              onClick={() => {
                setIsModalOpen(false);
                setSelectedDocUrl('');
              }}
              className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 p-2 rounded-full shadow-sm"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Body */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden bg-slate-950">
            {isDocLoading ? (
              <div className="flex flex-col items-center gap-4 text-slate-400">
                <Loader className="h-10 w-10 animate-spin text-blue-500" />
                <p className="font-medium animate-pulse tracking-wide">Decrypting and loading secure document...</p>
              </div>
            ) : selectedDocUrl ? (
              <div className="w-full h-full bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-800">
                <iframe 
                  src={selectedDocUrl} 
                  className="w-full flex-1 bg-white border-0" 
                  title="Document Viewer"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <div className="h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center mb-2">
                  <X className="h-8 w-8 text-red-500" />
                </div>
                <p className="font-medium text-slate-300 text-lg">Failed to load document.</p>
                <p className="text-sm">The document might be unavailable or you lack permissions.</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Dashboard;
