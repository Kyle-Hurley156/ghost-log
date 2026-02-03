import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Dumbbell, Utensils, TrendingUp, Plus, Check, ChevronRight, Flame, Droplets, 
  Footprints, BrainCircuit, Battery, Zap, Ghost, X, Edit3, Scale, Trash2, 
  Search, Beef, Wheat, Droplet, Activity, Moon, BarChart3, 
  Calendar, Save, Info, Wand2, Camera, Loader2, GripVertical, Settings,
  History, BookOpen, Sparkles, AlertTriangle, ArrowLeft, AlertCircle, Target,
  ChefHat, Timer, HeartPulse, Bike
} from 'lucide-react';

// --- CONFIGURATION ---
// 🔴 API KEY SET 🔴
const YOUR_GEMINI_API_KEY = "AIzaSyBIeVDLmfc1BfSEuMtZIWVVdZESFehu92Q"; 
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
const APP_VERSION = "1.6";

// --- GLOBAL STYLES ---
const style = document.createElement('style');
style.innerHTML = `
  input[type=number]::-webkit-inner-spin-button, 
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
  .no-select { user-select: none; -webkit-user-select: none; }
`;
document.head.appendChild(style);

// --- DATABASES ---
const EXERCISE_DATABASE = [
  "Ab Wheel Rollout", "Adductor Machine", "Arnold Press", "Back Extension", "Barbell Bench Press", "Barbell Bicep Curl", "Barbell Row", "Barbell Shrug", "Barbell Squat",
  "Battle Ropes", "Bench Dip", "Box Jump", "Bulgarian Split Squat", "Burpees", "Cable Crossover", "Cable Crunch", "Cable Row", "Calf Press",
  "Chest Dip", "Chest Fly", "Chest Press Machine", "Chin Up", "Clean and Jerk", "Concentration Curl", "Crunch", "Deadlift", "Decline Bench Press", 
  "Dumbbell Bench Press", "Dumbbell Bicep Curl", "Dumbbell Fly", "Dumbbell Lunge", "Dumbbell Pullover", "Dumbbell Row", "Dumbbell Shoulder Press", "Dumbbell Shrug", "Dumbbell Squat",
  "Face Pull", "Farmer's Walk", "Front Raise", "Front Squat", "Glute Bridge", "Goblet Squat", "Hack Squat", "Hammer Curl", "Hanging Leg Raise", 
  "Hip Thrust", "Incline Bench Press", "Incline Dumbbell Curl", "Incline Dumbbell Press", "Jump Rope", "Lat Pulldown", "Lateral Raise", "Leg Curl", 
  "Leg Extension", "Leg Press", "Lunge", "Machine Chest Fly", "Machine Shoulder Press", "Mountain Climbers", "Muscle Up", "Overhead Press", 
  "Pec Deck", "Pendlay Row", "Plank", "Pull Up", "Push Up", "Rack Pull", "Reverse Fly", "Romanian Deadlift", "Russian Twist", "Seated Calf Raise", 
  "Seated Row", "Shoulder Press", "Shrug", "Skullcrusher", "Smith Machine Squat", "Snatch", "Spider Curl", "Standing Calf Raise", "Sumo Deadlift", 
  "T-Bar Row", "Tricep Dip", "Tricep Extension", "Tricep Pushdown", "Turkish Get Up", "Walking Lunge", "Weighted Dip", "Wrist Curl", "Zercher Squat"
];

const CARDIO_DATABASE = [
  "Treadmill", "Elliptical", "Exercise Bike", "Stair Master", "Rowing Machine", "Jump Rope", 
  "Swimming", "Running (Outdoor)", "Cycling (Outdoor)", "Walking (Incline)", "HIIT", "Boxing", 
  "Basketball", "Soccer", "Yoga (Vinyasa)", "Rucking", "Assault Bike", "SkiErg"
];

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("GhostLog Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center">
          <Ghost size={48} className="text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-red-500 mb-2">GhostLog Crashed</h1>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold mt-4"
          >
            RESET APP DATA
          </button>
        </div>
      );
    }
    return this.props.children; 
  }
}

// --- HELPERS ---
const getLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - (offset * 60 * 1000));
  return local.toISOString().split('T')[0];
};

const calculateReadiness = (stats) => {
  if (!stats) return 50;
  const sleepScore = (stats.sleepQuality || 3) * 4; 
  const stressScore = (6 - (stats.stress || 3)) * 4; 
  const fatigueScore = (6 - (stats.fatigue || 3)) * 4; 
  return Math.min(100, Math.max(0, (sleepScore + stressScore + fatigueScore) * (100/60)));
};

const calculateSetTarget = (lastWeight, lastReps, phase, readiness) => {
  if (!lastWeight) return { weight: null, reps: null };
  let targetWeight = parseFloat(lastWeight);
  let targetReps = parseFloat(lastReps);

  // Phase Logic
  if (phase === 'BULK') { 
    if (lastReps >= 10) targetWeight += 2.5; else targetReps += 1; 
  } else if (phase === 'CUT') { 
    if (lastReps >= 12) targetWeight += 2.5; 
  } else {
    // MAINTAIN
    if (lastReps >= 12) targetWeight += 2.5; 
  }

  // Readiness Logic
  if (readiness < 40) targetWeight = Math.min(targetWeight, parseFloat(lastWeight)); 
  else if (readiness > 85 && targetWeight === parseFloat(lastWeight)) targetReps += 1;
  
  return { weight: targetWeight, reps: targetReps };
};

const parseAIResponse = (text) => {
  try {
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      const jsonStr = text.substring(startIndex, endIndex + 1);
      return JSON.parse(jsonStr);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON Parse Error", e);
    throw new Error("Failed to parse AI response");
  }
};

function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      const version = window.localStorage.getItem("GL_VERSION");
      
      // FORCE RESET if version doesn't match
      if (version !== APP_VERSION) {
         window.localStorage.setItem("GL_VERSION", APP_VERSION);
         return defaultValue; 
      }

      if (stickyValue !== null) {
        const parsed = JSON.parse(stickyValue);
        if (Array.isArray(defaultValue) && !Array.isArray(parsed)) return defaultValue;
        if (typeof defaultValue === 'object' && !Array.isArray(defaultValue) && (Array.isArray(parsed) || typeof parsed !== 'object')) return defaultValue;
        return parsed;
      }
    } catch (e) {
      console.warn("GhostLog: Resetting corrupted state for", key);
    }
    return defaultValue;
  });
  useEffect(() => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch(e) { console.error("Storage Error", e); }
  }, [key, value]);
  return [value, setValue];
}

// --- INITIAL DATA ---
const INITIAL_SPLITS = [
  { id: 'split-1', name: 'Push A', exercises: [{ id: 1, name: 'Incline DB Press', defaultSets: 3 }, { id: 2, name: 'Lateral Raise', defaultSets: 4 }, { id: 3, name: 'Tricep Pushdown', defaultSets: 3 }] },
  { id: 'split-2', name: 'Pull B', exercises: [{ id: 1, name: 'Pullups', defaultSets: 3 }, { id: 2, name: 'DB Row', defaultSets: 3 }] },
  { id: 'split-3', name: 'Legs A', exercises: [{ id: 1, name: 'Squat', defaultSets: 3 }, { id: 2, name: 'RDL', defaultSets: 3 }] }
];
const INITIAL_MEALS = [];
const INITIAL_TARGETS = {
  CUT: { cal: 2200, p: 200, c: 0, f: 0 },
  BULK: { cal: 3100, p: 220, c: 0, f: 0 },
  MAINTAIN: { cal: 2600, p: 200, c: 0, f: 0 }
};

// --- SUB COMPONENTS ---

const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-2xl border border-gray-700 z-[60] animate-in fade-in slide-in-from-bottom-4 flex items-center gap-3 pointer-events-none whitespace-nowrap">
      <Info size={18} className="text-blue-400"/>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

const ConfirmModal = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-gray-800 w-full max-w-xs rounded-2xl p-6 border border-gray-700 shadow-2xl text-center">
        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4"/>
        <h3 className="text-lg font-bold text-white mb-2">Are you sure?</h3>
        <p className="text-sm text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-bold">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold">Yes</button>
        </div>
      </div>
    </div>
  );
};

