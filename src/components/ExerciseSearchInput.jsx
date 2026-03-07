import React, { useState, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import { EXERCISE_DATABASE } from '../constants';

export const ExerciseSearchInput = ({ onAdd }) => {
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filteredExercises = useMemo(() => !exerciseSearch ? [] : EXERCISE_DATABASE.filter(ex => ex.toLowerCase().includes(exerciseSearch.toLowerCase())), [exerciseSearch]);
  return (
    <div className="mt-6 bg-gray-900 border border-dashed border-gray-700 rounded-xl p-4 relative">
      <p className="text-xs text-gray-500 font-bold uppercase mb-2">Add Exercise</p>
      <div className="flex gap-2"><input type="text" placeholder="Search Exercise..." className="flex-1 bg-gray-800 text-white p-3 rounded-lg text-sm border border-gray-600 focus:border-blue-500 outline-none" value={exerciseSearch} onChange={e => { setExerciseSearch(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} onKeyDown={e => { if(e.key==='Enter'){ onAdd(e.target.value); setExerciseSearch(''); } }} /><button className="bg-gray-800 p-3 rounded-lg text-gray-400 border border-gray-600"><BookOpen size={20}/></button></div>
      {showSuggestions && (exerciseSearch || filteredExercises.length > 0) && (<div className="absolute left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto mx-4">{filteredExercises.length > 0 ? filteredExercises.map((n, i) => <div key={i} className="p-3 hover:bg-blue-600/20 text-sm text-gray-300 border-b border-gray-700 last:border-0" onClick={() => { onAdd(n); setExerciseSearch(''); }}>{n}</div>) : <div className="p-3 text-sm text-gray-400 hover:bg-green-600/20" onClick={() => { onAdd(exerciseSearch); setExerciseSearch(''); }}>+ Create "{exerciseSearch}"</div>}</div>)}
    </div>
  );
};
