import React, { useState, useMemo } from 'react';
import { X, Search, HeartPulse } from 'lucide-react';
import { CARDIO_DATABASE } from '../constants';

export const CardioModal = ({ isOpen, onClose, onSave }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filteredCardio = useMemo(() => !searchTerm ? CARDIO_DATABASE : CARDIO_DATABASE.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase())), [searchTerm]);

  if (!isOpen) return null;
  const handleSelect = (type) => { setSelectedType(type); setSearchTerm(type); setShowSuggestions(false); };
  const handleSave = () => { if (!duration || !calories || !selectedType) return; onSave({ type: 'Cardio', name: selectedType, duration: parseFloat(duration), calories: parseFloat(calories) }); setDuration(''); setCalories(''); setSearchTerm(''); setSelectedType(''); onClose(); };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-gray-900 w-full max-w-xs rounded-2xl p-6 border border-gray-800/50 shadow-2xl">
        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black tracking-tight text-white uppercase flex items-center gap-2"><HeartPulse className="text-red-500" size={22}/> CARDIO</h3><button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800 transition-colors"><X size={22} className="text-gray-500"/></button></div>
        <div className="space-y-4">
          <div className="relative"><label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block tracking-wider">Activity</label><div className="flex items-center gap-2 bg-black/50 p-3 rounded-xl border border-gray-800/50"><Search size={16} className="text-gray-600"/><input type="text" placeholder="Search (e.g. Running)" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); setSelectedType(e.target.value); }} onFocus={() => setShowSuggestions(true)} className="bg-transparent text-white text-sm w-full outline-none"/></div>
          {showSuggestions && (<div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-800/50 rounded-xl max-h-40 overflow-y-auto z-20 shadow-xl">{filteredCardio.map((c, i) => <div key={i} onClick={() => handleSelect(c)} className="p-3 text-sm text-white hover:accent-bg-dim cursor-pointer border-b border-gray-800/50 last:border-0 transition-colors">{c}</div>)}
           {filteredCardio.length === 0 && <div onClick={() => handleSelect(searchTerm)} className="p-3 text-sm accent-text hover:accent-bg-dim cursor-pointer">Use: "{searchTerm}"</div>}</div>)}</div>
          <div className="flex gap-3"><div className="flex-1"><label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block tracking-wider">Time (min)</label><input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full bg-black/50 p-3 rounded-xl text-white font-bold text-center border border-gray-800/50 outline-none"/></div><div className="flex-1"><label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block tracking-wider">Calories</label><input type="number" value={calories} onChange={e => setCalories(e.target.value)} className="w-full bg-black/50 p-3 rounded-xl text-white font-bold text-center border border-gray-800/50 outline-none"/></div></div>
        </div>
        <button onClick={handleSave} className="w-full mt-6 accent-bg hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98]">LOG SESSION</button>
      </div>
    </div>
  );
};