// --- CARDIO MODAL ---
const CardioModal = ({ isOpen, onClose, onSave }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredCardio = useMemo(() => {
    if (!searchTerm) return CARDIO_DATABASE;
    return CARDIO_DATABASE.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm]);

  const handleSelect = (type) => {
    setSelectedType(type);
    setSearchTerm(type);
    setShowSuggestions(false);
  };

  if (!isOpen) return null;

  const handleSave = () => {
    if (!duration || !calories || !selectedType) return;
    onSave({ type: 'Cardio', name: selectedType, duration: parseFloat(duration), calories: parseFloat(calories) });
    setDuration(''); setCalories(''); setSearchTerm(''); setSelectedType(''); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-gray-800 w-full max-w-xs rounded-2xl p-6 border border-gray-700 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black italic text-white uppercase flex items-center gap-2"><HeartPulse className="text-red-500"/> CARDIO</h3>
          <button onClick={onClose}><X size={24} className="text-gray-500"/></button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Activity</label>
            <div className="flex items-center gap-2 bg-gray-900 p-3 rounded-lg border border-gray-600">
               <Search size={16} className="text-gray-500"/>
               <input 
                 type="text" 
                 placeholder="Search (e.g. Running)" 
                 value={searchTerm}
                 onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); setSelectedType(e.target.value); }}
                 onFocus={() => setShowSuggestions(true)}
                 className="bg-transparent text-white text-sm w-full outline-none"
               />
            </div>
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg max-h-40 overflow-y-auto z-20 shadow-xl">
                {filteredCardio.map((c, i) => (
                  <div key={i} onClick={() => handleSelect(c)} className="p-3 text-sm text-white hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0">
                    {c}
                  </div>
                ))}
                {filteredCardio.length === 0 && (
                   <div onClick={() => handleSelect(searchTerm)} className="p-3 text-sm text-blue-400 hover:bg-gray-700 cursor-pointer italic">
                     Use custom: "{searchTerm}"
                   </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
               <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Time (min)</label>
               <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full bg-gray-900 p-3 rounded-lg text-white font-bold text-center border border-gray-600 outline-none"/>
            </div>
            <div className="flex-1">
               <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Calories</label>
               <input type="number" value={calories} onChange={e => setCalories(e.target.value)} className="w-full bg-gray-900 p-3 rounded-lg text-white font-bold text-center border border-gray-600 outline-none"/>
            </div>
          </div>
        </div>

        <button onClick={handleSave} className="w-full mt-6 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl">LOG SESSION</button>
      </div>
    </div>
  );
};

// --- GHOST CHEF MODAL ---
const GhostChefModal = ({ isOpen, onClose, targets, currentTotals, apiKey, setToast }) => {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  
  const [reqCals, setReqCals] = useState(0);
  const [reqProt, setReqProt] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setReqCals(Math.max(0, targets.cal - currentTotals.cal));
      setReqProt(Math.max(0, targets.p - currentTotals.p));
    }
  }, [isOpen, targets, currentTotals]);

  if (!isOpen) return null;

  const handleGetSuggestion = async () => {
    setLoading(true);
    try {
      const carbLimit = targets.c > 0 ? `Keep Carbs under ${targets.c}g.` : '';
      const fatLimit = targets.f > 0 ? `Keep Fats under ${targets.f}g.` : '';

      const prompt = `I need a high-protein meal or snack idea.
      Target: approx ${reqCals} calories and ${reqProt}g protein.
      Constraints: ${carbLimit} ${fatLimit}
      Style: Fancy/Gourmet but simple to make.
      
      Return JSON only:
      {
        "mealName": "Name of fancy meal",
        "ingredients": ["List of ingredients with exact amounts"],
        "macros": { "cal": number, "p": number, "c": number, "f": number },
        "reason": "Why this fits the macros perfectly"
      }`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      const result = parseAIResponse(data.candidates[0].content.parts[0].text);
      setSuggestion(result);
    } catch (e) { setToast("Ghost Chef is busy."); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-gray-800 w-full max-w-sm rounded-2xl p-6 border border-gray-700 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-black italic text-white flex items-center gap-2"><ChefHat className="text-blue-400"/> GHOST CHEF</h3>
          <button onClick={onClose}><X size={24} className="text-gray-500"/></button>
        </div>

        <div className="bg-gray-900 p-4 rounded-xl mb-4">
           <p className="text-gray-400 text-xs uppercase font-bold text-center mb-2">Meal Requirements</p>
           <div className="flex gap-3">
              <div className="flex-1">
                 <label className="text-[10px] text-gray-500 block mb-1">CALORIES</label>
                 <input type="number" value={reqCals} onChange={(e) => setReqCals(parseInt(e.target.value)||0)} className="w-full bg-gray-800 text-white text-center font-bold p-2 rounded border border-gray-600"/>
              </div>
              <div className="flex-1">
                 <label className="text-[10px] text-gray-500 block mb-1">PROTEIN (g)</label>
                 <input type="number" value={reqProt} onChange={(e) => setReqProt(parseInt(e.target.value)||0)} className="w-full bg-gray-800 text-white text-center font-bold p-2 rounded border border-gray-600"/>
              </div>
           </div>
           {(targets.c > 0 || targets.f > 0) && (
             <div className="mt-2 text-[10px] text-gray-500 text-center italic">
               *Strict limits active: Max {targets.c > 0 ? `${targets.c}C` : ''} {targets.f > 0 ? `${targets.f}F` : ''}
             </div>
           )}
        </div>

        {!suggestion && (
          <button 
            onClick={handleGetSuggestion}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin"/> : <><Sparkles size={18}/> GENERATE RECIPE</>}
          </button>
        )}

        {suggestion && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4">
            <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
              <h4 className="text-lg font-bold text-white mb-1">{suggestion.mealName}</h4>
              <p className="text-xs text-blue-200 italic mb-3">{suggestion.reason}</p>
              <ul className="text-sm text-gray-300 list-disc pl-4 space-y-1 mb-3">
                {suggestion.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
              </ul>
              <div className="flex gap-3 text-xs font-mono border-t border-gray-600 pt-2">
                <span className="text-white">{suggestion.macros.cal} kcal</span>
                <span className="text-red-300">{suggestion.macros.p}p</span>
                <span className="text-orange-300">{suggestion.macros.c}c</span>
                <span className="text-yellow-300">{suggestion.macros.f}f</span>
              </div>
            </div>
            <button onClick={handleGetSuggestion} className="w-full bg-gray-700 text-gray-300 py-3 rounded-xl font-bold text-xs">TRY ANOTHER</button>
          </div>
        )}
      </div>
    </div>
  );
};

