import React, { useEffect } from 'react';

export const Toast = ({ message, onClose }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-gray-800/50 z-[70] animate-in fade-in slide-in-from-bottom-4 flex items-center gap-2 pointer-events-none whitespace-nowrap">
      <div className="w-1.5 h-1.5 rounded-full accent-bg shrink-0"/><span className="text-sm font-medium">{message}</span>
    </div>
  );
};
