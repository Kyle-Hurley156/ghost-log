import React, { useState, useMemo } from 'react';
import { Edit3, Ghost, Loader2, Lock, Dumbbell, HeartPulse } from 'lucide-react';
import { API_URL } from '../constants';
import { getLocalDate } from '../helpers';

export const StatsTab = ({ statsHistory, setLogDate, setShowDailyCheckin, workoutHistory, setToast, userTargets, phase, aiCooldown, setAiCooldown, isPro, handlePremiumFeature }) => {
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

  const recentActivity = useMemo(() => {
    return [...workoutHistory].reverse().slice(0, 5);
  }, [workoutHistory]);

  const generateGhostReport = async () => {
    if (aiCooldown > 0) { setToast(`Ghost is resting for ${aiCooldown}s`); return; }
    setLoadingReport(true);
    try {
      const prompt = `Analyze this bodybuilding data for someone currently ${phase}ing with a target of ${userTargets.cal} calories.
      DATA: ${JSON.stringify({ logs: statsHistory.slice(-7), workouts: workoutHistory.slice(-5), targets: userTargets })}.
      Output exactly 3 bullet points: 1. Observation on adherence/trends. 2. Critique of training/recovery/cardio balance. 3. Actionable advice for next week. Keep under 100 words total.`;

      const response = await fetch(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, isImage: false, imageData: null })
      });
      const data = await response.json();
      if (!response.ok || !data.candidates || !data.candidates[0]) throw new Error(data.error?.message || "No AI response");

      setGhostReport(data.candidates[0].content.parts[0].text);
      setAiCooldown(10);
    } catch (e) {
      setToast("Error: " + e.message);
      setAiCooldown(5);
    }
    setLoadingReport(false);
  };

  const maxVal = Math.max(...filteredHistory.map(d => localStat === 'cardio' ? (d.cardioCalories || 0) : (d[localStat] || 0)), 1);
  const minVal = Math.min(...filteredHistory.map(d => localStat === 'cardio' ? (d.cardioCalories || 0) : (d[localStat] || 0)), 0);
  const range = maxVal - minVal || 1;

  const polylinePoints = filteredHistory.map((d, i) => {
    const val = localStat === 'cardio' ? (d.cardioCalories || 0) : (d[localStat] || 0);
    const x = (i / (filteredHistory.length - 1 || 1)) * 100;
    const y = 100 - ((val - minVal) / (range || 1)) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="animate-in fade-in">
       <div className="flex justify-between items-center mb-4"><h2 className="text-gray-400 font-bold text-sm tracking-widest uppercase">Analytics</h2><button onClick={() => {setLogDate(getLocalDate()); setShowDailyCheckin(true);}} className="bg-gray-800 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-500/30 flex items-center gap-2 transition-all"><Edit3 size={12}/> LOG ENTRY</button></div>

       <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 p-4 rounded-xl relative overflow-hidden mb-6">
          <div className="flex justify-between items-start mb-2"><h3 className="text-blue-300 font-black italic flex items-center gap-2"><Ghost size={16}/> GHOST REPORT</h3>
            <button onClick={() => handlePremiumFeature(generateGhostReport)} disabled={loadingReport || aiCooldown > 0} className="text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 text-white px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1">
              {loadingReport ? <Loader2 size={12} className="animate-spin"/> : aiCooldown > 0 ? `RESTING (${aiCooldown}s)` : <>ANALYZE {!isPro && <Lock size={10}/>}</>}
            </button>
          </div>
          <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">{ghostReport || "Tap analyze for insights..."}</div>
       </div>

       <div className="space-y-2 mb-4"><div className="flex gap-2 overflow-x-auto pb-1">{['Weight', 'Energy', 'Sleep', 'Stress', 'Water', 'Steps', 'Cardio'].map(stat => (<button key={stat} onClick={() => {setLocalStat(stat === 'Energy' ? 'cals' : stat.toLowerCase()); setFocusedStatEntry(null);}} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border ${localStat === (stat === 'Energy' ? 'cals' : stat.toLowerCase()) ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>{stat}</button>))}</div><div className="flex justify-center gap-4 text-xs font-bold text-gray-500">{['1W', '1M', '3M'].map(r => <button key={r} onClick={() => setTimeRange(r)} className={timeRange === r ? 'text-white underline' : ''}>{r}</button>)}</div></div>

       <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 min-h-[200px] relative mb-8">
          <div className="flex justify-between mb-6"><h3 className="text-white font-bold capitalize">{localStat === 'cals' ? 'Energy Intake' : localStat} Trend</h3></div>
          <div className="absolute inset-0 top-16 bottom-8 left-4 right-4 flex items-end justify-between">
             {filteredHistory.length === 0 ? <p className="text-gray-500 text-center w-full self-center">No data yet.</p> : (
               <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <polyline fill="none" stroke={localStat === 'cardio' ? '#f97316' : '#3b82f6'} strokeWidth="2" points={polylinePoints} vectorEffect="non-scaling-stroke" />
                 {filteredHistory.map((d, i) => {
                    const val = localStat === 'cardio' ? (d.cardioCalories || 0) : (d[localStat] || 0);
                    const x = (i / (filteredHistory.length - 1 || 1)) * 100;
                    const y = 100 - ((val - minVal) / (range || 1)) * 80 - 10;
                    return <circle key={i} cx={x} cy={y} r="8" fill={localStat === 'cardio' ? '#f97316' : '#60a5fa'} stroke="white" strokeWidth="2" className="cursor-pointer hover:scale-125 transition-all" onClick={() => setFocusedStatEntry(d)} />;
                 })}
               </svg>
             )}
          </div>
          {focusedStatEntry && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-white/20 p-4 rounded-xl shadow-2xl text-center z-20 animate-in fade-in zoom-in-95 w-40">
               <p className="text-xs text-gray-400 font-bold uppercase mb-1">{focusedStatEntry.date}</p>
               {localStat === 'cardio' ? (
                 <><p className="text-xl font-black text-white">{focusedStatEntry.cardioCalories || 0} <span className="text-xs text-orange-400 font-normal">kcal</span></p><p className="text-xs text-gray-500 font-bold">{focusedStatEntry.cardio || 0} min</p></>
               ) : (
                 <p className="text-2xl font-black text-white">{focusedStatEntry[localStat] || 0} <span className="text-xs text-blue-400 font-normal">{localStat === 'cals' ? 'kcal' : localStat}</span></p>
               )}
               <button onClick={() => setFocusedStatEntry(null)} className="mt-2 text-[10px] text-gray-500 underline">CLOSE</button>
            </div>
          )}
       </div>

       <div className="pb-10">
         <h3 className="text-gray-400 font-bold text-xs uppercase mb-2">Recent Activity</h3>
         {recentActivity.length === 0 ? <p className="text-gray-600 text-sm">No workouts yet.</p> : (
           <div className="space-y-2">
             {recentActivity.map((session, i) => (
               <div key={i} className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {session.type === 'cardio' ? <HeartPulse size={16} className="text-red-400"/> : <Dumbbell size={16} className="text-blue-400"/>}
                    <div><p className="text-white font-bold text-sm">{session.name}</p><p className="text-gray-500 text-xs">{session.date}</p></div>
                  </div>
                  {session.type === 'cardio' && session.cardioData ? (
                    <div className="text-right"><p className="text-white text-xs font-bold">{session.cardioData.duration} min</p><p className="text-orange-400 text-xs">{session.cardioData.calories} cal</p></div>
                  ) : (
                    <div className="text-right"><p className="text-white text-xs font-bold">{session.exercises?.length || 0} Exercises</p></div>
                  )}
               </div>
             ))}
           </div>
         )}
       </div>
    </div>
  );
};
