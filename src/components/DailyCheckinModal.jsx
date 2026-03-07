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
      <div className="bg-gray-900 w-full max-w-sm rounded-2xl p-6 border border-gray-800/50 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4 sticky top-0 bg-gray-900 z-10 pb-2">
          <div><h2 className="text-xl font-black tracking-tight text-white">DAILY LOG</h2><p className="text-[10px] text-gray-600 uppercase tracking-widest">Keep the streak.</p></div>
          <button onClick={onClose} className="text-[10px] font-bold text-gray-600 border border-gray-800/50 px-2 py-1 rounded-lg hover:text-white transition-colors">SKIP</button>
        </div>
        <div className="space-y-4">
           <div className="bg-black/30 p-3 rounded-xl border border-gray-800/50 flex justify-between items-center"><span className="text-gray-400 text-sm font-bold flex gap-2"><Calendar size={16}/> Date</span><input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-gray-800 text-white text-sm outline-none rounded-lg px-2 py-1"/></div>
           <div className="flex justify-between items-center"><div className="flex gap-2 text-gray-400 items-center text-sm"><Scale size={16}/> Weight</div><div className="flex gap-2 items-center"><input type="number" value={stats.weight} onChange={e => setStats({...stats, weight: e.target.value})} className="bg-black/50 w-20 p-2 rounded-xl text-center text-white font-bold border border-gray-800/50 outline-none"/><span className="text-[10px] text-gray-600">kg</span></div></div>
           <div className="flex justify-between items-center"><div className="flex gap-2 text-gray-400 items-center text-sm"><Footprints size={16}/> Steps</div><input type="number" value={stats.steps} onChange={e => setStats({...stats, steps: e.target.value})} className="bg-black/50 w-24 p-2 rounded-xl text-center text-white font-bold border border-gray-800/50 outline-none"/></div>
           <div className="flex justify-between items-center"><div className="flex gap-2 text-gray-400 items-center text-sm"><Droplets size={16}/> Water</div><div className="flex gap-2 items-center"><input type="number" value={stats.water} onChange={e => setStats({...stats, water: e.target.value})} className="bg-black/50 w-20 p-2 rounded-xl text-center text-white font-bold border border-gray-800/50 outline-none"/><span className="text-[10px] text-gray-600">L</span></div></div>
           <div><div className="flex justify-between text-xs text-gray-400 mb-2"><span className="capitalize flex gap-2 items-center"><Zap size={14}/> Activity Level</span><span className="font-bold accent-text">{getActivityLabel(stats.activity)}</span></div><input type="range" min="1" max="5" value={stats.activity} onChange={e => setStats({...stats, activity: parseInt(e.target.value)})} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer" style={{ accentColor: 'var(--accent)' }}/></div>
           <div className="flex justify-between items-center"><div className="flex items-center gap-2 text-gray-400 text-sm"><Moon size={16}/> Sleep</div><div className="flex items-center gap-2"><input type="number" step="0.5" value={stats.sleepHours} onChange={(e) => setStats({...stats, sleepHours: e.target.value})} className="bg-black/50 w-24 p-2 rounded-xl text-center font-bold text-white border border-gray-800/50 outline-none"/><span className="text-[10px] text-gray-600">hrs</span></div></div>
           {['sleepQuality', 'stress', 'fatigue'].map(k => (<div key={k}><div className="flex justify-between text-xs text-gray-400 mb-2"><span className="capitalize flex gap-2 items-center"><Activity size={14}/> {k.replace(/([A-Z])/g, ' $1')}</span><span className={`font-bold ${stats[k] > (k==='sleepQuality'?2:3) ? (k==='sleepQuality'?'text-green-400':'text-red-400') : (k==='sleepQuality'?'text-red-400':'text-green-400')}`}>{stats[k]}/5 - {k==='sleepQuality' ? getSleepLabel(stats[k]) : k==='stress' ? getStressLabel(stats[k]) : getFatigueLabel(stats[k])}</span></div><input type="range" min="1" max="5" value={stats[k]} onChange={e => setStats({...stats, [k]: parseInt(e.target.value)})} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer" style={{ accentColor: k==='sleepQuality'?'#22c55e':'#ef4444' }}/></div>))}
           <button onClick={onSave} className="w-full accent-bg hover:opacity-90 text-white font-bold py-3 rounded-xl mt-2 flex justify-center gap-2 transition-all active:scale-[0.98]"><Save size={18}/> SUBMIT</button>
        </div>
      </div>
    </div>
  );
};
