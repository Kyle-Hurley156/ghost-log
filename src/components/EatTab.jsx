import React from 'react';
import { Plus, Flame, Trash2, GripVertical, ChefHat, Lock } from 'lucide-react';

export const EatTab = ({ savedMeals, dailyLog, mealEditMode, setMealEditMode, setShowAddMealModal, setShowGhostChefModal, logMeal, deleteSavedMeal, deleteLogItem, getMealMacros, dragItem, dragOverItem, handleSortMeals, requestConfirm, userTargets, dailyStats, isPro, handlePremiumFeature }) => {
  return (
    <div className="animate-in fade-in">
      <div className="flex justify-between items-end mb-4"><h2 className="text-gray-400 font-bold text-sm tracking-widest uppercase flex items-center gap-2"><Flame size={14} /> Meal Bank</h2><div className="flex gap-2"><button onClick={() => handlePremiumFeature(() => setShowGhostChefModal(true))} className="text-xs bg-blue-600/20 border border-blue-500/50 text-blue-400 font-bold px-3 py-1 rounded-lg flex items-center gap-1"><ChefHat size={14}/> GHOST CHEF {!isPro && <Lock size={10} className="opacity-50"/>}</button><button onClick={() => setShowAddMealModal(true)} className="text-xs text-blue-400 font-bold flex items-center gap-1">+ NEW MEAL</button></div></div>
      {savedMeals.length === 0 ? <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center text-gray-500 italic mb-6">No meals saved yet. Add one!</div> : savedMeals.map((meal, i) => {
        const macros = getMealMacros(meal);
        return (<div key={meal.id} className={`bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-sm group mb-2`} draggable={mealEditMode} onDragStart={() => dragItem.current = i} onDragEnter={() => dragOverItem.current = i} onDragEnd={handleSortMeals}><div className="flex justify-between items-center"><div className="flex items-center">{mealEditMode && (<div className="mr-2 cursor-move text-gray-600 hover:text-white"><GripVertical size={20}/></div>)}<div><h3 className="text-white font-bold text-lg">{meal.name}</h3><div className="flex gap-3 text-xs font-mono mt-1"><span className="text-blue-300">{macros.cal} kcal</span><span className="text-red-300">{macros.p}p</span><span className="text-orange-300">{macros.c}c</span><span className="text-yellow-300">{macros.f}f</span></div></div></div><div className="flex gap-2">{mealEditMode ? <button onClick={(e) => {e.stopPropagation(); requestConfirm("Delete this meal?", () => deleteSavedMeal(meal.id))}} className="bg-red-500/20 text-red-400 p-2 rounded-full hover:bg-red-500"><Trash2 size={20} /></button> : <button onClick={(e) => {e.stopPropagation(); logMeal(meal)}} className="bg-gray-700 hover:bg-green-600 text-white p-2 rounded-full"><Plus size={20} /></button>}</div></div></div>);
      })}
      {savedMeals.length > 0 && <div className="flex justify-end mb-8"><button onClick={() => setMealEditMode(!mealEditMode)} className={`text-xs font-bold ${mealEditMode ? 'text-green-400' : 'text-gray-500'}`}>{mealEditMode ? 'DONE EDITING' : 'EDIT MEALS'}</button></div>}

      <div>
        <div className="flex justify-between items-center mb-4 mt-6"><h2 className="text-gray-400 font-bold text-sm tracking-widest uppercase">Today's Log</h2><span className="text-xs text-gray-500 font-bold">Goal: {userTargets.cal} kcal</span></div>
        {dailyLog.length === 0 && <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center text-gray-500 italic">No meals logged today.</div>}
        {dailyLog.map((log, i) => (<div key={i} className="flex justify-between items-center bg-gray-900 p-3 rounded-lg border border-gray-800 group mb-2"><div><span className="text-white font-medium block">{log.name}</span><div className="flex gap-2 text-[10px] text-gray-500 font-mono"><span className="text-blue-400">{log.totalCals}cal</span><span>{log.totalP}p</span></div></div><button onClick={() => deleteLogItem(i)} className="text-gray-600 hover:text-red-400"><Trash2 size={16}/></button></div>))}
      </div>
    </div>
  );
};
