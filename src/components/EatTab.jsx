import React from 'react';
import { Plus, Flame, Trash2, GripVertical, ChefHat, Lock } from 'lucide-react';

export const EatTab = ({ savedMeals, dailyLog, mealEditMode, setMealEditMode, setShowAddMealModal, setShowGhostChefModal, logMeal, deleteSavedMeal, deleteLogItem, getMealMacros, dragItem, dragOverItem, handleSortMeals, requestConfirm, userTargets, dailyStats, isPro, handlePremiumFeature }) => {
  return (
    <div className="animate-in fade-in">
      <div className="flex justify-between items-end mb-4">
        <h2 className="text-gray-500 font-bold text-[10px] tracking-[0.2em] uppercase flex items-center gap-2"><Flame size={12}/> Meal Bank</h2>
        <div className="flex gap-2">
          <button onClick={() => handlePremiumFeature(() => setShowGhostChefModal(true))} className="text-[10px] accent-bg-dim accent-border-dim border accent-text font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all active:scale-95">
            <ChefHat size={12}/> CHEF {!isPro && <Lock size={9} className="opacity-50"/>}
          </button>
          <button onClick={() => setShowAddMealModal(true)} className="text-[10px] accent-text font-bold flex items-center gap-1">+ NEW</button>
        </div>
      </div>

      {savedMeals.length === 0 ? (
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800/50 text-center text-gray-600 mb-6">No meals saved yet. Add one!</div>
      ) : savedMeals.map((meal, i) => {
        const macros = getMealMacros(meal);
        return (
          <div key={meal.id} className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/50 group mb-2 transition-all" draggable={mealEditMode} onDragStart={() => dragItem.current = i} onDragEnter={() => dragOverItem.current = i} onDragEnd={handleSortMeals}>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                {mealEditMode && (<div className="mr-2 cursor-move text-gray-700"><GripVertical size={18}/></div>)}
                <div>
                  <h3 className="text-white font-bold">{meal.name}</h3>
                  <div className="flex gap-3 text-[10px] font-mono mt-1">
                    <span className="accent-text">{macros.cal} kcal</span>
                    <span className="text-red-300">{macros.p}p</span>
                    <span className="text-orange-300">{macros.c}c</span>
                    <span className="text-yellow-300">{macros.f}f</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {mealEditMode ? (
                  <button onClick={(e) => {e.stopPropagation(); requestConfirm("Delete this meal?", () => deleteSavedMeal(meal.id))}} className="bg-red-500/10 text-red-400 p-2 rounded-lg"><Trash2 size={16}/></button>
                ) : (
                  <button onClick={(e) => {e.stopPropagation(); logMeal(meal)}} className="bg-gray-800 hover:bg-green-600 text-white p-2 rounded-lg transition-colors"><Plus size={16}/></button>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {savedMeals.length > 0 && (
        <div className="flex justify-end mb-8">
          <button onClick={() => setMealEditMode(!mealEditMode)} className={`text-[10px] font-bold uppercase tracking-wider ${mealEditMode ? 'text-green-400' : 'text-gray-600'}`}>{mealEditMode ? 'DONE' : 'EDIT'}</button>
        </div>
      )}

      {/* Today's Log */}
      <div>
        <div className="flex justify-between items-center mb-3 mt-4">
          <h2 className="text-gray-500 font-bold text-[10px] tracking-[0.2em] uppercase">Today's Log</h2>
          <span className="text-[10px] text-gray-600 font-bold">{userTargets.cal} kcal goal</span>
        </div>
        {dailyLog.length === 0 && <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800/50 text-center text-gray-600">No meals logged today.</div>}
        {dailyLog.map((log, i) => (
          <div key={i} className="flex justify-between items-center bg-black/30 p-3 rounded-xl border border-gray-800/50 group mb-2">
            <div>
              <span className="text-white font-medium text-sm block">{log.name}</span>
              <div className="flex gap-2 text-[10px] text-gray-600 font-mono">
                <span className="accent-text">{log.totalCals}cal</span>
                <span>{log.totalP}p</span>
              </div>
            </div>
            <button onClick={() => deleteLogItem(i)} className="text-gray-700 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
          </div>
        ))}
      </div>
    </div>
  );
};
