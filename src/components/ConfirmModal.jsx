import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const ConfirmModal = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-gray-800 w-full max-w-xs rounded-2xl p-6 border border-gray-700 shadow-2xl text-center">
        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4"/><h3 className="text-lg font-bold text-white mb-2">Are you sure?</h3><p className="text-sm text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3"><button onClick={onCancel} className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-bold">Cancel</button><button onClick={onConfirm} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold">Yes</button></div>
      </div>
    </div>
  );
};
