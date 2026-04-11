import React, { useState } from 'react';
import { Loader2, Mail, Lock, Eye, EyeOff, Wand2, Check, KeyRound } from 'lucide-react';

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

export const AuthScreen = ({ onAuth, onGoogle, onMagicLink, onForgotPassword, onResetConfirm, pendingReset, onCancelReset, loading, error }) => {
  const [mode, setMode] = useState('login'); // login, signup, magic, forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicSending, setMagicSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // In-app password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'magic') {
      if (!email || magicSending) return;
      setMagicSending(true);
      onMagicLink(email).then(success => {
        setMagicSending(false);
        if (success) setMagicLinkSent(true);
      });
    } else if (mode === 'forgot') {
      if (!email || magicSending) return;
      setMagicSending(true);
      onForgotPassword(email).then(success => {
        setMagicSending(false);
        if (success) setResetSent(true);
      });
    } else {
      if (!email || !password) return;
      onAuth(email, password, mode === 'signup');
    }
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    if (!pendingReset || !newPassword || newPassword !== confirmPw || resetting) return;
    setResetting(true);
    onResetConfirm(pendingReset.oobCode, pendingReset.email, newPassword).finally(() => setResetting(false));
  };

  // Password strength (0-4)
  const pwStrength = (() => {
    if (!newPassword) return 0;
    let s = 0;
    if (newPassword.length >= 6) s++;
    if (newPassword.length >= 10) s++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) s++;
    if (/[0-9]/.test(newPassword)) s++;
    if (/[^A-Za-z0-9]/.test(newPassword)) s++;
    return Math.min(s, 4);
  })();
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
  const strengthWidths = ['w-1/5', 'w-2/5', 'w-3/5', 'w-4/5', 'w-full'];

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
            {pendingReset ? 'New Password' : mode === 'signup' ? 'Create Account' : mode === 'magic' ? 'Magic Link' : mode === 'forgot' ? 'Reset Password' : 'Welcome Back'}
          </p>
        </div>

        {/* In-app password reset form */}
        {pendingReset ? (
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <KeyRound size={28} className="text-blue-400" />
              </div>
              <p className="text-gray-400 text-sm">Set a new password for</p>
              <p className="text-white font-bold text-sm">{pendingReset.email}</p>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-3">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3.5 text-gray-600" />
                <input
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="New password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-gray-900/80 p-3 pl-10 pr-10 rounded-xl text-white border border-gray-800/50 outline-none focus:accent-border transition-colors text-sm"
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-3.5 text-gray-600">
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength bar */}
              {newPassword && (
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${strengthColors[pwStrength]} ${strengthWidths[pwStrength]}`} />
                </div>
              )}

              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3.5 text-gray-600" />
                <input
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-gray-900/80 p-3 pl-10 rounded-xl text-white border border-gray-800/50 outline-none focus:accent-border transition-colors text-sm"
                />
              </div>

              {confirmPw && newPassword !== confirmPw && (
                <p className="text-red-400 text-xs text-center">Passwords don't match</p>
              )}

              {error && (
                <p className="text-red-400 text-xs text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={resetting || !newPassword || newPassword.length < 6 || newPassword !== confirmPw}
                className="w-full accent-bg text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resetting ? <Loader2 size={18} className="animate-spin" /> : null}
                RESET & SIGN IN
              </button>
            </form>

            <p className="text-gray-600 text-[11px] text-center mt-3">At least 6 characters</p>

            <button
              onClick={onCancelReset}
              className="text-gray-500 text-xs hover:text-white transition-colors block mx-auto mt-4"
            >
              Back to login
            </button>
          </div>
        ) : (
          <>
            {/* Google Sign In */}
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

            {/* Magic link / reset sent confirmation */}
            {(magicLinkSent || resetSent) ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 accent-bg-dim rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="accent-text"/>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Check your email</h3>
                <p className="text-gray-400 text-sm mb-1">{resetSent ? 'We sent a password reset link to' : 'We sent a sign-in link to'}</p>
                <p className="text-white font-bold text-sm mb-4">{email}</p>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3 mb-6">
                  <p className="text-yellow-400 text-xs font-semibold mb-1">Can't find it?</p>
                  <p className="text-yellow-400/80 text-[11px]">Check your <strong>spam/junk folder</strong> — the email may be filtered there.</p>
                </div>
                <button onClick={() => { setMagicLinkSent(false); setResetSent(false); setMode('login'); }} className="text-gray-500 text-xs hover:text-white transition-colors">
                  Back to login
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

                  {mode !== 'magic' && mode !== 'forgot' && (
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
                    disabled={((mode === 'magic' || mode === 'forgot') ? magicSending : loading) || !email || (mode !== 'magic' && mode !== 'forgot' && !password)}
                    className="w-full accent-bg text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {((mode === 'magic' || mode === 'forgot') ? magicSending : loading) ? <Loader2 size={18} className="animate-spin" /> : null}
                    {mode === 'signup' ? 'SIGN UP' : mode === 'magic' ? 'SEND MAGIC LINK' : mode === 'forgot' ? 'SEND RESET LINK' : 'LOG IN'}
                  </button>
                </form>

                {/* Mode switchers */}
                <div className="mt-5 space-y-2 text-center">
                  {mode === 'login' && (
                    <button
                      onClick={() => setMode('forgot')}
                      className="text-gray-500 text-xs hover:text-white transition-colors block mx-auto"
                    >
                      Forgot password?
                    </button>
                  )}
                  {mode !== 'magic' && mode !== 'forgot' && (
                    <button
                      onClick={() => setMode('magic')}
                      className="text-gray-500 text-xs hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto"
                    >
                      <Wand2 size={12}/> Sign in with magic link (no password)
                    </button>
                  )}
                  {(mode === 'magic' || mode === 'forgot') && (
                    <button
                      onClick={() => setMode('login')}
                      className="text-gray-500 text-xs hover:text-white transition-colors"
                    >
                      Back to login
                    </button>
                  )}
                  {mode !== 'forgot' && (
                    <button
                      onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                      className="text-gray-500 text-xs hover:text-white transition-colors block mx-auto"
                    >
                      {mode === 'signup' ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

        <p className="text-gray-700 text-[10px] text-center mt-6 uppercase tracking-widest">
          Your data syncs across all devices
        </p>
      </div>
    </div>
  );
};