const TargetEditorModal = ({ isOpen, onClose, activePhase, setActivePhase, targets, setTargets, currentWeight, apiKey, setToast }) => {
  const [editingPhase, setEditingPhase] = useState(activePhase); 
  const [localTargets, setLocalTargets] = useState(targets[activePhase] || INITIAL_TARGETS[activePhase]);
  const [loading, setLoading] = useState(false);
  const [ghostExplanation, setGhostExplanation] = useState("");
  const [proteinRange, setProteinRange] = useState("");

  useEffect(() => {
    setLocalTargets(targets[editingPhase] || INITIAL_TARGETS[editingPhase]);
    setGhostExplanation(""); 
    setProteinRange("");
  }, [editingPhase, targets]);
  
  useEffect(() => {
    if (isOpen) setEditingPhase(activePhase);
  }, [isOpen, activePhase]);

  if (!isOpen) return null;

  const handleAutoCalculate = async () => {
    setLoading(true);
    try {
      const prompt = `I am a bodybuilder currently ${editingPhase}ing. My weight is ${currentWeight}kg. 
      Recommend a Calorie target and a Protein range (Min-Max).
      
      Rules:
      1. Cut: TEE - 500kcal. Protein: 1.8-2.7g/kg (Muscle sparing).
      2. Bulk: TEE + 300kcal. Protein: 1.6-2.2g/kg (Sufficient).
      3. Maintain: TEE. Protein: 1.8-2.2g/kg.
      
      Ignore carbs and fats. Only focus on Calories and Protein.

      Return JSON only: {"cal": number, "p_min": number, "p_max": number, "explanation": string}`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const result = parseAIResponse(data.candidates[0].content.parts[0].text);
      
      setLocalTargets({ ...localTargets, cal: result.cal, p: result.p_max }); 
      setGhostExplanation(result.explanation);
      setProteinRange(`${result.p_min} - ${result.p_max}g`);
      setToast("Ghost calculated new targets");
    } catch (e) {
      setToast("AI Error: " + e.message);
    }
    setLoading(false);
  };

  const handleSave = () => {
    setTargets(prev => ({ ...prev, [editingPhase]: localTargets }));
    setToast(`${editingPhase} Targets Saved`);
    onClose(); 
  };

  const handleCalChange = (e) => {
    const val = e.target.value;
    setLocalTargets({ ...localTargets, cal: val === '' ? '' : parseInt(val) });
  };

  const handleProtChange = (e) => {
    const val = e.target.value;
    setLocalTargets({ ...localTargets, p: val === '' ? '' : parseInt(val) });
  };
  
  const handleCarbChange = (e) => {
    const val = e.target.value;
    setLocalTargets({ ...localTargets, c: val === '' ? '' : parseInt(val) });
  };

  const handleFatChange = (e) => {
    const val = e.target.value;
    setLocalTargets({ ...localTargets, f: val === '' ? '' : parseInt(val) });
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-gray-800 w-full max-w-xs rounded-2xl p-6 border border-gray-700 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-black italic text-white uppercase">TARGETS</h3>
          <button onClick={onClose}><X size={24} className="text-gray-500"/></button>
        </div>

        {/* Phase Switcher */}
        <div className="flex bg-gray-900 p-1 rounded-lg mb-6">
           {['CUT', 'MAINTAIN', 'BULK'].map(p => (
             <button 
              key={p} 
              onClick={() => setEditingPhase(p)} 
              className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-all ${editingPhase === p ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
            >
               {p}
             </button>
           ))}
        </div>

        {/* Active Status */}
        <div className="mb-6 flex items-center justify-between bg-gray-900/50 p-3 rounded-lg border border-gray-700">
           <span className="text-xs text-gray-400">Current Mode: <span className={activePhase === 'CUT' ? 'text-red-400 font-bold' : activePhase === 'BULK' ? 'text-green-400 font-bold' : 'text-blue-400 font-bold'}>{activePhase}</span></span>
           {activePhase !== editingPhase && (
             <button onClick={() => setActivePhase(editingPhase)} className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30 font-bold">SET AS ACTIVE</button>
           )}
        </div>

        {/* GHOST EXPLANATION */}
        {ghostExplanation && (
          <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
             <div className="flex items-center gap-2 text-blue-300 text-xs font-bold mb-1"><Ghost size={12}/> GHOST REASONING</div>
             <p className="text-xs text-gray-300">{ghostExplanation}</p>
             <p className="text-xs text-blue-200 mt-1 font-mono">Suggested Protein Range: {proteinRange}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs text-blue-400 font-bold uppercase">Calories (Target)</label>
            <input type="number" value={localTargets.cal || ''} onChange={handleCalChange} className="w-full bg-gray-900 p-3 rounded-lg text-white font-bold text-center border border-gray-600"/>
          </div>
          <div>
             <label className="text-xs text-red-400 font-bold uppercase text-center block">Protein (Target)</label>
             <input type="number" value={localTargets.p || ''} onChange={handleProtChange} className="w-full bg-gray-900 p-3 rounded-lg text-white font-bold text-center border border-gray-600"/>
          </div>
          
          {/* Optional Carbs/Fats */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700">
            <div>
               <label className="text-[10px] text-gray-500 font-bold uppercase text-center block">Carbs (Optional)</label>
               <input type="number" value={localTargets.c || ''} onChange={handleCarbChange} placeholder="-" className="w-full bg-gray-900 p-2 rounded-lg text-gray-400 text-center border border-gray-700 text-xs"/>
            </div>
            <div>
               <label className="text-[10px] text-gray-500 font-bold uppercase text-center block">Fats (Optional)</label>
               <input type="number" value={localTargets.f || ''} onChange={handleFatChange} placeholder="-" className="w-full bg-gray-900 p-2 rounded-lg text-gray-400 text-center border border-gray-700 text-xs"/>
            </div>
          </div>
        </div>

        <button 
          onClick={handleAutoCalculate}
          disabled={loading}
          className="w-full mt-6 bg-gray-700 hover:bg-gray-600 text-blue-300 text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin"/> : <><Wand2 size={14}/> ASK GHOST TO CALCULATE</>}
        </button>

        <button 
          onClick={handleSave}
          className="w-full mt-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl"
        >
          SAVE {editingPhase} TARGETS
        </button>
      </div>
    </div>
  );
};

const GhostAiPanel = ({ show, onClose }) => (
  <div className={`fixed inset-y-0 right-0 w-80 bg-gray-900 border-l border-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ${show ? 'translate-x-0' : 'translate-x-full'}`}>
    <div className="p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black italic text-blue-400 flex items-center gap-2"><Ghost size={24}/> GHOST AI</h2><button onClick={onClose}><X size={24} className="text-gray-500"/></button></div>
      <div className="flex-1 bg-gray-800 p-3 rounded-lg border border-gray-700"><p className="text-sm text-gray-300"><span className="text-blue-300 font-bold">Status:</span> Ghost is monitoring your inputs.</p></div>
    </div>
  </div>
);

const ExerciseSearchInput = ({ onAdd }) => {
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredExercises = useMemo(() => {
    if (!exerciseSearch) return [];
    return EXERCISE_DATABASE.filter(ex => ex.toLowerCase().includes(exerciseSearch.toLowerCase()));
  }, [exerciseSearch]);

  return (
    <div className="mt-6 bg-gray-900 border border-dashed border-gray-700 rounded-xl p-4 relative">
      <p className="text-xs text-gray-500 font-bold uppercase mb-2">Add Exercise</p>
      <div className="flex gap-2">
        <input 
          type="text" 
          placeholder="Search Exercise..." 
          className="flex-1 bg-gray-800 text-white p-3 rounded-lg text-sm border border-gray-600 focus:border-blue-500 outline-none" 
          value={exerciseSearch} 
          onChange={e => { setExerciseSearch(e.target.value); setShowSuggestions(true); }} 
          onFocus={() => setShowSuggestions(true)} 
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} 
          onKeyDown={e => { if(e.key==='Enter'){ onAdd(e.target.value); setExerciseSearch(''); } }} 
        />
        <button className="bg-gray-800 p-3 rounded-lg text-gray-400 border border-gray-600"><BookOpen size={20}/></button>
      </div>
      {showSuggestions && (exerciseSearch || filteredExercises.length > 0) && (
        <div className="absolute left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto mx-4">
          {filteredExercises.length > 0 ? filteredExercises.map((n, i) => (
            <div key={i} className="p-3 hover:bg-blue-600/20 text-sm text-gray-300 border-b border-gray-700 last:border-0" onClick={() => { onAdd(n); setExerciseSearch(''); }}>{n}</div>
          )) : (
            <div className="p-3 text-sm text-gray-400 hover:bg-green-600/20" onClick={() => { onAdd(exerciseSearch); setExerciseSearch(''); }}>+ Create "{exerciseSearch}"</div>
          )}
        </div>
      )}
    </div>
  );
};

const AddMealModal = ({ isOpen, onClose, onSave, apiKey, setToast }) => {
  const [mealName, setMealName] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentFood, setCurrentFood] = useState({ name: '', cal: '', p: '', c: '', f: '' });
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Identify food "${searchQuery}". Return JSON per 100g: {"name":string,"cal":number,"p":number,"c":number,"f":number} ONLY JSON` }] }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const result = parseAIResponse(data.candidates[0].content.parts[0].text);
      setCurrentFood({ name: result.name, cal: result.cal, p: result.p, c: result.c, f: result.f });
    } catch (e) { setToast("AI Error: " + e.message); }
    setLoading(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: `Identify food in image. Return JSON per 100g: {"name":string,"cal":number,"p":number,"c":number,"f":number} ONLY JSON` }, { inline_data: { mime_type: "image/jpeg", data: reader.result.split(',')[1] } }] }] })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          const result = parseAIResponse(data.candidates[0].content.parts[0].text);
          setSearchQuery(result.name);
          setCurrentFood({ name: result.name, cal: result.cal, p: result.p, c: result.c, f: result.f });
        } catch (e) { setToast("Scan Error: " + e.message); }
        setLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const addIngredient = () => {
    const name = currentFood.name || searchQuery || "Food";
    if (name && weight) {
      const m = parseFloat(weight) / 100;
      setIngredients([...ingredients, { id: Date.now(), name: `${name} (${weight}g)`, cal: Math.round((currentFood.cal||0)*m), p: Math.round((currentFood.p||0)*m), c: Math.round((currentFood.c||0)*m), f: Math.round((currentFood.f||0)*m), active: true }]);
      setSearchQuery(''); setWeight(''); setCurrentFood({ name: '', cal: '', p: '', c: '', f: '' });
    }
  };

  const removeIngredient = (index) => {
    const newIngredients = [...ingredients];
    newIngredients.splice(index, 1);
    setIngredients(newIngredients);
  };

  const handleSave = () => {
    if (mealName && ingredients.length > 0) {
      onSave({ id: Date.now(), name: mealName, ingredients: ingredients });
      setMealName('');
      setIngredients([]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-gray-800 w-full max-w-md rounded-2xl p-6 border border-gray-700 shadow-2xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-black italic text-white">CREATE MEAL</h2><button onClick={onClose}><X size={24} className="text-gray-500"/></button></div>
        <div className="space-y-4 flex-1 overflow-y-auto">
          <input type="text" placeholder="Meal Name" value={mealName} onChange={e => setMealName(e.target.value)} className="w-full bg-gray-900 p-3 rounded-lg text-white border border-gray-600 outline-none"/>
          <div className="space-y-2">{ingredients.map((ing, i) => (<div key={ing.id} className="bg-gray-900 p-2 rounded flex justify-between items-center text-sm border border-gray-700"><span className="text-white">{ing.name}</span><span className="text-gray-400 text-xs">{ing.cal}kcal</span><button onClick={() => removeIngredient(i)} className="text-red-400"><Trash2 size={16}/></button></div>))}</div>
          <div className="bg-gray-900/50 p-3 rounded-xl border border-dashed border-gray-700 relative">
            {loading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10"><Loader2 className="animate-spin text-blue-500"/></div>}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1"><input type="text" placeholder="Search Food" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="w-full bg-gray-800 p-2 rounded text-sm text-white outline-none border border-gray-600"/><button onClick={handleSearch} className="absolute right-2 top-2 text-gray-400"><Search size={16}/></button></div>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden"/><button onClick={() => fileInputRef.current.click()} className="bg-gray-800 p-2 rounded border border-gray-600 text-gray-400"><Camera size={20}/></button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">{['cal','p','c','f'].map(k => <input key={k} type="number" placeholder={k.toUpperCase()} value={currentFood[k]} onChange={e => setCurrentFood({...currentFood, [k]: e.target.value})} className="bg-gray-800 p-2 rounded text-xs text-white border border-gray-600 text-center"/>)}</div>
            <div className="flex gap-2"><input type="number" placeholder="Weight (g)" value={weight} onChange={e => setWeight(e.target.value)} className="flex-1 bg-gray-800 p-2 rounded text-sm text-white border border-gray-600"/><button onClick={addIngredient} className="px-4 bg-blue-600 text-white rounded font-bold text-xs">ADD</button></div>
          </div>
        </div>
        <button onClick={handleSave} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl mt-4">SAVE MEAL</button>
      </div>
    </div>
  );
};

const DailyCheckinModal = ({ isOpen, onClose, stats, setStats, onSave, date, setDate }) => {
  if (!isOpen) return null;

  const getStressLabel = (val) => ['Zen', 'Chill', 'Normal', 'Spicy', 'INTERNAL SCREAMING'][val - 1] || 'Normal';
  const getFatigueLabel = (val) => ['Fresh', 'Good', 'Meh', 'Heavy', 'WRECKED'][val - 1] || 'Meh';
  const getSleepLabel = (val) => ['Terrible', 'Poor', 'Okay', 'Good', 'Great'][val - 1] || 'Okay';
  const getActivityLabel = (val) => ['Sedentary', 'Light', 'Moderate', 'Very Active', 'Athlete'][val - 1] || 'Moderate';

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center p-4 animate-in slide-in-from-bottom-10">
      <div className="bg-gray-800 w-full max-w-sm rounded-2xl p-6 border border-gray-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4 sticky top-0 bg-gray-800 z-10 pb-2"><div><h2 className="text-xl font-black italic text-white">DAILY LOG</h2><p className="text-xs text-gray-400">Keep the streak.</p></div><button onClick={onClose} className="text-xs font-bold text-gray-500 border border-gray-600 px-2 py-1 rounded">SKIP</button></div>
        <div className="space-y-5">
           <div className="bg-gray-900 p-3 rounded border border-gray-700 flex justify-between items-center"><span className="text-gray-300 text-sm font-bold flex gap-2"><Calendar size={16}/> Date</span><input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-gray-800 text-white text-sm outline-none"/></div>
           <div className="flex justify-between items-center"><div className="flex gap-2 text-gray-300 items-center"><Scale size={18}/> Weight</div><div className="flex gap-2 items-center"><input type="number" value={stats.weight} onChange={e => setStats({...stats, weight: e.target.value})} className="bg-gray-900 w-20 p-2 rounded text-center text-white font-bold border border-gray-700"/><span className="text-sm text-gray-500">kg</span></div></div>
           <div className="flex justify-between items-center"><div className="flex gap-2 text-gray-300 items-center"><Footprints size={18}/> Steps</div><input type="number" value={stats.steps} onChange={e => setStats({...stats, steps: e.target.value})} className="bg-gray-900 w-24 p-2 rounded text-center text-white font-bold border border-gray-700"/></div>
           
           {/* Activity Level */}
           <div>
             <div className="flex justify-between text-xs text-gray-300 mb-2"><span className="capitalize flex gap-2 items-center"><Zap size={14}/> Activity Level</span><span className="font-bold text-blue-400">{getActivityLabel(stats.activity)}</span></div>
             <input type="range" min="1" max="5" value={stats.activity} onChange={e => setStats({...stats, activity: parseInt(e.target.value)})} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
           </div>

           <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-gray-300"><Moon size={18}/> Sleep Duration</div>
            <div className="flex items-center gap-2"><input type="number" step="0.5" value={stats.sleepHours} onChange={(e) => setStats({...stats, sleepHours: e.target.value})} className="bg-gray-900 w-24 p-2 rounded text-center font-bold text-white border border-gray-700"/><span className="text-sm text-gray-500">hrs</span></div>
           </div>

           {/* Sliders */}
           {['sleepQuality', 'stress', 'fatigue'].map(k => (
             <div key={k}>
               <div className="flex justify-between text-xs text-gray-300 mb-2">
                 <span className="capitalize flex gap-2 items-center"><Activity size={14}/> {k.replace(/([A-Z])/g, ' $1')}</span>
                 <span className={`font-bold ${stats[k] > (k==='sleepQuality'?2:3) ? (k==='sleepQuality'?'text-green-400':'text-red-400') : (k==='sleepQuality'?'text-red-400':'text-green-400')}`}>
                   {stats[k]}/5 - {k==='sleepQuality' ? getSleepLabel(stats[k]) : k==='stress' ? getStressLabel(stats[k]) : getFatigueLabel(stats[k])}
                 </span>
               </div>
               <input type="range" min="1" max="5" value={stats[k]} onChange={e => setStats({...stats, [k]: parseInt(e.target.value)})} className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-${k==='sleepQuality'?'green':'red'}-500`}/>
             </div>
           ))}
           <button onClick={onSave} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl mt-2 flex justify-center gap-2"><Save size={20}/> SUBMIT</button>
        </div>
      </div>
    </div>
  );
};

