import React, { useState, useEffect } from 'react';
import { X, Ghost, Loader2, Timer, Wand2 } from 'lucide-react';
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
      <div className="bg-gray-800 w-full max-w-xs rounded-2xl p-6 border border-gray-700 shadow-2xl">
        <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-black italic text-white uppercase">TARGETS</h3><button onClick={onClose}><X size={24} className="text-gray-500"/></button></div>
        <div className="flex bg-gray-900 p-1 rounded-lg mb-6">{['CUT', 'MAINTAIN', 'BULK'].map(p => (<button key={p} onClick={() => setEditingPhase(p)} className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-all ${editingPhase === p ? 'bg-gray-700 text-white' : 'text-gray-500'}`}>{p}</button>))}</div>
        <div className="mb-6 flex items-center justify-between bg-gray-900/50 p-3 rounded-lg border border-gray-700"><span className="text-xs text-gray-400">Current Mode: <span className={activePhase==='CUT'?'text-red-400 font-bold':activePhase==='BULK'?'text-green-400 font-bold':'text-blue-400 font-bold'}>{activePhase}</span></span>{activePhase !== editingPhase && (<button onClick={() => setActivePhase(editingPhase)} className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30 font-bold">SET AS ACTIVE</button>)}</div>
        {ghostExplanation && (<div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg"><div className="flex items-center gap-2 text-blue-300 text-xs font-bold mb-1"><Ghost size={12}/> GHOST REASONING</div><p className="text-xs text-gray-300">{ghostExplanation}</p><p className="text-xs text-blue-200 mt-1 font-mono">Suggested Protein Range: {proteinRange}</p></div>)}
        <div className="space-y-4">
          <div><label className="text-xs text-blue-400 font-bold uppercase">Calories (Target)</label><input type="number" value={localTargets.cal||''} onChange={e=>setLocalTargets({...localTargets, cal:parseInt(e.target.value)||''})} className="w-full bg-gray-900 p-3 rounded-lg text-white font-bold text-center border border-gray-600"/></div>
          <div><label className="text-xs text-red-400 font-bold uppercase text-center block">Protein (Target)</label><input type="number" value={localTargets.p||''} onChange={e=>setLocalTargets({...localTargets, p:parseInt(e.target.value)||''})} className="w-full bg-gray-900 p-3 rounded-lg text-white font-bold text-center border border-gray-600"/></div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700">
            <div><label className="text-[10px] text-gray-500 font-bold uppercase text-center block">Carbs (Optional)</label><input type="number" value={localTargets.c||''} onChange={e=>setLocalTargets({...localTargets, c:parseInt(e.target.value)||''})} placeholder="-" className="w-full bg-gray-900 p-2 rounded-lg text-gray-400 text-center border border-gray-700 text-xs"/></div>
            <div><label className="text-[10px] text-gray-500 font-bold uppercase text-center block">Fats (Optional)</label><input type="number" value={localTargets.f||''} onChange={e=>setLocalTargets({...localTargets, f:parseInt(e.target.value)||''})} placeholder="-" className="w-full bg-gray-900 p-2 rounded-lg text-gray-400 text-center border border-gray-700 text-xs"/></div>
          </div>
        </div>
        <button onClick={handleAutoCalculate} disabled={loading || aiCooldown > 0} className="w-full mt-6 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-blue-300 text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
          {loading ? <Loader2 size={14} className="animate-spin"/> : aiCooldown > 0 ? <><Timer size={14}/> RESTING ({aiCooldown}s)</> : <><Wand2 size={14}/> ASK GHOST TO CALCULATE</>}
        </button>
        <button onClick={handleSave} className="w-full mt-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl">SAVE {editingPhase} TARGETS</button>
      </div>
    </div>
  );
};
