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
      <div className="bg-gray-800 w-full max-w-xs rounded-2xl p-6 border border-gray-700 shadow-2xl">
        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black italic text-white uppercase flex items-center gap-2"><HeartPulse className="text-red-500"/> CARDIO</h3><button onClick={onClose}><X size={24} className="text-gray-500"/></button></div>
        <div className="space-y-4">
          <div className="relative"><label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Activity</label><div className="flex items-center gap-2 bg-gray-900 p-3 rounded-lg border border-gray-600"><Search size={16} className="text-gray-500"/><input type="text" placeholder="Search (e.g. Running)" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); setSelectedType(e.target.value); }} onFocus={() => setShowSuggestions(true)} className="bg-transparent text-white text-sm w-full outline-none"/></div>
          {showSuggestions && (<div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg max-h-40 overflow-y-auto z-20 shadow-xl">{filteredCardio.map((c, i) => <div key={i} onClick={() => handleSelect(c)} className="p-3 text-sm text-white hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0">{c}</div>)}
           {filteredCardio.length === 0 && <div onClick={() => handleSelect(searchTerm)} className="p-3 text-sm text-blue-400 hover:bg-gray-700 cursor-pointer italic">Use custom: "{searchTerm}"</div>}</div>)}</div>
          <div className="flex gap-3"><div className="flex-1"><label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Time (min)</label><input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full bg-gray-900 p-3 rounded-lg text-white font-bold text-center border border-gray-600 outline-none"/></div><div className="flex-1"><label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Calories</label><input type="number" value={calories} onChange={e => setCalories(e.target.value)} className="w-full bg-gray-900 p-3 rounded-lg text-white font-bold text-center border border-gray-600 outline-none"/></div></div>
        </div>
        <button onClick={handleSave} className="w-full mt-6 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl">LOG SESSION</button>
      </div>
    </div>
  );
};
