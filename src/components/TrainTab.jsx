import React, { useState, useEffect } from 'react';
import { Plus, Check, X, Edit3, Trash2, GripVertical, Sparkles, AlertTriangle, Activity, HeartPulse, Dumbbell } from 'lucide-react';
import { calculateReadiness, calculateSetTarget, getLocalDate } from '../helpers';
import { ExerciseSearchInput } from './ExerciseSearchInput';

export const TrainTab = ({
  workoutSplits, setWorkoutSplits, workoutHistory, setWorkoutHistory,
  workoutEditMode, setWorkoutEditMode, addSplit, deleteSplit, renameSplit, handleSortSplits,
  dragItem, dragOverItem, phase, dailyStats, requestConfirm, setShowCardioModal
}) => {
  const [mode, setMode] = useState('SPLIT_SELECT');
  const [activeSession, setActiveSession] = useState(null);
  const [editingSplit, setEditingSplit] = useState(null);
  const [readinessScore, setReadinessScore] = useState(50);

  useEffect(() => setReadinessScore(calculateReadiness(dailyStats)), [dailyStats]);

  const getLastSets = (name) => {
    for (let i = workoutHistory.length - 1; i >= 0; i--) {
      if (workoutHistory[i].exercises) {
        const ex = workoutHistory[i].exercises.find(e => e.name.toLowerCase() === name.toLowerCase());
        if (ex && ex.sets?.length) return ex.sets;
      }
    }
    return [];
  };

  const startSession = (split) => {
    let exercises = [];
    if (split) {
      exercises = split.exercises.map(ex => {
        const lastSets = getLastSets(ex.name);
        const count = lastSets.length || ex.defaultSets || 3;
        const sets = Array(count).fill(0).map((_, i) => {
          const prev = lastSets[i] || lastSets[lastSets.length-1];
          const w = calculateSetTarget(prev?.weight, prev?.reps, phase, readinessScore);
          return { weight: '', reps: '', done: false, target: w };
        });
        return { id: Date.now() + Math.random(), name: ex.name, sets };
      });
      setActiveSession({ name: split.name, splitId: split.id, exercises });
    } else {
      setActiveSession({ name: "Custom Workout", splitId: null, exercises: [] });
    }
    setMode('ACTIVE_SESSION');
  };

  const addExerciseToSession = (name) => {
    if (!name) return;
    const lastSets = getLastSets(name);
    const count = lastSets.length || 3;
    const sets = Array(count).fill(0).map((_, i) => {
      const prev = lastSets[i] || lastSets[lastSets.length-1];
      const w = calculateSetTarget(prev?.weight, prev?.reps, phase, readinessScore);
      return { weight: '', reps: '', done: false, target: w };
    });
    setActiveSession(p => ({ ...p, exercises: [...p.exercises, { id: Date.now(), name, sets }] }));
  };

  const finishWorkout = () => {
    if (!activeSession.exercises.length) { setMode('SPLIT_SELECT'); setActiveSession(null); return; }
    const log = { date: getLocalDate(), name: activeSession.name, type: 'strength', exercises: activeSession.exercises.map(ex => ({ name: ex.name, sets: ex.sets.filter(s => s.weight && s.reps).map(s => ({ weight: s.weight, reps: s.reps })) })) };
    setWorkoutHistory([...workoutHistory, log]);
    if (activeSession.splitId) {
       const updatedSplits = workoutSplits.map(split => {
         if (split.id === activeSession.splitId) {
           const newExercises = activeSession.exercises.map(ex => ({ id: Date.now() + Math.random(), name: ex.name, defaultSets: ex.sets.length }));
           return { ...split, exercises: newExercises };
         }
         return split;
       });
       setWorkoutSplits(updatedSplits);
    } else {
      if(window.confirm("Save as new template?")) {
        const name = window.prompt("Workout Name:");
        if(name) {
          const newSplit = { id: `s-${Date.now()}`, name, exercises: activeSession.exercises.map(e => ({ id: Date.now(), name: e.name, defaultSets: e.sets.length })) };
          setWorkoutSplits([...workoutSplits, newSplit]);
        }
      }
    }
    setActiveSession(null); setMode('SPLIT_SELECT');
  };

  const cancelSession = () => { requestConfirm("Quit workout?", () => { setActiveSession(null); setMode('SPLIT_SELECT'); }); };
  const removeExerciseFromSession = (exIndex) => { requestConfirm("Remove exercise?", () => { const newExs = [...activeSession.exercises]; newExs.splice(exIndex, 1); setActiveSession({ ...activeSession, exercises: newExs }); }); };
  const updateSet = (exIdx, setIdx, field, value) => { const n = [...activeSession.exercises]; n[exIdx].sets[setIdx][field] = value; setActiveSession({...activeSession, exercises: n}); };
  const toggleSetComplete = (exIdx, setIdx) => { const n = [...activeSession.exercises]; n[exIdx].sets[setIdx].done = !n[exIdx].sets[setIdx].done; setActiveSession({...activeSession, exercises: n}); };
  const addSet = (exIdx) => { const n = [...activeSession.exercises]; n[exIdx].sets.push({weight:'',reps:'',done:false,target:{}}); setActiveSession({...activeSession, exercises: n}); };
  const removeSet = (exIdx, setIdx) => { const n = [...activeSession.exercises]; n[exIdx].sets.splice(setIdx, 1); setActiveSession({...activeSession, exercises: n}); };

  const openTemplateEditor = (split) => { setEditingSplit(JSON.parse(JSON.stringify(split))); setMode('EDIT_TEMPLATE'); };
  const saveTemplate = () => { setWorkoutSplits(workoutSplits.map(s => s.id === editingSplit.id ? editingSplit : s)); setEditingSplit(null); setMode('SPLIT_SELECT'); };
  const addExerciseToTemplate = (name) => { if(!name) return; setEditingSplit(prev => ({ ...prev, exercises: [...prev.exercises, { id: Date.now(), name, defaultSets: 3 }] })); };
  const handleSortTemplateExercises = () => { let exs = [...editingSplit.exercises]; const dragged = exs.splice(dragItem.current, 1)[0]; exs.splice(dragOverItem.current, 0, dragged); dragItem.current = null; dragOverItem.current = null; setEditingSplit({ ...editingSplit, exercises: exs }); };
  const deleteExerciseFromTemplate = (idx) => { requestConfirm("Delete exercise?", () => { const newExs = [...editingSplit.exercises]; newExs.splice(idx, 1); setEditingSplit({...editingSplit, exercises: newExs}); }); };
  const handleRenameSplit = (id, currentName) => { const newName = window.prompt("Rename:", currentName); if(newName) setWorkoutSplits(workoutSplits.map(s => s.id === id ? { ...s, name: newName } : s)); };

  if (mode === 'SPLIT_SELECT') {
    return (
      <div className="animate-in fade-in">
         <div className="flex justify-between items-end mb-4">
           <h2 className="text-gray-500 font-bold text-[10px] tracking-[0.2em] uppercase">Workouts</h2>
           <button onClick={() => setWorkoutEditMode(!workoutEditMode)} className={`text-[10px] font-bold uppercase tracking-wider ${workoutEditMode ? 'text-green-400' : 'text-gray-600'}`}>{workoutEditMode ? 'DONE' : 'EDIT'}</button>
         </div>
         <button onClick={() => startSession(null)} className="w-full accent-bg-dim accent-border-dim border p-4 rounded-xl flex items-center justify-center gap-2 accent-text font-bold transition-all active:scale-[0.98] mb-3"><Plus size={18}/> Empty Workout</button>
         <button onClick={() => setShowCardioModal(true)} className="w-full bg-gray-900/50 border border-gray-800/50 p-4 rounded-xl flex items-center justify-center gap-2 text-gray-400 font-bold transition-all active:scale-[0.98] mb-4"><HeartPulse size={18} className="text-red-400"/> Log Cardio</button>
         <div className="grid grid-cols-1 gap-2">
           {workoutSplits.map((split, i) => (
             <div key={split.id} className="flex gap-2" onDragEnter={() => dragOverItem.current = i}>
               {workoutEditMode && <div draggable onDragStart={() => dragItem.current = i} onDragEnd={handleSortSplits} className="bg-gray-900/50 p-2 rounded-l-xl border border-gray-800/50 flex items-center justify-center cursor-move"><GripVertical size={18} className="text-gray-600"/></div>}
               <div className={`flex-1 flex items-center justify-between bg-gray-900/50 border border-gray-800/50 p-4 ${workoutEditMode ? 'rounded-r-xl' : 'rounded-xl'} transition-all active:scale-[0.98]`} onClick={() => !workoutEditMode && startSession(split)}>
                 <div className="flex items-center gap-2" onClick={(e) => { if(workoutEditMode) { e.stopPropagation(); handleRenameSplit(split.id, split.name); } }}>
                   <Dumbbell size={16} className="accent-text"/>
                   <span className="font-bold text-white">{split.name}</span>
                   {workoutEditMode && <Edit3 size={12} className="text-gray-600"/>}
                 </div>
                 {!workoutEditMode && <button onClick={(e) => { e.stopPropagation(); openTemplateEditor(split); }} className="bg-gray-800 p-2 rounded-lg text-gray-400 hover:text-white transition-colors"><Edit3 size={14}/></button>}
               </div>
               {workoutEditMode && (
                 <div className="flex flex-col gap-1">
                   <button onClick={(e) => { e.stopPropagation(); handleRenameSplit(split.id, split.name) }} className="bg-gray-900/50 p-2 rounded-lg accent-text border border-gray-800/50"><Edit3 size={14}/></button>
                   <button onClick={(e) => { e.stopPropagation(); deleteSplit(split.id) }} className="bg-gray-900/50 p-2 rounded-lg text-red-400 border border-gray-800/50"><Trash2 size={14}/></button>
                 </div>
               )}
             </div>
           ))}
           {workoutEditMode && <button onClick={addSplit} className="bg-black/30 border-2 border-dashed border-gray-800/50 p-4 rounded-xl text-gray-600 font-bold hover:text-white mt-2 w-full transition-colors">+ ADD SPLIT</button>}
         </div>
      </div>
    );
  }

  if (mode === 'EDIT_TEMPLATE') {
    return (
      <div className="animate-in fade-in">
        <div className="flex justify-between items-center border-b border-gray-800/50 pb-4 mb-4">
          <button onClick={() => setMode('SPLIT_SELECT')} className="text-[10px] text-gray-600 hover:text-white uppercase font-bold tracking-wider">&larr; Back</button>
          <h2 className="text-white font-black text-lg">{editingSplit.name}</h2>
          <button onClick={saveTemplate} className="text-[10px] text-green-400 font-bold uppercase tracking-wider">SAVE</button>
        </div>
        <div className="space-y-2">{editingSplit.exercises.map((ex, i) => (
          <div key={ex.id} className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/50 flex items-center gap-3" onDragEnter={() => dragOverItem.current = i}>
            <div draggable onDragStart={() => dragItem.current = i} onDragEnd={handleSortTemplateExercises} className="cursor-move"><GripVertical size={18} className="text-gray-600"/></div>
            <div className="flex-1"><p className="text-white font-bold">{ex.name}</p></div>
            <button onClick={(e) => {e.stopPropagation(); deleteExerciseFromTemplate(i);}} className="text-red-400"><Trash2 size={16}/></button>
          </div>
        ))}</div>
        <ExerciseSearchInput onAdd={addExerciseToTemplate} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in">
      {/* Readiness indicator */}
      <div className={`p-3 rounded-xl border flex items-center gap-3 mb-4 ${readinessScore > 80 ? 'bg-green-900/20 border-green-500/30' : readinessScore < 40 ? 'bg-red-900/20 border-red-500/30' : 'bg-gray-900/50 border-gray-800/50'}`}>
         {readinessScore > 80 ? <Sparkles className="text-green-400" size={18}/> : readinessScore < 40 ? <AlertTriangle className="text-red-400" size={18}/> : <Activity className="text-gray-500" size={18}/>}
         <div><p className="text-xs font-bold text-white uppercase tracking-wide">{readinessScore > 80 ? "System Prime" : readinessScore < 40 ? "High Fatigue" : "Normal Readiness"}</p><p className="text-[10px] text-gray-500">{readinessScore > 80 ? "Targets increased." : readinessScore < 40 ? "Ghost lowered targets." : "Standard progression."}</p></div>
      </div>

      <div className="flex justify-between items-center border-b border-gray-800/50 pb-4 mb-4">
        <button onClick={cancelSession} className="text-[10px] text-gray-600 hover:text-white uppercase font-bold tracking-wider">&larr; Cancel</button>
        <h2 className="text-white font-black text-lg">{activeSession.name}</h2>
        <button onClick={finishWorkout} className="text-[10px] text-green-400 font-bold uppercase tracking-wider">FINISH</button>
      </div>

      {activeSession.exercises.map((ex, exIdx) => (
        <div key={ex.id} className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/50 mb-3">
          <div className="flex justify-between items-start mb-3"><h3 className="text-base font-bold text-white">{ex.name}</h3><button onClick={(e) => {e.stopPropagation(); removeExerciseFromSession(exIdx);}} className="text-gray-700 hover:text-red-400 p-1"><Trash2 size={16}/></button></div>
          <div className="space-y-2">
            <div className="flex text-[9px] text-gray-600 uppercase font-bold px-1 tracking-wider"><span className="w-6 text-center">Set</span><span className="flex-1 text-center">Kg</span><span className="flex-1 text-center">Reps</span><span className="w-16 text-center">Done</span></div>
            {ex.sets.map((set, setIdx) => (
              <div key={setIdx} className={`flex items-center gap-2 transition-opacity ${set.done ? 'opacity-40' : ''}`}>
                <span className="w-6 text-center text-gray-700 text-xs font-mono">{setIdx + 1}</span>
                <div className="flex-1"><input type="number" value={set.weight} placeholder={set.target?.weight ? `${set.target.weight}` : 'kg'} onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)} className="w-full bg-black/50 rounded-lg h-10 text-center text-white font-bold border border-gray-800/50 outline-none focus:accent-border transition-colors"/></div>
                <div className="flex-1"><input type="number" value={set.reps} placeholder={set.target?.reps ? `${set.target.reps}` : 'reps'} onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)} className="w-full bg-black/50 rounded-lg h-10 text-center text-white font-bold border border-gray-800/50 outline-none focus:accent-border transition-colors"/></div>
                <button onClick={() => toggleSetComplete(exIdx, setIdx)} className={`w-8 h-10 rounded-lg flex items-center justify-center transition-all ${set.done ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-600'}`}><Check size={14} /></button>
                <button onClick={() => removeSet(exIdx, setIdx)} className="w-8 h-10 rounded-lg bg-black/30 border border-gray-800/50 flex items-center justify-center text-gray-700 hover:text-red-400"><X size={12}/></button>
              </div>
            ))}
            <button onClick={() => addSet(exIdx)} className="w-full py-2 text-[10px] text-gray-600 font-bold hover:accent-text rounded flex items-center justify-center gap-1 mt-1 transition-colors"><Plus size={12}/> ADD SET</button>
          </div>
        </div>
      ))}
      <ExerciseSearchInput onAdd={addExerciseToSession} />
      <button onClick={finishWorkout} className="w-full accent-bg hover:opacity-90 text-white font-bold py-4 rounded-xl text-base uppercase tracking-wider mt-6 transition-all active:scale-[0.98] accent-glow">FINISH WORKOUT</button>
    </div>
  );
};