// --- TRAIN TAB ---
const TrainTab = ({ 
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
      // Handle cardio logs which have different structure
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
    if (!activeSession.exercises.length) { 
      setMode('SPLIT_SELECT'); 
      setActiveSession(null);
      return; 
    }
    const log = { 
      date: getLocalDate(), 
      name: activeSession.name, 
      exercises: activeSession.exercises.map(ex => ({ 
        name: ex.name, 
        sets: ex.sets.filter(s => s.weight && s.reps).map(s => ({ weight: s.weight, reps: s.reps })) 
      })) 
    };
    setWorkoutHistory([...workoutHistory, log]);
    if (activeSession.splitId) {
       const updatedSplits = workoutSplits.map(split => {
         if (split.id === activeSession.splitId) {
           const newExercises = activeSession.exercises.map(ex => ({
             id: Date.now() + Math.random(), 
             name: ex.name,
             defaultSets: ex.sets.length 
           }));
           return { ...split, exercises: newExercises };
         }
         return split;
       });
       setWorkoutSplits(updatedSplits);
    }
    setActiveSession(null); 
    setMode('SPLIT_SELECT');
  };

  const cancelSession = () => {
    requestConfirm("Quit workout? Progress will be lost.", () => {
      setActiveSession(null);
      setMode('SPLIT_SELECT');
    });
  };

  const removeExerciseFromSession = (exIndex) => {
    requestConfirm("Remove exercise?", () => {
      const newExs = [...activeSession.exercises];
      newExs.splice(exIndex, 1);
      setActiveSession({ ...activeSession, exercises: newExs });
    });
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    const n = [...activeSession.exercises];
    n[exIdx].sets[setIdx][field] = value;
    setActiveSession({...activeSession, exercises: n});
  };

  const toggleSetComplete = (exIdx, setIdx) => {
    const n = [...activeSession.exercises];
    n[exIdx].sets[setIdx].done = !n[exIdx].sets[setIdx].done;
    setActiveSession({...activeSession, exercises: n});
  };

  const addSet = (exIdx) => {
    const n = [...activeSession.exercises];
    n[exIdx].sets.push({weight:'',reps:'',done:false,target:{}});
    setActiveSession({...activeSession, exercises: n});
  };

  const removeSet = (exIdx, setIdx) => {
    const n = [...activeSession.exercises];
    n[exIdx].sets.splice(setIdx, 1);
    setActiveSession({...activeSession, exercises: n});
  };

  // Template Logic
  const openTemplateEditor = (split) => { setEditingSplit(JSON.parse(JSON.stringify(split))); setMode('EDIT_TEMPLATE'); };
  const saveTemplate = () => {
    setWorkoutSplits(workoutSplits.map(s => s.id === editingSplit.id ? editingSplit : s));
    setEditingSplit(null); setMode('SPLIT_SELECT');
  };
  const addExerciseToTemplate = (name) => {
    if(!name) return;
    setEditingSplit(prev => ({ ...prev, exercises: [...prev.exercises, { id: Date.now(), name, defaultSets: 3 }] }));
  };
  const handleSortTemplateExercises = () => {
    let exs = [...editingSplit.exercises];
    const dragged = exs.splice(dragItem.current, 1)[0];
    exs.splice(dragOverItem.current, 0, dragged);
    dragItem.current = null; dragOverItem.current = null;
    setEditingSplit({ ...editingSplit, exercises: exs });
  };
  const deleteExerciseFromTemplate = (idx) => {
    requestConfirm("Delete exercise from template?", () => {
      const newExs = [...editingSplit.exercises];
      newExs.splice(idx, 1);
      setEditingSplit({...editingSplit, exercises: newExs});
    });
  };

  if (mode === 'SPLIT_SELECT') {
    return (
      <div className="pb-24 p-4 space-y-4 animate-in fade-in">
         <div className="flex justify-between items-end">
            <h2 className="text-gray-400 font-bold text-sm tracking-widest uppercase">Workouts</h2>
            <button onClick={() => setWorkoutEditMode(!workoutEditMode)} className={`text-xs font-bold ${workoutEditMode ? 'text-green-400' : 'text-gray-500'}`}>{workoutEditMode ? 'DONE' : 'EDIT SPLITS'}</button>
         </div>
         
         {/* NEW: Start Empty Workout */}
         <button onClick={() => startSession(null)} className="w-full bg-blue-600/20 border border-blue-500/50 p-4 rounded-xl flex items-center justify-center gap-2 text-blue-400 font-bold hover:bg-blue-600/30 transition-all"><Plus size={20}/> Start Empty Workout</button>
         
         {/* NEW: Cardio Button */}
         <button onClick={() => setShowCardioModal(true)} className="w-full bg-gray-800 border border-gray-700 p-4 rounded-xl flex items-center justify-center gap-2 text-gray-300 font-bold hover:bg-gray-700 transition-all"><HeartPulse size={20} className="text-red-400"/> Cardio +</button>
         
         <div className="grid grid-cols-1 gap-3">
           {workoutSplits.map((split, i) => (
             <div key={split.id} className="flex gap-2" onDragEnter={() => dragOverItem.current = i}>
               {workoutEditMode && <div draggable onDragStart={() => dragItem.current = i} onDragEnd={handleSortSplits} className="bg-gray-800 p-2 rounded-l-xl border-y border-l border-gray-700 flex items-center justify-center cursor-move"><GripVertical size={20} className="text-gray-500"/></div>}
               <div className={`flex-1 flex items-center justify-between bg-gray-800 border border-gray-700 p-4 ${workoutEditMode ? 'rounded-r-xl' : 'rounded-xl'}`} onClick={() => !workoutEditMode && startSession(split)}>
                  <span className="font-bold text-lg text-white">{split.name}</span>
                  {!workoutEditMode ? <button onClick={(e) => { e.stopPropagation(); openTemplateEditor(split); }} className="bg-gray-700 p-2 rounded-lg text-gray-300 hover:text-blue-400"><Edit3 size={16}/></button> : null}
               </div>
               {workoutEditMode && (
                 <div className="flex flex-col gap-1">
                   <button onClick={(e) => { e.stopPropagation(); renameSplit(split.id, split.name) }} className="bg-gray-800 p-2 rounded-lg text-blue-400 border border-gray-700"><Edit3 size={14}/></button>
                   <button onClick={(e) => { e.stopPropagation(); deleteSplit(split.id) }} className="bg-gray-800 p-2 rounded-lg text-red-400 border border-gray-700"><Trash2 size={14}/></button>
                 </div>
               )}
             </div>
           ))}
           {workoutEditMode && <button onClick={addSplit} className="bg-gray-900 border-2 border-dashed border-gray-700 p-4 rounded-xl text-gray-500 font-bold hover:text-white">+ ADD NEW SPLIT</button>}
         </div>
      </div>
    );
  }

  if (mode === 'EDIT_TEMPLATE') {
    return (
      <div className="pb-24 p-4 space-y-4 animate-in fade-in">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
           <button onClick={() => setMode('SPLIT_SELECT')} className="text-xs text-gray-500 hover:text-white uppercase font-bold tracking-wider">&larr; Back</button>
           <h2 className="text-white font-black italic text-xl">Editing: {editingSplit.name}</h2>
           <button onClick={saveTemplate} className="text-xs text-green-400 font-bold uppercase tracking-wider">SAVE</button>
        </div>
        <div className="space-y-2">
          {editingSplit.exercises.map((ex, i) => (
            <div key={ex.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center gap-3" onDragEnter={() => dragOverItem.current = i}>
               <div draggable onDragStart={() => dragItem.current = i} onDragEnd={handleSortTemplateExercises} className="cursor-move"><GripVertical size={20} className="text-gray-500"/></div>
               <div className="flex-1"><p className="text-white font-bold">{ex.name}</p></div>
               <button onClick={(e) => {e.stopPropagation(); deleteExerciseFromTemplate(i);}} className="text-red-400"><Trash2 size={18}/></button>
            </div>
          ))}
        </div>
        <ExerciseSearchInput onAdd={addExerciseToTemplate} />
      </div>
    );
  }

  // ACTIVE SESSION
  return (
    <div className="pb-24 p-4 space-y-4 animate-in fade-in">
      <div className={`p-3 rounded-lg border flex items-center gap-3 mb-4 ${readinessScore > 80 ? 'bg-green-900/30 border-green-500/50' : readinessScore < 40 ? 'bg-red-900/30 border-red-500/50' : 'bg-gray-800 border-gray-700'}`}>
         {readinessScore > 80 ? <Sparkles className="text-green-400" size={20}/> : readinessScore < 40 ? <AlertTriangle className="text-red-400" size={20}/> : <Activity className="text-gray-400" size={20}/>}
         <div><p className="text-xs font-bold text-white uppercase tracking-wide">{readinessScore > 80 ? "System Prime" : readinessScore < 40 ? "High Fatigue" : "Normal Readiness"}</p><p className="text-[10px] text-gray-400">{readinessScore > 80 ? "Targets increased." : readinessScore < 40 ? "Ghost lowered targets." : "Standard progression."}</p></div>
      </div>
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
         <button onClick={cancelSession} className="text-xs text-gray-500 hover:text-white uppercase font-bold tracking-wider">&larr; Cancel</button>
         <h2 className="text-white font-black italic text-xl">{activeSession.name}</h2>
         <button onClick={finishWorkout} className="text-xs text-green-400 font-bold uppercase tracking-wider">FINISH</button>
      </div>
      {activeSession.exercises.map((ex, exIdx) => (
        <div key={ex.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-bold text-white">{ex.name}</h3>
            <button onClick={(e) => {e.stopPropagation(); removeExerciseFromSession(exIdx);}} className="text-gray-600 hover:text-red-400 p-1"><Trash2 size={18}/></button>
          </div>
          <div className="space-y-2">
            <div className="flex text-[10px] text-gray-500 uppercase font-bold px-1"><span className="w-6 text-center">Set</span><span className="flex-1 text-center">Kg</span><span className="flex-1 text-center">Reps</span><span className="w-16 text-center">Done</span></div>
            {ex.sets.map((set, setIdx) => (
              <div key={setIdx} className={`flex items-center gap-2 ${set.done ? 'opacity-50' : ''}`}>
                <span className="w-6 text-center text-gray-600 text-xs font-mono">{setIdx + 1}</span>
                <div className="flex-1 relative"><input type="number" value={set.weight} placeholder={set.target?.weight ? `${set.target.weight}` : 'kg'} onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)} className="w-full bg-gray-900 rounded-lg h-10 text-center text-white font-bold border border-gray-600 outline-none"/></div>
                <div className="flex-1 relative"><input type="number" value={set.reps} placeholder={set.target?.reps ? `${set.target.reps}` : 'reps'} onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)} className="w-full bg-gray-900 rounded-lg h-10 text-center text-white font-bold border border-gray-600 outline-none"/></div>
                <button onClick={() => toggleSetComplete(exIdx, setIdx)} className={`w-8 h-10 rounded-lg flex items-center justify-center transition-colors ${set.done ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-400'}`}><Check size={16} /></button>
                <button onClick={() => removeSet(exIdx, setIdx)} className="w-8 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 hover:text-red-400"><X size={14}/></button>
              </div>
            ))}
            <button onClick={() => addSet(exIdx)} className="w-full py-2 text-xs text-gray-500 font-bold hover:text-blue-400 hover:bg-gray-700/50 rounded flex items-center justify-center gap-1"><Plus size={14}/> ADD SET</button>
          </div>
        </div>
      ))}
      <ExerciseSearchInput onAdd={addExerciseToSession} />
      <button onClick={finishWorkout} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 text-lg uppercase tracking-wider">FINISH WORKOUT</button>
      <div className="h-8"></div> 
    </div>
  );
};

