import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Search, Bell, Menu } from 'lucide-react';

const TopBar = ({ setSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlQuery = location.pathname === '/dashboard' ? (searchParams.get('q') || '') : '';
  const [query, setQuery] = useState(urlQuery);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (query.trim()) {
        navigate(`/dashboard?q=${encodeURIComponent(query.trim())}`);
      } else {
        navigate(`/dashboard`);
      }
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 font-sans shadow-sm">
      
      {/* Center/Left - Search */}
      <div className="w-full max-w-xl flex-1 mr-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
            <Search className="h-4 w-4 font-bold" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="block w-full pl-10 pr-3 py-3 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all shadow-inner text-base sm:text-sm"
            placeholder="Search documents or cases (Press Enter)..."
          />
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center justify-end space-x-2 md:space-x-6 flex-none">
        {/* Notification Bell */}
        {/* <button className="relative text-slate-500 hover:text-blue-600 transition-colors focus:outline-none p-2">
          <Bell className="h-5 w-5" strokeWidth={2.5} />
          <span className="absolute top-1 right-1 block h-2 w-2 bg-red-500 rounded-full border border-white"></span>
        </button> */}

        {/* Mobile Menu Toggle (Moved to Right) */}
        <button 
          onClick={() => setSidebarOpen(true)}
          className="md:hidden p-2 text-slate-500 hover:text-blue-600 focus:outline-none"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
