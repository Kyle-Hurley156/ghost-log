import React, { useState } from 'react';
import { Loader2, Mail, Lock, Eye, EyeOff, Wand2, Check } from 'lucide-react';

const GhostLogo = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 8C30 8 18 24 18 42v32c0 4 2 8 6 8s6-4 6-8v-4c0-4 2-8 6-8s6 4 6 8v4c0 4 2 8 6 8s6-4 6-8v-4c0-4 2-8 6-8s6 4 6 8v4c0 4 2 8 6 8s6-4 6-8V42C82 24 70 8 50 8z" fill="white"/>
    <circle cx="38" cy="38" r="5" fill="black"/>
    <circle cx="62" cy="38" r="5" fill="black"/>
    <ellipse cx="50" cy="52" rx="4" ry="3" fill="black"/>
  </svg>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export const AuthScreen = ({ onAuth, onGoogle, onMagicLink, loading, error, isNative }) => {
  const [mode, setMode] = useState('login'); // login, signup, magic
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'magic') {
      if (!email) return;
      onMagicLink(email).then(success => { if (success) setMagicLinkSent(true); });
    } else {
      if (!email || !password) return;
      onAuth(email, password, mode === 'signup');
    }
  };

  return (
    <div className="bg-black min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <GhostLogo size={64} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            GHOST<span className="text-gray-500">LOG</span>
          </h1>
          <p className="text-gray-600 text-xs mt-2 uppercase tracking-widest">
            {mode === 'signup' ? 'Create Account' : mode === 'magic' ? 'Magic Link' : 'Welcome Back'}
          </p>
        </div>

        {/* Google Sign In — only works on web (signInWithPopup doesn't work in WKWebView) */}
        {!isNative && (
          <>
            <button
              onClick={onGoogle}
              disabled={loading}
              className="w-full bg-white text-gray-800 font-bold py-3 rounded-xl flex items-center justify-center gap-3 mb-4 active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
            >
              <GoogleIcon /> Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-800"></div>
              <span className="text-gray-600 text-[10px] uppercase tracking-widest font-bold">or</span>
              <div className="flex-1 h-px bg-gray-800"></div>
            </div>
          </>
        )}

        {/* Magic link sent confirmation */}
        {magicLinkSent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 accent-bg-dim rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="accent-text"/>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Check your email</h3>
            <p className="text-gray-400 text-sm mb-1">We sent a sign-in link to</p>
            <p className="text-white font-bold text-sm mb-6">{email}</p>
            <button onClick={() => setMagicLinkSent(false)} className="text-gray-500 text-xs hover:text-white transition-colors">
              Try a different method
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3.5 text-gray-600" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full bg-gray-900/80 p-3 pl-10 rounded-xl text-white border border-gray-800/50 outline-none focus:accent-border transition-colors text-sm"
                />
              </div>

              {mode !== 'magic' && (
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3.5 text-gray-600" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="w-full bg-gray-900/80 p-3 pl-10 pr-10 rounded-xl text-white border border-gray-800/50 outline-none focus:accent-border transition-colors text-sm"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              )}

              {error && (
                <p className="text-red-400 text-xs text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email || (mode !== 'magic' && !password)}
                className="w-full accent-bg text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {mode === 'signup' ? 'SIGN UP' : mode === 'magic' ? 'SEND MAGIC LINK' : 'LOG IN'}
              </button>
            </form>

            {/* Mode switchers */}
            <div className="mt-5 space-y-2 text-center">
              {mode !== 'magic' && (
                <button
                  onClick={() => setMode('magic')}
                  className="text-gray-500 text-xs hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto"
                >
                  <Wand2 size={12}/> Sign in with magic link (no password)
                </button>
              )}
              {mode === 'magic' && (
                <button
                  onClick={() => setMode('login')}
                  className="text-gray-500 text-xs hover:text-white transition-colors"
                >
                  Sign in with password instead
                </button>
              )}
              <button
                onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                className="text-gray-500 text-xs hover:text-white transition-colors block mx-auto"
              >
                {mode === 'signup' ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </>
        )}

        <p className="text-gray-700 text-[10px] text-center mt-6 uppercase tracking-widest">
          Your data syncs across all devices
        </p>
      </div>
    </div>
  );
};
