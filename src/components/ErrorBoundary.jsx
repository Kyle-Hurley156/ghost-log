import React from 'react';
import { Ghost } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("GhostLog Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center">
          <Ghost size={48} className="text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-red-500 mb-2">GhostLog Crashed</h1>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold mt-4">RESET APP DATA</button>
        </div>
      );
    }
    return this.props.children;
  }
}
