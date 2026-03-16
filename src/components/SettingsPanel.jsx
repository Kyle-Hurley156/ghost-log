import React, { useState } from 'react';
import { X, LogOut, Shield, FileText, Info, ExternalLink, Trash2, Mail, Cloud, CloudOff, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { APP_VERSION } from '../constants';

export const SettingsPanel = ({ show, onClose, onLogout, userEmail, requestConfirm, onGoogle, onAuth, authLoading, authError }) => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const isSignedIn = !!userEmail;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loginEmail && loginPassword && onAuth) {
      onAuth(loginEmail, loginPassword, isSignUp);
    }
  };

  return (
    <div className={`fixed inset-y-0 left-0 w-80 bg-gray-950 border-r border-gray-800/50 shadow-2xl z-[100] transform transition-transform duration-300 ${show ? 'translate-x-0' : '-translate-x-full'}`}>
      {show && <div className="absolute inset-0 left-full w-screen bg-black/60" onClick={onClose}></div>}
      <div className="p-5 h-full flex flex-col relative z-10 bg-gray-950 overflow-y-auto">
        <div className="flex justify-between items-center mb-6 pt-10">
          <h2 className="text-xl font-black tracking-tight text-white">Settings</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800 transition-colors">
            <X size={24} className="text-gray-500"/>
          </button>
        </div>

        {/* Account */}
        <div className="mb-6">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-3">Account</p>
          {isSignedIn ? (
            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 accent-bg-dim rounded-full flex items-center justify-center">
                  <Cloud size={18} className="accent-text"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">{userEmail}</p>
                  <p className="text-[10px] accent-text">Synced to cloud</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                    <CloudOff size={18} className="text-gray-500"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold">Not signed in</p>
                    <p className="text-[10px] text-gray-500">Sign in to sync across devices</p>
                  </div>
                </div>

                {/* Google sign-in button */}
                <button onClick={onGoogle} disabled={authLoading} className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 font-bold text-sm py-3 rounded-xl mb-2 active:scale-[0.98] transition-all disabled:opacity-50">
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  {authLoading ? <Loader2 size={16} className="animate-spin"/> : 'Continue with Google'}
                </button>

                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-gray-800"></div>
                  <span className="text-[10px] text-gray-600 font-bold">OR</span>
                  <div className="flex-1 h-px bg-gray-800"></div>
                </div>

                {/* Email/password form */}
                <form onSubmit={handleSubmit} className="space-y-2">
                  <input type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full bg-gray-800 text-white text-sm px-3 py-2.5 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500"/>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-gray-800 text-white text-sm px-3 py-2.5 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500 pr-10"/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500">
                      {showPassword ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </div>
                  <button type="submit" disabled={!loginEmail || !loginPassword || authLoading} className="w-full accent-bg text-white font-bold text-sm py-2.5 rounded-lg disabled:opacity-30 active:scale-[0.98] transition-all">
                    {authLoading ? <Loader2 size={16} className="animate-spin mx-auto"/> : isSignUp ? 'SIGN UP' : 'LOG IN'}
                  </button>
                </form>
                <button onClick={() => setIsSignUp(!isSignUp)} className="w-full text-[11px] text-gray-500 mt-2 hover:text-gray-300 transition-colors">
                  {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                </button>
              </div>
              {authError && <p className="text-red-400 text-xs px-1">{authError}</p>}
            </div>
          )}
        </div>

        {/* Links */}
        <div className="mb-6">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-3">Legal</p>
          <div className="space-y-1">
            <a href="https://ghost-log.vercel.app/privacy.html" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-900/50 transition-colors">
              <span className="flex items-center gap-3 text-sm text-gray-300"><Shield size={16} className="text-gray-500"/> Privacy Policy</span>
              <ExternalLink size={14} className="text-gray-700"/>
            </a>
            <a href="https://ghost-log.vercel.app/terms.html" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-900/50 transition-colors">
              <span className="flex items-center gap-3 text-sm text-gray-300"><FileText size={16} className="text-gray-500"/> Terms of Service</span>
              <ExternalLink size={14} className="text-gray-700"/>
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-3">Actions</p>
          <div className="space-y-1">
            <button onClick={() => requestConfirm('Clear all local data? This cannot be undone.', () => { localStorage.clear(); window.location.reload(); })} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-900/50 transition-colors text-sm text-gray-300">
              <Trash2 size={16} className="text-gray-500"/> Clear Local Cache
            </button>
            {isSignedIn && (
              <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/5 transition-colors text-sm text-red-400">
                <LogOut size={16}/> Log Out
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-gray-800/50">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Info size={12}/>
            <p className="text-[10px] uppercase tracking-widest font-bold">GhostLog v{APP_VERSION}</p>
          </div>
          <p className="text-[10px] text-gray-700 text-center mt-1">ghostlogapp@gmail.com</p>
        </div>
      </div>
    </div>
  );
};
