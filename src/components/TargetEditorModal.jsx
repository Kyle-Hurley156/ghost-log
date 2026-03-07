import React, { useState, useEffect } from 'react';
import { X, Loader2, Timer, Wand2, Sparkles } from 'lucide-react';
import { API_URL, INITIAL_TARGETS } from '../constants';
import { parseAIResponse } from '../helpers';

export const TargetEditorModal = ({ isOpen, onClose, activePhase, setActivePhase, targets, setTargets, currentWeight, setToast, aiCooldown, setAiCooldown }) => {
  const [editingPhase, setEditingPhase] = useState(activePhase);
  const [localTargets, setLocalTargets] = useState(targets[activePhase] || INITIAL_TARGETS[activePhase]);
  const [loading, setLoading] = useState(false);
  const [ghostExplanation, setGhostExplanation] = useState("");
  const [proteinRange, setProteinRange] = useState("");

  useEffect(() => { setLocalTargets(targets[editingPhase] || INITIAL_TARGETS[editingPhase]); setGhostExplanation(""); setProteinRange(""); }, [editingPhase, targets]);
  useEffect(() => { if (isOpen) setEditingPhase(activePhase); }, [isOpen, activePhase]);

  if (!isOpen) return null;

  const handleAutoCalculate = async () => {
    if(aiCooldown > 0) { setToast(`Ghost is resting for ${aiCooldown}s`); return; }
    setLoading(true);
    try {
      const prompt = `I am a bodybuilder currently ${editingPhase}ing. My weight is ${currentWeight}kg. Recommend Calorie target and Protein range (Min-Max). Rules: 1. Cut: TEE - 500kcal. Protein: 1.8-2.7g/kg. 2. Bulk: TEE + 300kcal. Protein: 1.6-2.2g/kg. 3. Maintain: TEE. Protein: 1.8-2.2g/kg. Ignore carbs/fats. Return JSON only: {"cal": number, "p_min": number, "p_max": number, "explanation": string}`;

      const response = await fetch(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, isImage: false, imageData: null })
      });
      const data = await response.json();
      if (!response.ok || !data.candidates) throw new Error("No response");

      const result = parseAIResponse(data.candidates[0].content.parts[0].text);
      setLocalTargets({ ...localTargets, cal: result.cal, p: result.p_max });
      setGhostExplanation(result.explanation); setProteinRange(`${result.p_min} - ${result.p_max}g`);
      setToast("Ghost calculated new targets");
      setAiCooldown(10);
    } catch (e) {
      setToast("AI Error");
      setAiCooldown(5);
    }
    setLoading(false);
  };

  const handleSave = () => { setTargets(prev => ({ ...prev, [editingPhase]: localTargets })); setToast(`${editingPhase} Targets Saved`); onClose(); };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-gray-900 w-full max-w-xs rounded-2xl p-6 border border-gray-800/50 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-black tracking-tight text-white uppercase">TARGETS</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800 transition-colors"><X size={22} className="text-gray-500"/></button>
        </div>

        {/* Phase tabs */}
        <div className="flex bg-black/50 p-1 rounded-xl mb-5 border border-gray-800/50">
          {['CUT', 'MAINTAIN', 'BULK'].map(p => (
            <button key={p} onClick={() => setEditingPhase(p)}
              className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${editingPhase === p ? 'bg-gray-800 text-white' : 'text-gray-600'}`}>{p}</button>
          ))}
        </div>

        {/* Active mode indicator */}
        <div className="mb-5 flex items-center justify-between bg-black/30 p-3 rounded-xl border border-gray-800/50">
          <span className="text-[10px] text-gray-500">Active: <span className={activePhase==='CUT'?'text-red-400 font-bold':activePhase==='BULK'?'text-green-400 font-bold':'accent-text font-bold'}>{activePhase}</span></span>
          {activePhase !== editingPhase && (
            <button onClick={() => setActivePhase(editingPhase)} className="text-[10px] accent-bg-dim accent-text px-2 py-1 rounded-lg accent-border-dim border font-bold">SET ACTIVE</button>
          )}
        </div>

        {/* Ghost explanation */}
        {ghostExplanation && (
          <div className="mb-4 p-3 accent-bg-dim accent-border-dim border rounded-xl">
            <div className="flex items-center gap-2 accent-text text-xs font-bold mb-1"><Sparkles size={12}/> GHOST REASONING</div>
            <p className="text-xs text-gray-300">{ghostExplanation}</p>
            <p className="text-xs accent-text mt-1 font-mono">Protein: {proteinRange}</p>
          </div>
        )}

        {/* Target inputs */}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] accent-text font-bold uppercase tracking-wider">Calories</label>
            <input type="number" value={localTargets.cal||''} onChange={e=>setLocalTargets({...localTargets, cal:parseInt(e.target.value)||''})} className="w-full bg-black/50 p-3 rounded-xl text-white font-bold text-center border border-gray-800/50 focus:accent-border outline-none transition-colors"/>
          </div>
          <div>
            <label className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Protein</label>
            <input type="number" value={localTargets.p||''} onChange={e=>setLocalTargets({...localTargets, p:parseInt(e.target.value)||''})} className="w-full bg-black/50 p-3 rounded-xl text-white font-bold text-center border border-gray-800/50 outline-none"/>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800/30">
            <div><label className="text-[9px] text-gray-600 font-bold uppercase text-center block">Carbs</label><input type="number" value={localTargets.c||''} onChange={e=>setLocalTargets({...localTargets, c:parseInt(e.target.value)||''})} placeholder="-" className="w-full bg-black/50 p-2 rounded-xl text-gray-400 text-center border border-gray-800/50 text-xs outline-none"/></div>
            <div><label className="text-[9px] text-gray-600 font-bold uppercase text-center block">Fats</label><input type="number" value={localTargets.f||''} onChange={e=>setLocalTargets({...localTargets, f:parseInt(e.target.value)||''})} placeholder="-" className="w-full bg-black/50 p-2 rounded-xl text-gray-400 text-center border border-gray-800/50 text-xs outline-none"/></div>
          </div>
        </div>

        <button onClick={handleAutoCalculate} disabled={loading || aiCooldown > 0} className="w-full mt-5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 accent-text text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
          {loading ? <Loader2 size={14} className="animate-spin"/> : aiCooldown > 0 ? <><Timer size={14}/> RESTING ({aiCooldown}s)</> : <><Wand2 size={14}/> ASK GHOST</>}
        </button>
        <button onClick={handleSave} className="w-full mt-2 accent-bg hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98]">SAVE {editingPhase} TARGETS</button>
      </div>
    </div>
  );
};
