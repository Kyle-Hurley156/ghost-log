import React, { useEffect } from 'react';
import { Info } from 'lucide-react';

export const Toast = ({ message, onClose }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-2xl border border-gray-700 z-[70] animate-in fade-in slide-in-from-bottom-4 flex items-center gap-3 pointer-events-none whitespace-nowrap">
      <Info size={18} className="text-blue-400"/><span className="text-sm font-medium">{message}</span>
    </div>
  );
};
