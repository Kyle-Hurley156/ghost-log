import React, { useState, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import { EXERCISE_DATABASE } from '../constants';

export const ExerciseSearchInput = ({ onAdd }) => {
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filteredExercises = useMemo(() => !exerciseSearch ? [] : EXERCISE_DATABASE.filter(ex => ex.toLowerCase().includes(exerciseSearch.toLowerCase())), [exerciseSearch]);
  return (
    <div className="mt-4 bg-black/30 border border-dashed border-gray-800/50 rounded-xl p-4 relative">
      <p className="text-[10px] text-gray-600 font-bold uppercase mb-2 tracking-wider">Add Exercise</p>
      <div className="flex gap-2">
        <input type="text" placeholder="Search Exercise..." className="flex-1 bg-gray-900/80 text-white p-3 rounded-xl text-sm border border-gray-800/50 outline-none focus:accent-border transition-colors" value={exerciseSearch} onChange={e => { setExerciseSearch(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} onKeyDown={e => { if(e.key==='Enter'){ onAdd(e.target.value); setExerciseSearch(''); } }} />
        <button className="bg-gray-900/80 p-3 rounded-xl text-gray-600 border border-gray-800/50"><BookOpen size={18}/></button>
      </div>
      {showSuggestions && (exerciseSearch || filteredExercises.length > 0) && (
        <div className="absolute left-0 right-0 mt-2 bg-gray-900 border border-gray-800/50 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto mx-4">
          {filteredExercises.length > 0 ? filteredExercises.map((n, i) => <div key={i} className="p-3 hover:accent-bg-dim text-sm text-gray-300 border-b border-gray-800/50 last:border-0 cursor-pointer transition-colors" onClick={() => { onAdd(n); setExerciseSearch(''); }}>{n}</div>) : <div className="p-3 text-sm text-gray-400 hover:accent-bg-dim cursor-pointer transition-colors" onClick={() => { onAdd(exerciseSearch); setExerciseSearch(''); }}>+ Create "{exerciseSearch}"</div>}
        </div>
      )}
    </div>
  );
};
