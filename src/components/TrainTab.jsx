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
         <div className="flex justify-between items-end mb-4"><h2 className="text-gray-400 font-bold text-sm tracking-widest uppercase">Workouts</h2><button onClick={() => setWorkoutEditMode(!workoutEditMode)} className={`text-xs font-bold ${workoutEditMode ? 'text-green-400' : 'text-gray-500'}`}>{workoutEditMode ? 'DONE' : 'EDIT SPLITS'}</button></div>
         <button onClick={() => startSession(null)} className="w-full bg-blue-600/20 border border-blue-500/50 p-4 rounded-xl flex items-center justify-center gap-2 text-blue-400 font-bold hover:bg-blue-600/30 transition-all mb-3"><Plus size={20}/> Start Empty Workout</button>
         <button onClick={() => setShowCardioModal(true)} className="w-full bg-gray-800 border border-gray-700 p-4 rounded-xl flex items-center justify-center gap-2 text-gray-300 font-bold hover:bg-gray-700 transition-all mb-4"><HeartPulse size={20} className="text-red-400"/> Log Cardio</button>
         <div className="grid grid-cols-1 gap-3">{workoutSplits.map((split, i) => (<div key={split.id} className="flex gap-2" onDragEnter={() => dragOverItem.current = i}>{workoutEditMode && <div draggable onDragStart={() => dragItem.current = i} onDragEnd={handleSortSplits} className="bg-gray-800 p-2 rounded-l-xl border-y border-l border-gray-700 flex items-center justify-center cursor-move"><GripVertical size={20} className="text-gray-500"/></div>}<div className={`flex-1 flex items-center justify-between bg-gray-800 border border-gray-700 p-4 ${workoutEditMode ? 'rounded-r-xl' : 'rounded-xl'}`} onClick={() => !workoutEditMode && startSession(split)}><div className="flex items-center gap-2" onClick={(e) => { if(workoutEditMode) { e.stopPropagation(); handleRenameSplit(split.id, split.name); } }}><span className="font-bold text-lg text-white">{split.name}</span>{workoutEditMode && <Edit3 size={14} className="text-gray-500"/>}</div>{!workoutEditMode ? <button onClick={(e) => { e.stopPropagation(); openTemplateEditor(split); }} className="bg-gray-700 p-2 rounded-lg text-gray-300 hover:text-blue-400"><Edit3 size={16}/></button> : null}</div>{workoutEditMode && (<div className="flex flex-col gap-1"><button onClick={(e) => { e.stopPropagation(); handleRenameSplit(split.id, split.name) }} className="bg-gray-800 p-2 rounded-lg text-blue-400 border border-gray-700"><Edit3 size={14}/></button><button onClick={(e) => { e.stopPropagation(); deleteSplit(split.id) }} className="bg-gray-800 p-2 rounded-lg text-red-400 border border-gray-700"><Trash2 size={14}/></button></div>)}</div>))}
           {workoutEditMode && <button onClick={addSplit} className="bg-gray-900 border-2 border-dashed border-gray-700 p-4 rounded-xl text-gray-500 font-bold hover:text-white mt-2 w-full">+ ADD NEW SPLIT</button>}</div>
      </div>
    );
  }

  if (mode === 'EDIT_TEMPLATE') {
    return (
      <div className="animate-in fade-in">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-4"><button onClick={() => setMode('SPLIT_SELECT')} className="text-xs text-gray-500 hover:text-white uppercase font-bold tracking-wider">&larr; Back</button><h2 className="text-white font-black italic text-xl">Editing: {editingSplit.name}</h2><button onClick={saveTemplate} className="text-xs text-green-400 font-bold uppercase tracking-wider">SAVE</button></div>
        <div className="space-y-2">{editingSplit.exercises.map((ex, i) => (<div key={ex.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center gap-3" onDragEnter={() => dragOverItem.current = i}><div draggable onDragStart={() => dragItem.current = i} onDragEnd={handleSortTemplateExercises} className="cursor-move"><GripVertical size={20} className="text-gray-500"/></div><div className="flex-1"><p className="text-white font-bold">{ex.name}</p></div><button onClick={(e) => {e.stopPropagation(); deleteExerciseFromTemplate(i);}} className="text-red-400"><Trash2 size={18}/></button></div>))}</div>
        <ExerciseSearchInput onAdd={addExerciseToTemplate} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in">
      <div className={`p-3 rounded-lg border flex items-center gap-3 mb-4 ${readinessScore > 80 ? 'bg-green-900/30 border-green-500/50' : readinessScore < 40 ? 'bg-red-900/30 border-red-500/50' : 'bg-gray-800 border-gray-700'}`}>
         {readinessScore > 80 ? <Sparkles className="text-green-400" size={20}/> : readinessScore < 40 ? <AlertTriangle className="text-red-400" size={20}/> : <Activity className="text-gray-400" size={20}/>}
         <div><p className="text-xs font-bold text-white uppercase tracking-wide">{readinessScore > 80 ? "System Prime" : readinessScore < 40 ? "High Fatigue" : "Normal Readiness"}</p><p className="text-[10px] text-gray-400">{readinessScore > 80 ? "Targets increased." : readinessScore < 40 ? "Ghost lowered targets." : "Standard progression."}</p></div>
      </div>
      <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-4"><button onClick={cancelSession} className="text-xs text-gray-500 hover:text-white uppercase font-bold tracking-wider">&larr; Cancel</button><h2 className="text-white font-black italic text-xl">{activeSession.name}</h2><button onClick={finishWorkout} className="text-xs text-green-400 font-bold uppercase tracking-wider">FINISH</button></div>
      {activeSession.exercises.map((ex, exIdx) => (
        <div key={ex.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-sm mb-4">
          <div className="flex justify-between items-start mb-3"><h3 className="text-lg font-bold text-white">{ex.name}</h3><button onClick={(e) => {e.stopPropagation(); removeExerciseFromSession(exIdx);}} className="text-gray-600 hover:text-red-400 p-1"><Trash2 size={18}/></button></div>
          <div className="space-y-2"><div className="flex text-[10px] text-gray-500 uppercase font-bold px-1"><span className="w-6 text-center">Set</span><span className="flex-1 text-center">Kg</span><span className="flex-1 text-center">Reps</span><span className="w-16 text-center">Done</span></div>
            {ex.sets.map((set, setIdx) => (<div key={setIdx} className={`flex items-center gap-2 ${set.done ? 'opacity-50' : ''}`}><span className="w-6 text-center text-gray-600 text-xs font-mono">{setIdx + 1}</span><div className="flex-1 relative"><input type="number" value={set.weight} placeholder={set.target?.weight ? `${set.target.weight}` : 'kg'} onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)} className="w-full bg-gray-900 rounded-lg h-10 text-center text-white font-bold border border-gray-600 outline-none"/></div><div className="flex-1 relative"><input type="number" value={set.reps} placeholder={set.target?.reps ? `${set.target.reps}` : 'reps'} onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)} className="w-full bg-gray-900 rounded-lg h-10 text-center text-white font-bold border border-gray-600 outline-none"/></div><button onClick={() => toggleSetComplete(exIdx, setIdx)} className={`w-8 h-10 rounded-lg flex items-center justify-center transition-colors ${set.done ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-400'}`}><Check size={16} /></button><button onClick={() => removeSet(exIdx, setIdx)} className="w-8 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 hover:text-red-400"><X size={14}/></button></div>))}
            <button onClick={() => addSet(exIdx)} className="w-full py-2 text-xs text-gray-500 font-bold hover:text-blue-400 hover:bg-gray-700/50 rounded flex items-center justify-center gap-1 mt-2"><Plus size={14}/> ADD SET</button>
          </div>
        </div>
      ))}
      <ExerciseSearchInput onAdd={addExerciseToSession} />
      <button onClick={finishWorkout} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 text-lg uppercase tracking-wider mt-6">FINISH WORKOUT</button>
    </div>
  );
};
