import React, { useState, useEffect } from 'react';
import { X, ChefHat, Loader2, Timer, Sparkles } from 'lucide-react';
import { API_URL } from '../constants';
import { parseAIResponse } from '../helpers';

export const GhostChefModal = ({ isOpen, onClose, targets, currentTotals, setToast, aiCooldown, setAiCooldown }) => {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [reqCals, setReqCals] = useState(0);
  const [reqProt, setReqProt] = useState(0);

  useEffect(() => { if (isOpen) { setReqCals(Math.max(0, targets.cal - currentTotals.cal)); setReqProt(Math.max(0, targets.p - currentTotals.p)); } }, [isOpen, targets, currentTotals]);

  if (!isOpen) return null;

  const handleGetSuggestion = async () => {
    if(aiCooldown > 0) { setToast(`Ghost is resting for ${aiCooldown}s`); return; }

    setLoading(true);
    try {
      const carbLimit = targets.c > 0 ? `Keep Carbs under ${targets.c}g.` : '';
      const fatLimit = targets.f > 0 ? `Keep Fats under ${targets.f}g.` : '';
      const prompt = `I need a high-protein meal or snack idea. Target: approx ${reqCals} calories and ${reqProt}g protein. Constraints: ${carbLimit} ${fatLimit}. Style: Fancy/Gourmet but simple. Return JSON only: {"mealName": "Name", "ingredients": ["List with amounts"], "macros": {"cal": number, "p": number, "c": number, "f": number}, "reason": "Why fits"}`;

      const response = await fetch(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, isImage: false, imageData: null })
      });
      const data = await response.json();
      if (!response.ok || !data.candidates) throw new Error(data.error || "AI Busy");

      setSuggestion(parseAIResponse(data.candidates[0].content.parts[0].text));
      setAiCooldown(10);
    } catch (e) {
      setToast("AI Error");
      setAiCooldown(5);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-gray-800 w-full max-w-sm rounded-2xl p-6 border border-gray-700 shadow-2xl">
        <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-black italic text-white flex items-center gap-2"><ChefHat className="text-blue-400"/> GHOST CHEF</h3><button onClick={onClose}><X size={24} className="text-gray-500"/></button></div>
        <div className="bg-gray-900 p-4 rounded-xl mb-4 text-center"><p className="text-gray-400 text-xs uppercase font-bold">Budget Remaining</p><div className="flex justify-center gap-4 mt-2"><div><span className="text-xl font-bold text-white">{reqCals}</span> <span className="text-xs text-gray-500">kcal</span></div><div><span className="text-xl font-bold text-blue-400">{reqProt}g</span> <span className="text-xs text-gray-500">prot</span></div></div></div>
        {!suggestion ? (
          <button onClick={handleGetSuggestion} disabled={loading || aiCooldown > 0} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all">
            {loading ? <Loader2 className="animate-spin"/> : aiCooldown > 0 ? <><Timer size={18}/> RESTING ({aiCooldown}s)</> : <><Sparkles size={18}/> GENERATE RECIPE</>}
          </button>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-bottom-4"><div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600"><h4 className="text-lg font-bold text-white mb-1">{suggestion.mealName}</h4><p className="text-xs text-blue-200 italic mb-3">{suggestion.reason}</p><ul className="text-sm text-gray-300 list-disc pl-4 space-y-1 mb-3">{suggestion.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}</ul><div className="flex gap-3 text-xs font-mono border-t border-gray-600 pt-2"><span className="text-white">{suggestion.macros.cal} kcal</span><span className="text-red-300">{suggestion.macros.p}p</span><span className="text-orange-300">{suggestion.macros.c}c</span><span className="text-yellow-300">{suggestion.macros.f}f</span></div></div>
            <button onClick={handleGetSuggestion} disabled={loading || aiCooldown > 0} className="w-full bg-gray-700 disabled:bg-gray-800 disabled:text-gray-600 text-gray-300 py-3 rounded-xl font-bold text-xs transition-all">
              {aiCooldown > 0 ? `RESTING (${aiCooldown}s)` : "TRY ANOTHER"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
