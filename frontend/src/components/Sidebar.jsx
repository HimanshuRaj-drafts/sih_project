import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileUp, LogOut, Key, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/supabase';
import ncrbLogo from '../assets/ncrb-logo.png';
import sihLogo from '../assets/sih-logo.png';

const Sidebar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ full_name: 'Loading...', role: '...' });
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    if (user) {
      auth.fetchUserProfile(user.id).then(data => {
        if (data) {
          setProfile(data);
        } else {
          setProfile({ full_name: 'Unknown User', role: 'User' });
        }
      }).catch(err => {
        console.error("Error fetching profile:", err);
        setProfile({ full_name: 'Unknown User', role: 'User' });
      });
    }
  }, [user]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Upload Document', path: '/upload', icon: FileUp },
    { name: 'Verify Integrity', path: '/verify', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen shadow-sm font-sans z-40 relative">
      {/* Logos & Branding */}
      <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
        <img src={ncrbLogo} alt="NCRB" className="h-10 w-auto" />
        <img src={sihLogo} alt="SIH" className="h-10 w-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-5 w-5" strokeWidth={2.5} />
              <span>{link.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Profile Section */}
      <div className="relative border-t border-slate-100">
        
        {/* Popover Menu */}
        {showProfileMenu && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg p-2 animate-cipher" style={{animationDelay: '0ms'}}>
            <button 
              onClick={() => navigate('/update-password')}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
            >
              <Key className="h-4 w-4" />
              <span>Change Password</span>
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left mt-1"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        )}

        <button 
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="w-full p-4 flex items-center space-x-3 hover:bg-slate-50 transition-colors focus:outline-none text-left"
        >
          <div className="h-10 w-10 bg-blue-100 border-2 border-blue-200 text-blue-700 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm">
            <User className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-black text-slate-900 truncate">
              {profile.full_name === 'Unknown User' ? user?.email?.split('@')[0] : profile.full_name}
            </p>
            <p className="text-xs font-semibold text-slate-500 truncate">{profile.role}</p>
          </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
