import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { EXERCISE_DATABASE } from '../constants';

export const ExerciseSearchInput = ({ onAdd, customExercises = [], onCreateExercise }) => {
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const allExercises = useMemo(() => {
    const combined = [...EXERCISE_DATABASE, ...customExercises];
    return [...new Set(combined)].sort();
  }, [customExercises]);

  const filteredExercises = useMemo(() => {
    if (!exerciseSearch) return [];
    const q = exerciseSearch.toLowerCase();
    return allExercises.filter(ex => ex.toLowerCase().includes(q));
  }, [exerciseSearch, allExercises]);

  const isCustom = exerciseSearch && !allExercises.some(ex => ex.toLowerCase() === exerciseSearch.toLowerCase());

  const handleAdd = (name) => {
    onAdd(name);
    setExerciseSearch('');
    setShowSuggestions(false);
  };

  const handleCreate = () => {
    if (onCreateExercise) onCreateExercise(exerciseSearch);
    handleAdd(exerciseSearch);
  };

  return (
    <div className="mt-4 bg-black/30 border border-dashed border-gray-800/50 rounded-xl p-4 relative">
      <p className="text-[10px] text-gray-600 font-bold uppercase mb-2 tracking-wider">Add Exercise</p>
      <input type="text" placeholder="Search or create exercise..." className="w-full bg-gray-900/80 text-white p-3 rounded-xl text-sm border border-gray-800/50 outline-none focus:accent-border transition-colors" value={exerciseSearch} onChange={e => { setExerciseSearch(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} onKeyDown={e => { if(e.key==='Enter' && exerciseSearch){ if (isCustom) handleCreate(); else handleAdd(exerciseSearch); } }} />
      {showSuggestions && exerciseSearch && (
        <div className="absolute left-0 right-0 mt-2 bg-gray-900 border border-gray-800/50 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto mx-4">
          {filteredExercises.map((n, i) => (
            <div key={i} className="p-3 hover:accent-bg-dim text-sm text-gray-300 border-b border-gray-800/50 last:border-0 cursor-pointer transition-colors" onClick={() => handleAdd(n)}>
              {n}
              {customExercises.includes(n) && <span className="text-[9px] text-gray-600 ml-2">CUSTOM</span>}
            </div>
          ))}
          {isCustom && (
            <div className="p-3 text-sm accent-text hover:accent-bg-dim cursor-pointer transition-colors flex items-center gap-2 border-t border-gray-800/50" onClick={handleCreate}>
              <Plus size={14}/> Create "{exerciseSearch}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};
