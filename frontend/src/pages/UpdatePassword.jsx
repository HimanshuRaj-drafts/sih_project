import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { auth } from '../services/supabase';
import ncrbLogo from '../assets/ncrb-logo.png';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await auth.updatePassword(password);
      setSuccess('Password updated successfully! Redirecting...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex items-center justify-center p-6 grid-bg">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-10 relative overflow-hidden">
        <div className="flex justify-center mb-8 animate-cipher" style={{animationDelay: '100ms'}}>
          <img src={ncrbLogo} alt="NCRB" className="h-16 w-auto drop-shadow-sm" />
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2 text-center animate-cipher" style={{animationDelay: '200ms'}}>
          Set New Password
        </h2>
        <p className="text-sm font-medium text-slate-500 text-center mb-8 animate-cipher" style={{animationDelay: '300ms'}}>
          Please enter your new cryptographic passphrase.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 text-red-700 animate-cipher" style={{animationDelay: '350ms'}}>
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start space-x-3 text-emerald-700 animate-cipher" style={{animationDelay: '350ms'}}>
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="animate-cipher" style={{animationDelay: '400ms'}}>
            <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl py-3 px-4 pr-12 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all text-base font-medium placeholder-slate-400 shadow-sm"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" strokeWidth={2.5} /> : <Eye className="h-5 w-5" strokeWidth={2.5} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || success}
            className={`w-full bg-slate-900 text-white rounded-xl py-3.5 font-bold hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 text-base shadow-lg animate-cipher ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            style={{animationDelay: '500ms'}}
          >
            {isLoading ? 'Updating...' : 'Save Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePassword;
