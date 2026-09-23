import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Wallet, AlertCircle, CheckCircle } from 'lucide-react';
import { auth } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import ncrbLogo from '../assets/ncrb-logo.png';
import sihLogo from '../assets/sih-logo.png';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Judge');
  const [fullName, setFullName] = useState('');
  
  // Status State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isResettingPassword) {
        await auth.resetPassword(email);
        setSuccess('Password reset link sent! Check your email.');
      } else if (isLogin) {
        await auth.signIn(email, password);
      } else {
        await auth.signUp(email, password, role, fullName);
      }
    } catch (err) {
      let errorMessage = err.message || 'An error occurred.';
      if (!isResettingPassword && isLogin && errorMessage.includes('Invalid login credentials')) {
        errorMessage = "Account not found or incorrect password. If this is your first time, please sign up.";
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetMode = () => {
    setIsResettingPassword(false);
    setIsLogin(true);
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex items-center justify-center p-6 grid-bg">
      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-xl flex flex-col md:flex-row relative overflow-hidden">
        
        {/* Left Side - Branding */}
        <div className="md:w-5/12 p-6 md:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 bg-slate-100/50 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-6 mb-12 animate-cipher" style={{animationDelay: '100ms'}}>
              <img src={ncrbLogo} alt="NCRB" className="h-28 w-auto drop-shadow-sm" />
              <img src={sihLogo} alt="SIH" className="h-28 w-auto drop-shadow-sm" />
            </div>
            
            <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4 animate-cipher" style={{animationDelay: '200ms'}}>
              Secure <br />
              <span className="text-blue-600 font-bold">Document</span> <br />
              System
            </h1>
            <div className="h-[4px] w-16 bg-blue-600 rounded-full mb-6 animate-cipher" style={{animationDelay: '300ms'}}></div>
            <p className="text-sm font-semibold text-slate-500 leading-relaxed animate-cipher" style={{animationDelay: '400ms'}}>
              Secure Area<br />
              <span className="font-normal text-slate-400">Unauthorized access is prohibited under Section 43 of the IT Act, 2000. <br/> Only authorized users can access this system. </span>
            </p>
          </div>

          <div className="mt-12 text-sm font-bold text-slate-500 leading-relaxed animate-cipher relative z-10" style={{animationDelay: '500ms'}}>
            System ID: 0x8F92...B3C1<br/>
            Status: <span className="text-emerald-600 font-black">Online</span>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="md:w-7/12 p-6 sm:p-10 md:p-16 flex flex-col justify-center relative z-10">
          <div className="mb-10 animate-cipher" style={{animationDelay: '300ms'}}>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
              {isResettingPassword ? 'Reset Password' : (isLogin ? 'Log in' : 'Create Account')}
            </h2>
            <p className="text-base font-medium text-slate-500">
              {isResettingPassword 
                ? 'Enter your email to receive a secure recovery link.' 
                : (isLogin ? 'Please enter your details.' : 'Sign up for a new account.')}
            </p>
          </div>

          {/* Alerts */}
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
            {/* Email Field */}
            <div className="animate-cipher" style={{animationDelay: '400ms'}}>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all text-base font-medium placeholder-slate-400 shadow-sm"
                  placeholder="name@ncrb.gov.in"
                  required
                />
              </div>
            </div>

            {!isResettingPassword && (
              <>
                {/* Password Field */}
                <div className="animate-cipher" style={{animationDelay: '500ms'}}>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
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

                {/* Full Name & Clearance Level (Signup only) */}
                {!isLogin && (
                  <>
                    <div className="animate-cipher" style={{animationDelay: '550ms'}}>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                      <div className="relative group">
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="block w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all text-base font-medium placeholder-slate-400 shadow-sm"
                          placeholder="e.g. Rahul Sharma"
                          required={!isLogin}
                        />
                      </div>
                    </div>

                    <div className="animate-cipher" style={{animationDelay: '600ms'}}>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Select Role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="block w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all appearance-none text-base font-medium shadow-sm"
                      >
                        <option value="Constable">Constable</option>
                        <option value="Lead IO">Lead IO</option>
                        <option value="Public Prosecutor">Public Prosecutor</option>
                        <option value="Judge">Judge</option>
                      </select>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Forgot Password Link */}
            {isLogin && !isResettingPassword && (
              <div className="flex justify-end animate-cipher" style={{animationDelay: '650ms'}}>
                <button
                  type="button"
                  onClick={() => setIsResettingPassword(true)}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors focus:outline-none"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-slate-900 text-white rounded-xl py-3.5 font-bold hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 text-base shadow-lg animate-cipher ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              style={{animationDelay: '700ms'}}
            >
              {isLoading ? 'Processing...' : (isResettingPassword ? 'Send Reset Link' : (isLogin ? 'Log in' : 'Create Account'))}
            </button>
          </form>

          {/* Extra Buttons */}
          {!isResettingPassword ? (
            <>
              <button
                type="button"
                className="mt-6 w-full flex items-center justify-center space-x-3 border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 rounded-xl py-3.5 font-bold transition-all focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 text-sm shadow-sm animate-cipher"
                style={{animationDelay: '800ms'}}
              >
                <Wallet className="h-5 w-5 text-blue-600" strokeWidth={2.5} />
                <span>Connect MetaMask Wallet</span>
              </button>

              <div className="mt-12 text-center text-sm font-bold text-slate-500 animate-cipher" style={{animationDelay: '900ms'}}>
                <span>{isLogin ? "Don't have an account? " : "Already have an account? "}</span>
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setSuccess('');
                  }}
                  className="hover:text-blue-600 transition-colors focus:outline-none underline decoration-slate-300 underline-offset-4"
                >
                  {isLogin ? 'Sign up' : 'Log in'}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-12 text-center text-sm font-bold text-slate-500 animate-cipher" style={{animationDelay: '800ms'}}>
              <button
                onClick={resetMode}
                className="hover:text-blue-600 transition-colors focus:outline-none underline decoration-slate-300 underline-offset-4"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