// --- EAT TAB ---
const EatTab = ({ savedMeals, dailyLog, mealEditMode, setMealEditMode, setShowAddMealModal, setShowGhostChefModal, logMeal, deleteSavedMeal, deleteLogItem, getMealMacros, dragItem, dragOverItem, handleSortMeals, requestConfirm, userTargets, dailyStats }) => {
  return (
    <div className="pb-24 p-4 space-y-6 animate-in fade-in">
      <div className="flex justify-between items-end">
         <h2 className="text-gray-400 font-bold text-sm tracking-widest uppercase flex items-center gap-2"><Flame size={14} /> Meal Bank</h2>
         <div className="flex gap-2">
           <button onClick={() => setShowGhostChefModal(true)} className="text-xs bg-blue-600/20 border border-blue-500/50 text-blue-400 font-bold px-3 py-1 rounded-lg flex items-center gap-1"><ChefHat size={14}/> GHOST CHEF</button>
           <button onClick={() => setShowAddMealModal(true)} className="text-xs text-blue-400 font-bold flex items-center gap-1">+ NEW MEAL</button>
         </div>
      </div>
      {savedMeals.length === 0 ? <p className="text-gray-600 text-center py-8">No meals saved yet. Add one!</p> : savedMeals.map((meal, i) => {
        const macros = getMealMacros(meal);
        return (
          <div 
            key={meal.id} 
            className={`bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-sm group`} 
            draggable={mealEditMode} 
            onDragStart={() => dragItem.current = i} 
            onDragEnter={() => dragOverItem.current = i} 
            onDragEnd={handleSortMeals}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                {mealEditMode && (<div className="mr-2 cursor-move text-gray-600 hover:text-white"><GripVertical size={20}/></div>)}
                <div><h3 className="text-white font-bold text-lg">{meal.name}</h3><div className="flex gap-3 text-xs font-mono mt-1"><span className="text-blue-300">{macros.cal} kcal</span><span className="text-red-300">{macros.p}p</span><span className="text-orange-300">{macros.c}c</span><span className="text-yellow-300">{macros.f}f</span></div></div>
              </div>
              <div className="flex gap-2">
                {mealEditMode ? <button onClick={(e) => {e.stopPropagation(); requestConfirm("Delete this meal?", () => deleteSavedMeal(meal.id))}} className="bg-red-500/20 text-red-400 p-2 rounded-full hover:bg-red-500"><Trash2 size={20} /></button> : <button onClick={(e) => {e.stopPropagation(); logMeal(meal)}} className="bg-gray-700 hover:bg-green-600 text-white p-2 rounded-full"><Plus size={20} /></button>}
              </div>
            </div>
          </div>
      );
      })}
      <div className="flex justify-end"><button onClick={() => setMealEditMode(!mealEditMode)} className={`text-xs font-bold ${mealEditMode ? 'text-green-400' : 'text-gray-500'}`}>{mealEditMode ? 'DONE EDITING' : 'EDIT MEALS'}</button></div>
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-gray-400 font-bold text-sm tracking-widest uppercase">Today's Log</h2>
          <span className="text-xs text-gray-500 font-bold">Goal: {userTargets.cal} kcal</span>
        </div>
        {dailyLog.map((log, i) => (
            <div key={i} className="flex justify-between items-center bg-gray-900 p-3 rounded-lg border border-gray-800 group mb-2">
              <div><span className="text-white font-medium block">{log.name}</span><div className="flex gap-2 text-[10px] text-gray-500 font-mono"><span className="text-blue-400">{log.totalCals}cal</span><span>{log.totalP}p</span></div></div>
              <button onClick={() => deleteLogItem(i)} className="text-gray-600 hover:text-red-400"><Trash2 size={16}/></button>
            </div>
        ))}
      </div>
    </div>
  );
};

