import React, { useState, useEffect, useRef } from 'react';
import { Edit3 } from 'lucide-react';

export const PromptModal = ({ isOpen, message, defaultValue, onSubmit, onCancel }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue || '');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (value.trim()) onSubmit(value.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-gray-900 w-full max-w-xs rounded-2xl p-6 border border-gray-800/50 shadow-2xl">
        <Edit3 size={32} className="accent-text mx-auto mb-4"/>
        <p className="text-sm text-gray-400 text-center mb-4">{message}</p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="w-full bg-black/50 p-3 rounded-xl text-white text-sm border border-gray-800/50 outline-none focus:accent-border mb-4"
          placeholder="Enter name..."
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-bold text-sm transition-all active:scale-95">Cancel</button>
          <button onClick={handleSubmit} disabled={!value.trim()} className="flex-1 accent-bg text-white py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-30">OK</button>
        </div>
      </div>
    </div>
  );
};
