import React from 'react';

const CrashGhost = () => (
  <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 8C30 8 18 24 18 42v32c0 4 2 8 6 8s6-4 6-8v-4c0-4 2-8 6-8s6 4 6 8v4c0 4 2 8 6 8s6-4 6-8v-4c0-4 2-8 6-8s6 4 6 8v4c0 4 2 8 6 8s6-4 6-8V42C82 24 70 8 50 8z" fill="#ef4444" opacity="0.8"/>
    <line x1="33" y1="33" x2="43" y2="43" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    <line x1="43" y1="33" x2="33" y2="43" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    <line x1="57" y1="33" x2="67" y2="43" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    <line x1="67" y1="33" x2="57" y2="43" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    <ellipse cx="50" cy="55" rx="5" ry="4" fill="white" opacity="0.6"/>
  </svg>
);

export class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("GhostLog Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center">
          <CrashGhost />
          <h1 className="text-xl font-black text-red-400 mt-4 mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">Ghost encountered an error. You can try reloading, or reset app data if the issue persists.</p>
          <div className="flex gap-3">
            <button onClick={() => window.location.reload()} className="bg-gray-800 text-white px-5 py-3 rounded-xl font-bold text-sm border border-gray-700 active:scale-95 transition-all">RELOAD</button>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-red-500/10 text-red-400 px-5 py-3 rounded-xl font-bold text-sm border border-red-500/20 active:scale-95 transition-all">RESET DATA</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
