import React, { useState } from 'react';
import { X, LogOut, Shield, FileText, Info, ExternalLink, Trash2, Cloud, CloudOff, Eye, EyeOff, Loader2 } from 'lucide-react';
import { APP_VERSION } from '../constants';

export const SettingsPanel = ({ show, onClose, onLogout, userEmail, requestConfirm, onAuth, onForgotPassword, authLoading, authError }) => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
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
                <div className="flex justify-between items-center mt-2">
                  <button onClick={() => setIsSignUp(!isSignUp)} className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors">
                    {isSignUp ? 'Have an account? Log in' : 'Sign up'}
                  </button>
                  {!isSignUp && (
                    <button onClick={async () => {
                      if (loginEmail && onForgotPassword) {
                        const ok = await onForgotPassword(loginEmail);
                        if (ok) setStatusMsg('Reset email sent!');
                      }
                    }} disabled={!loginEmail} className="text-[11px] accent-text hover:opacity-80 transition-colors disabled:opacity-30">
                      Forgot password?
                    </button>
                  )}
                </div>
                {statusMsg && <p className="text-green-400 text-xs px-1 mt-2">{statusMsg}</p>}
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
