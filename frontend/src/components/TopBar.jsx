import React from 'react';
import { Search, Bell } from 'lucide-react';

const TopBar = () => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30 font-sans shadow-sm">
      {/* Left empty for centering */}
      <div className="flex-1"></div>

      {/* Center - Search */}
      <div className="w-full max-w-xl flex-none mx-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
            <Search className="h-4 w-4 font-bold" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all shadow-inner text-sm"
            placeholder="Search documents or cases..."
          />
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex-1 flex items-center justify-end space-x-6">
        {/* Notification Bell */}
        <button className="relative text-slate-500 hover:text-blue-600 transition-colors focus:outline-none">
          <Bell className="h-5 w-5" strokeWidth={2.5} />
          <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      </div>
    </header>
  );
};

export default TopBar;
