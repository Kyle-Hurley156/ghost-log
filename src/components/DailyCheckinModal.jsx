import React from 'react';
import { Scale, Footprints, Droplets, Zap, Moon, Activity, Calendar, Save } from 'lucide-react';

export const DailyCheckinModal = ({ isOpen, onClose, stats, setStats, onSave, date, setDate }) => {
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
           <div className="flex justify-between items-center"><div className="flex gap-2 text-gray-300 items-center"><Droplets size={18}/> Water</div><div className="flex gap-2 items-center"><input type="number" value={stats.water} onChange={e => setStats({...stats, water: e.target.value})} className="bg-gray-900 w-20 p-2 rounded text-center text-white font-bold border border-gray-700"/><span className="text-sm text-gray-500">L</span></div></div>
           <div><div className="flex justify-between text-xs text-gray-300 mb-2"><span className="capitalize flex gap-2 items-center"><Zap size={14}/> Activity Level</span><span className="font-bold text-blue-400">{getActivityLabel(stats.activity)}</span></div><input type="range" min="1" max="5" value={stats.activity} onChange={e => setStats({...stats, activity: parseInt(e.target.value)})} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"/></div>
           <div className="flex justify-between items-center"><div className="flex items-center gap-2 text-gray-300"><Moon size={18}/> Sleep Duration</div><div className="flex items-center gap-2"><input type="number" step="0.5" value={stats.sleepHours} onChange={(e) => setStats({...stats, sleepHours: e.target.value})} className="bg-gray-900 w-24 p-2 rounded text-center font-bold text-white border border-gray-700"/><span className="text-sm text-gray-500">hrs</span></div></div>
           {['sleepQuality', 'stress', 'fatigue'].map(k => (<div key={k}><div className="flex justify-between text-xs text-gray-300 mb-2"><span className="capitalize flex gap-2 items-center"><Activity size={14}/> {k.replace(/([A-Z])/g, ' $1')}</span><span className={`font-bold ${stats[k] > (k==='sleepQuality'?2:3) ? (k==='sleepQuality'?'text-green-400':'text-red-400') : (k==='sleepQuality'?'text-red-400':'text-green-400')}`}>{stats[k]}/5 - {k==='sleepQuality' ? getSleepLabel(stats[k]) : k==='stress' ? getStressLabel(stats[k]) : getFatigueLabel(stats[k])}</span></div><input type="range" min="1" max="5" value={stats[k]} onChange={e => setStats({...stats, [k]: parseInt(e.target.value)})} className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-${k==='sleepQuality'?'green':'red'}-500`}/></div>))}
           <button onClick={onSave} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl mt-2 flex justify-center gap-2"><Save size={20}/> SUBMIT</button>
        </div>
      </div>
    </div>
  );
};