// --- STATS TAB ---
const StatsTab = ({ statsHistory, setLogDate, setShowDailyCheckin, workoutHistory, apiKey, setToast, userTargets, phase }) => {
  const [localStat, setLocalStat] = useState('weight');
  const [timeRange, setTimeRange] = useState('1W');
  const [focusedStatEntry, setFocusedStatEntry] = useState(null);
  const [ghostReport, setGhostReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  
  const filteredHistory = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (timeRange === '1W' ? 7 : timeRange === '1M' ? 30 : 90));
    return statsHistory.filter(d => new Date(d.date) >= cutoff);
  }, [statsHistory, timeRange]);

  const generateGhostReport = async () => {
    if (!apiKey) { setToast("API Key Missing"); return; }
    setLoadingReport(true);
    try {
      const prompt = `Analyze this bodybuilding data for someone currently ${phase}ing with a target of ${userTargets.cal} calories. 
      DATA: ${JSON.stringify({
        logs: statsHistory.slice(-7), 
        workouts: workoutHistory.slice(-3),
        targets: userTargets
      })}.
      
      Calculations to perform internally:
      1. Check weekly weight trend. Is it > +0.5kg (Dirty Bulk) or < -0.7kg (Aggressive Cut)?
      2. Compare avg daily calories to target.
      3. Check sleep/cardio vs lifting volume.

      Output exactly 3 bullet points:
      1. Observation on adherence/trends.
      2. Critique of training/recovery/cardio balance.
      3. Actionable advice for next week.
      Keep under 100 words total.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const resultText = data.candidates[0].content.parts[0].text;
      setGhostReport(resultText);
    } catch (e) { setToast("Ghost Error: " + e.message); }
    setLoadingReport(false);
  };

  const maxVal = Math.max(...filteredHistory.map(d => d[localStat] || 0), 1);
  
  return (
    <div className="pb-24 p-4 space-y-6 animate-in fade-in">
       <div className="flex justify-between items-center"><h2 className="text-gray-400 font-bold text-sm tracking-widest uppercase">Analytics</h2><button onClick={() => {setLogDate(getLocalDate()); setShowDailyCheckin(true);}} className="bg-gray-800 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-500/30 flex items-center gap-2 transition-all"><Edit3 size={12}/> LOG ENTRY</button></div>
       <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 p-4 rounded-xl relative overflow-hidden">
          <div className="flex justify-between items-start mb-2"><h3 className="text-blue-300 font-black italic flex items-center gap-2"><Ghost size={16}/> GHOST REPORT</h3><button onClick={generateGhostReport} disabled={loadingReport} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg font-bold">{loadingReport ? <Loader2 size={12} className="animate-spin"/> : "ANALYZE"}</button></div>
          <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">{ghostReport || "Tap analyze for insights..."}</div>
       </div>
       <div className="space-y-2"><div className="flex gap-2 overflow-x-auto pb-1">{['Weight', 'Cals', 'Sleep', 'Stress', 'Water', 'Cardio', 'Steps'].map(stat => (<button key={stat} onClick={() => setLocalStat(stat.toLowerCase())} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border ${localStat === stat.toLowerCase() ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>{stat}</button>))}</div><div className="flex justify-center gap-4 text-xs font-bold text-gray-500">{['1W', '1M', '3M'].map(r => <button key={r} onClick={() => setTimeRange(r)} className={timeRange === r ? 'text-white underline' : ''}>{r}</button>)}</div></div>
       <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 min-h-[300px] relative">
          <div className="flex justify-between mb-6"><h3 className="text-white font-bold capitalize">{localStat} Trend</h3></div>
          <div className="absolute inset-0 top-16 bottom-8 left-4 right-4 flex items-end justify-between">
             {filteredHistory.length === 0 ? <p className="text-gray-500 text-center w-full self-center">No data yet.</p> : (
               <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={filteredHistory.map((d, i) => {
                   const x = (i / (filteredHistory.length - 1 || 1)) * 100;
                   const y = 100 - ((d[localStat] - 0) / (maxVal || 1)) * 80 - 10; // Simple scaling
                   return `${x},${y}`;
                 }).join(' ')} vectorEffect="non-scaling-stroke" />
                 {filteredHistory.map((d, i) => {
                   const x = (i / (filteredHistory.length - 1 || 1)) * 100;
                   const y = 100 - ((d[localStat] - 0) / (maxVal || 1)) * 80 - 10;
                   return <circle key={i} cx={x} cy={y} r="4" fill="#60a5fa" stroke="#3b82f6" strokeWidth="1" className="cursor-pointer hover:fill-white transition-all" onClick={() => setFocusedStatEntry(d)} />;
                 })}
               </svg>
             )}
          </div>
       </div>
       {focusedStatEntry && <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl text-center"><p className="text-gray-400 text-xs font-bold">{focusedStatEntry.date}</p><p className="text-2xl font-black text-white">{focusedStatEntry[localStat]} <span className="text-sm text-gray-500">{localStat}</span></p></div>}
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [activeTab, setActiveTab] = useState('train');
  const [phase, setPhase] = useStickyState('CUT', 'ghost_phase'); 
  const [showDailyCheckin, setShowDailyCheckin] = useState(false);
  const [showGhostPanel, setShowGhostPanel] = useState(false);
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false); 
  const [showGhostChefModal, setShowGhostChefModal] = useState(false); 
  const [showCardioModal, setShowCardioModal] = useState(false); 

  const [toastMsg, setToastMsg] = useState(null);
  const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: null });

  // DATA
  const [workoutEditMode, setWorkoutEditMode] = useState(false);
  const [mealEditMode, setMealEditMode] = useState(false);
  const [workoutSplits, setWorkoutSplits] = useStickyState(INITIAL_SPLITS, 'ghost_splits');
  const [savedMeals, setSavedMeals] = useStickyState(INITIAL_MEALS, 'ghost_meals');
  const [statsHistory, setStatsHistory] = useStickyState([], 'ghost_stats'); 
  const [workoutHistory, setWorkoutHistory] = useStickyState([], 'ghost_workouts'); 
  const [dailyLog, setDailyLog] = useStickyState([], 'ghost_daily_log'); 
  const [userTargets, setUserTargets] = useStickyState(INITIAL_TARGETS, 'ghost_targets'); 

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [logDate, setLogDate] = useState(getLocalDate());
  const [dailyStatsInput, setDailyStatsInput] = useState({ weight: '', steps: '', water: '', stress: 3, fatigue: 3, sleepHours: '', sleepQuality: 3, cardio: '', activity: 3 });

  // Auto-Checkin Logic
  useEffect(() => {
    const today = getLocalDate();
    if (!statsHistory.some(entry => entry.date === today)) {
      setLogDate(today);
      setShowDailyCheckin(true);
    }
  }, []); 

  const requestConfirm = (msg, action) => {
    setConfirmState({ isOpen: true, message: msg, onConfirm: () => { action(); setConfirmState({ isOpen: false, message: '', onConfirm: null }); } });
  };

  // Handlers
  const handleSortSplits = () => { let _s = [...workoutSplits]; const d = _s.splice(dragItem.current, 1)[0]; _s.splice(dragOverItem.current, 0, d); dragItem.current=null; dragOverItem.current=null; setWorkoutSplits(_s); };
  const handleSortMeals = () => { let _m = [...savedMeals]; const d = _m.splice(dragItem.current, 1)[0]; _m.splice(dragOverItem.current, 0, d); dragItem.current=null; dragOverItem.current=null; setSavedMeals(_m); };
  const addSplit = () => { const n = prompt("Name:"); if(n) setWorkoutSplits([...workoutSplits, {id:`s-${Date.now()}`,name:n,exercises:[]}]); };
  const deleteSplit = (id) => { requestConfirm("Delete this split?", () => setWorkoutSplits(workoutSplits.filter(s=>s.id!==id))); };
  const renameSplit = (id, old) => { const n=prompt("Name:",old); if(n) setWorkoutSplits(workoutSplits.map(s=>s.id===id?{...s,name:n}:s)); };
  const deleteSavedMeal = (id) => setSavedMeals(savedMeals.filter(m=>m.id!==id));
  const logMeal = (meal) => { const m=meal.ingredients.reduce((a,i)=>({cal:a.cal+i.cal,p:a.p+i.p,c:a.c+i.c,f:a.f+i.f}),{cal:0,p:0,c:0,f:0}); setDailyLog([...dailyLog, {name:meal.name, totalCals:m.cal, totalP:m.p, totalC:m.c, totalF:m.f}]); setToastMsg("Meal Logged"); };
  const deleteLogItem = (i) => setDailyLog(dailyLog.filter((_,idx)=>idx!==i));
  const submitDailyLog = () => {
    const idx = statsHistory.findIndex(e => e.date === logDate);
    const entry = { 
      date: logDate, 
      weight: parseFloat(dailyStatsInput.weight)||0, 
      steps: parseFloat(dailyStatsInput.steps)||0, 
      water: parseFloat(dailyStatsInput.water)||0, 
      activity: parseInt(dailyStatsInput.activity)||3, 
      cals: dailyTotals.cal||0, 
      sleep: parseFloat(dailyStatsInput.sleepHours)||0, 
      stress: dailyStatsInput.stress, 
      fatigue: dailyStatsInput.fatigue 
    };
    if (idx >= 0) { const h = [...statsHistory]; h[idx] = { ...h[idx], ...entry }; setStatsHistory(h); }
    else setStatsHistory([...statsHistory, entry].sort((a,b) => new Date(a.date) - new Date(b.date)));
    setShowDailyCheckin(false);
    setToastMsg("Daily Log Saved");
  };
  const dailyTotals = dailyLog.reduce((acc, item) => ({ cal: acc.cal + item.totalCals, p: acc.p + item.totalP, c: acc.c + item.totalC, f: acc.f + item.totalF }), { cal: 0, p: 0, c: 0, f: 0 });

  const currentTargets = userTargets[phase] || INITIAL_TARGETS.CUT;

  return (
    <ErrorBoundary>
      <div className="bg-black min-h-screen text-gray-100 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden border-x border-gray-800">
        {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
        <ConfirmModal isOpen={confirmState.isOpen} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState({isOpen:false, message:'', onConfirm:null})} />
        
        <DailyCheckinModal isOpen={showDailyCheckin} onClose={()=>setShowDailyCheckin(false)} stats={dailyStatsInput} setStats={setDailyStatsInput} onSave={submitDailyLog} date={logDate} setDate={setLogDate}/>
        <AddMealModal isOpen={showAddMealModal} onClose={()=>setShowAddMealModal(false)} onSave={(m)=>setSavedMeals([...savedMeals, m])} apiKey={YOUR_GEMINI_API_KEY} setToast={setToastMsg}/>
        <TargetEditorModal 
          isOpen={showTargetModal} 
          onClose={()=>setShowTargetModal(false)} 
          activePhase={phase} 
          setActivePhase={setPhase}
          targets={userTargets} 
          setTargets={setUserTargets}
          onSave={(p, t) => { setUserTargets({...userTargets, [p]: t}); setShowTargetModal(false); setToastMsg("Targets Saved"); }}
          currentWeight={dailyStatsInput.weight}
          apiKey={YOUR_GEMINI_API_KEY}
          setToast={setToastMsg}
        />
        <GhostChefModal 
          isOpen={showGhostChefModal}
          onClose={()=>setShowGhostChefModal(false)}
          targets={currentTargets}
          currentTotals={dailyTotals}
          apiKey={YOUR_GEMINI_API_KEY}
          setToast={setToastMsg}
        />
        <CardioModal 
          isOpen={showCardioModal} 
          onClose={() => setShowCardioModal(false)} 
          onSave={(session) => {
             const log = { 
               date: getLocalDate(), 
               name: "Cardio", 
               type: 'cardio',
               exercises: [],
               cardioData: session
             };
             setWorkoutHistory([...workoutHistory, log]);
             setToastMsg("Cardio Logged");
          }}
        />
        <GhostAiPanel show={showGhostPanel} onClose={()=>setShowGhostPanel(false)}/>
        
        {!showGhostPanel && !showDailyCheckin && !showAddMealModal && !showTargetModal && !showGhostChefModal && !showCardioModal && <button onClick={()=>setShowGhostPanel(true)} className="fixed bottom-24 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg z-40"><Ghost size={24}/></button>}
        
        <div className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-20">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-black italic text-white">GHOST<span className="text-gray-500">LOG</span></h1>
            <button 
              onClick={()=>setShowTargetModal(true)}
              className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1 ${phase==='CUT'?'text-red-400 border-red-500/30': phase==='BULK' ? 'text-green-400 border-green-500/30' : 'text-blue-400 border-blue-500/30'}`}
            >
              {phase} <Settings size={12}/>
            </button>
          </div>
          {activeTab === 'train' && (
            <div className="grid grid-cols-4 gap-2 animate-in fade-in">
              <div className="bg-gray-800 p-2 rounded-lg text-center border border-gray-700"><TrendingUp size={16} className="mx-auto text-blue-400 mb-1"/><p className="text-[10px] text-gray-400">Weight</p><p className="text-white font-bold text-xs">{dailyStatsInput.weight || '-'}</p></div>
              <div className="bg-gray-800 p-2 rounded-lg text-center border border-gray-700"><Footprints size={16} className="mx-auto text-purple-400 mb-1"/><p className="text-[10px] text-gray-400">Steps</p><p className="text-white font-bold text-xs">{dailyStatsInput.steps > 1000 ? (dailyStatsInput.steps/1000).toFixed(1)+'k' : (dailyStatsInput.steps || '-')}</p></div>
              <div className="bg-gray-800 p-2 rounded-lg text-center border border-gray-700"><BrainCircuit size={16} className={`mx-auto mb-1 ${dailyStatsInput.stress > 3 ? 'text-red-400' : 'text-green-400'}`}/><p className="text-[10px] text-gray-400">Stress</p><p className="text-white font-bold text-xs">{dailyStatsInput.stress}/5</p></div>
              <div className="bg-gray-800 p-2 rounded-lg text-center border border-gray-700"><Battery size={16} className={`mx-auto mb-1 ${dailyStatsInput.fatigue > 3 ? 'text-red-400' : 'text-green-400'}`}/><p className="text-[10px] text-gray-400">Fatigue</p><p className="text-white font-bold text-xs">{dailyStatsInput.fatigue}/5</p></div>
            </div>
          )}
          {activeTab === 'eat' && (
            <div className="grid grid-cols-4 gap-2 animate-in fade-in">
              <div className={`bg-gray-800 p-2 rounded-lg text-center border ${dailyTotals.cal > currentTargets.cal ? 'border-red-500' : 'border-gray-700'}`}><Flame size={16} className="mx-auto text-blue-400 mb-1"/><p className="text-[10px] text-gray-400">Cals</p><p className="text-white font-bold text-xs">{dailyTotals.cal} / {currentTargets.cal}</p></div>
              <div className="bg-gray-800 p-2 rounded-lg text-center border border-gray-700"><Beef size={16} className="mx-auto text-red-400 mb-1"/><p className="text-[10px] text-gray-400">Prot</p><p className="text-white font-bold text-xs">{dailyTotals.p} / {currentTargets.p}</p></div>
              <div className="bg-gray-800 p-2 rounded-lg text-center border border-gray-700"><Wheat size={16} className="mx-auto text-orange-400 mb-1"/><p className="text-[10px] text-gray-400">Carb</p><p className="text-white font-bold text-xs">{dailyTotals.c} / {currentTargets.c}</p></div>
              <div className="bg-gray-800 p-2 rounded-lg text-center border border-gray-700"><Droplet size={16} className="mx-auto text-yellow-400 mb-1"/><p className="text-[10px] text-gray-400">Fat</p><p className="text-white font-bold text-xs">{dailyTotals.f} / {currentTargets.f}</p></div>
            </div>
          )}
          {activeTab === 'stats' && <div className="h-12 flex items-center justify-center"><p className="text-gray-500 text-xs uppercase tracking-widest font-bold">Analytics</p></div>}
        </div>

        {activeTab === 'train' && <TrainTab {...{ 
          workoutSplits, setWorkoutSplits, workoutHistory, setWorkoutHistory, workoutEditMode, setWorkoutEditMode, 
          addSplit, deleteSplit, renameSplit, handleSortSplits, dragItem, dragOverItem, phase, dailyStats: dailyStatsInput, 
          requestConfirm, setShowCardioModal 
        }} />}
        
        {activeTab === 'eat' && <EatTab {...{ 
          savedMeals, dailyLog, mealEditMode, setMealEditMode, setShowAddMealModal, setShowGhostChefModal, logMeal, deleteSavedMeal, deleteLogItem, getMealMacros: (m)=>m.ingredients.reduce((a,i)=>({cal:a.cal+i.cal,p:a.p+i.p,c:a.c+i.c,f:a.f+i.f}),{cal:0,p:0,c:0,f:0}), dragItem, dragOverItem, handleSortMeals,
          requestConfirm, userTargets: currentTargets, dailyStats: dailyStatsInput
        }} />}
        
        {activeTab === 'stats' && <StatsTab {...{ 
          statsHistory, setLogDate, setShowDailyCheckin, workoutHistory, apiKey: YOUR_GEMINI_API_KEY, setToast: setToastMsg,
          userTargets: currentTargets, phase 
        }} />}

        <div className="fixed bottom-0 w-full max-w-md bg-gray-900/90 backdrop-blur-lg border-t border-gray-800 p-2 pb-6 z-40">
          <div className="flex justify-around items-center">
            <button onClick={()=>setActiveTab('train')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab==='train'?'text-blue-400':'text-gray-500'}`}><Dumbbell size={24}/><span className="text-[10px] font-bold">LIFT</span></button>
            <button onClick={()=>setActiveTab('eat')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab==='eat'?'text-blue-400':'text-gray-500'}`}><Utensils size={24}/><span className="text-[10px] font-bold">EAT</span></button>
            <button onClick={()=>setActiveTab('stats')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab==='stats'?'text-blue-400':'text-gray-500'}`}><BarChart3 size={24}/><span className="text-[10px] font-bold">STATS</span></button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}