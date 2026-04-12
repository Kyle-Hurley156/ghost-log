import React, { useState, useMemo } from 'react';
import { Edit3, Loader2, Lock, Dumbbell, HeartPulse, Sparkles, Download, TrendingUp, Trophy, ChevronRight } from 'lucide-react';
import { API_URL } from '../constants';
import { getLocalDate } from '../helpers';

export const StatsTab = ({ statsHistory, setLogDate, setShowDailyCheckin, workoutHistory, setToast, userTargets, phase, aiCooldown, setAiCooldown, isPro, handlePremiumFeature, savedMeals, setShowWorkoutHistory }) => {
  const [localStat, setLocalStat] = useState('weight');
  const [timeRange, setTimeRange] = useState('1W');
  const [focusedStatEntry, setFocusedStatEntry] = useState(null);
  const [ghostReport, setGhostReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [selectedLift, setSelectedLift] = useState(null);

  const filteredHistory = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (timeRange === '1W' ? 7 : timeRange === '1M' ? 30 : 90));
    return statsHistory.filter(d => new Date(d.date) >= cutoff);
  }, [statsHistory, timeRange]);

  const recentActivity = useMemo(() => {
    return [...workoutHistory].reverse().slice(0, 5);
  }, [workoutHistory]);

  // Weekly stats
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().split('T')[0];
    const thisWeek = workoutHistory.filter(w => w.date >= weekStr);
    const strengthSessions = thisWeek.filter(w => w.type !== 'cardio');
    const cardioSessions = thisWeek.filter(w => w.type === 'cardio');
    let totalSets = 0, totalVolume = 0, prCount = 0;
    strengthSessions.forEach(s => {
      prCount += (s.prs?.length || 0);
      (s.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(set => {
          totalSets++;
          totalVolume += (parseFloat(set.weight) || 0) * (parseFloat(set.reps) || 0);
        });
      });
    });
    return { workouts: thisWeek.length, strength: strengthSessions.length, cardio: cardioSessions.length, sets: totalSets, volume: totalVolume, prs: prCount };
  }, [workoutHistory]);

  // Compute strength progress: best weight per exercise per session
  const strengthData = useMemo(() => {
    const exerciseMap = {};
    workoutHistory.forEach(session => {
      if (session.type === 'cardio' || !session.exercises) return;
      session.exercises.forEach(ex => {
        const maxW = Math.max(0, ...(ex.sets || []).map(s => parseFloat(s.weight) || 0));
        if (maxW > 0) {
          if (!exerciseMap[ex.name]) exerciseMap[ex.name] = [];
          exerciseMap[ex.name].push({ date: session.date, weight: maxW });
        }
      });
    });
    // Sort each exercise's data by date and return top 8 most-trained exercises
    const entries = Object.entries(exerciseMap)
      .map(([name, data]) => ({ name, data: data.sort((a, b) => a.date.localeCompare(b.date)) }))
      .filter(e => e.data.length >= 2)
      .sort((a, b) => b.data.length - a.data.length)
      .slice(0, 8);
    return entries;
  }, [workoutHistory]);

  // Auto-select first lift when switching to strength view
  const currentLiftData = useMemo(() => {
    if (localStat !== 'strength') return null;
    const lift = strengthData.find(e => e.name === selectedLift) || strengthData[0];
    if (!lift) return null;
    // Apply time range filter
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (timeRange === '1W' ? 7 : timeRange === '1M' ? 30 : 90));
    return { name: lift.name, data: lift.data.filter(d => new Date(d.date) >= cutoff) };
  }, [localStat, selectedLift, strengthData, timeRange]);

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

  // --- CSV EXPORT ---
  const exportData = async () => {
    // Stats CSV
    const statsHeader = 'Date,Weight,Calories,Steps,Water,Sleep,Stress,Fatigue,Activity,Cardio Min,Cardio Cal\n';
    const statsRows = [...statsHistory].sort((a,b) => a.date.localeCompare(b.date)).map(d =>
      `${d.date},${d.weight||''},${d.cals||''},${d.steps||''},${d.water||''},${d.sleep||''},${d.stress||''},${d.fatigue||''},${d.activity||''},${d.cardio||''},${d.cardioCalories||''}`
    ).join('\n');

    // Workout CSV
    const workoutHeader = '\n\nDate,Workout,Type,Exercise,Set,Weight,Reps\n';
    const workoutRows = workoutHistory.map(w => {
      if (w.type === 'cardio') return `${w.date},${w.name},cardio,,,${w.cardioData?.duration||''}min,${w.cardioData?.calories||''}cal`;
      return (w.exercises || []).map(ex =>
        (ex.sets || []).map((s, si) => `${w.date},${w.name},weights,${ex.name},${si+1},${s.weight||''},${s.reps||''}`).join('\n')
      ).join('\n');
    }).join('\n');

    const csv = statsHeader + statsRows + workoutHeader + workoutRows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    // Try native share (mobile), fall back to download
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([csv], `ghostlog-export-${getLocalDate()}.csv`, { type: 'text/csv' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'GhostLog Export' });
          setToast('Export shared');
          return;
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('Share failed, downloading', e);
      }
    }

    // Fallback: download
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghostlog-export-${getLocalDate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast('CSV downloaded');
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
       <div className="flex justify-between items-center mb-4">
         <h2 className="text-gray-500 font-bold text-[10px] tracking-[0.2em] uppercase">Analytics</h2>
         <div className="flex gap-2">
           <button onClick={() => handlePremiumFeature(exportData)} className="bg-gray-800/50 text-gray-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-700/50 flex items-center gap-1 transition-all active:scale-95 hover:text-white">
             <Download size={12}/> EXPORT {!isPro && <Lock size={9}/>}
           </button>
           <button onClick={() => {setLogDate(getLocalDate()); setShowDailyCheckin(true);}} className="accent-bg-dim accent-text text-xs font-bold px-3 py-1.5 rounded-lg accent-border-dim border flex items-center gap-2 transition-all active:scale-95">
             <Edit3 size={12}/> LOG ENTRY
           </button>
         </div>
       </div>

       {/* Weekly Summary */}
       <div className="bg-gray-900/50 border border-gray-800/50 p-4 rounded-xl mb-6">
         <h3 className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-3">This Week</h3>
         <div className="grid grid-cols-4 gap-2">
           <div className="text-center"><p className="text-xl font-black text-white">{weeklyStats.workouts}</p><p className="text-[9px] text-gray-600 uppercase font-bold">Sessions</p></div>
           <div className="text-center"><p className="text-xl font-black text-white">{weeklyStats.sets}</p><p className="text-[9px] text-gray-600 uppercase font-bold">Sets</p></div>
           <div className="text-center"><p className="text-xl font-black text-white">{weeklyStats.volume > 0 ? (weeklyStats.volume / 1000).toFixed(1) : '0'}</p><p className="text-[9px] text-gray-600 uppercase font-bold">Vol (t)</p></div>
           <div className="text-center"><p className="text-xl font-black text-yellow-400">{weeklyStats.prs}</p><p className="text-[9px] text-gray-600 uppercase font-bold flex items-center justify-center gap-0.5"><Trophy size={8} className="text-yellow-400"/>PRs</p></div>
         </div>
       </div>

       {/* Ghost Report */}
       <div className="accent-bg-dim accent-border-dim border p-4 rounded-xl relative overflow-hidden mb-6">
          <div className="flex justify-between items-start mb-2">
            <h3 className="accent-text font-black text-sm flex items-center gap-2"><Sparkles size={14}/> GHOST REPORT</h3>
            <button onClick={() => handlePremiumFeature(generateGhostReport)} disabled={loadingReport || aiCooldown > 0} className="text-xs accent-bg disabled:bg-gray-700 disabled:text-gray-400 text-white px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 active:scale-95">
              {loadingReport ? <Loader2 size={12} className="animate-spin"/> : aiCooldown > 0 ? `RESTING (${aiCooldown}s)` : <>ANALYZE {!isPro && <Lock size={10}/>}</>}
            </button>
          </div>
          <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{ghostReport || <span className="text-gray-600 text-xs">Tap ANALYZE to get a personalized AI critique of your training, nutrition, and recovery from the past week.</span>}</div>
       </div>

       {/* Stat pills + time range */}
       <div className="space-y-2 mb-4">
         <div className="flex gap-1.5 overflow-x-auto pb-1">
           {['Weight', 'Energy', 'Sleep', 'Stress', 'Water', 'Steps', 'Cardio', 'Strength'].map(stat => (
             <button key={stat} onClick={() => {setLocalStat(stat === 'Energy' ? 'cals' : stat.toLowerCase()); setFocusedStatEntry(null); if (stat === 'Strength' && strengthData.length > 0 && !selectedLift) setSelectedLift(strengthData[0].name);}}
               className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all ${localStat === (stat === 'Energy' ? 'cals' : stat.toLowerCase()) ? 'accent-bg text-white border-transparent' : 'bg-gray-900/50 text-gray-500 border-gray-800/50'}`}>
               {stat === 'Strength' && <TrendingUp size={10} className="inline mr-1"/>}{stat}
             </button>
           ))}
         </div>
         <div className="flex justify-center gap-4 text-[10px] font-bold text-gray-600">
           {['1W', '1M', '3M'].map(r => <button key={r} onClick={() => setTimeRange(r)} className={`transition-colors ${timeRange === r ? 'text-white' : ''}`}>{r}</button>)}
         </div>
       </div>

       {/* Lift selector for strength view */}
       {localStat === 'strength' && strengthData.length > 0 && (
         <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2">
           {strengthData.map(ex => (
             <button key={ex.name} onClick={() => setSelectedLift(ex.name)}
               className={`px-2.5 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap border transition-all ${selectedLift === ex.name ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-gray-900/50 text-gray-600 border-gray-800/50'}`}>
               {ex.name}
             </button>
           ))}
         </div>
       )}

       {/* Chart */}
       <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800/50 min-h-[200px] relative mb-8">
          <div className="flex justify-between mb-6"><h3 className="text-white font-bold text-sm capitalize">{localStat === 'cals' ? 'Energy Intake' : localStat === 'strength' ? (currentLiftData?.name || 'Strength') + ' PR' : localStat} Trend</h3></div>
          <div className="absolute inset-0 top-16 bottom-8 left-4 right-4 flex items-end justify-between">
             {localStat === 'strength' ? (
               !currentLiftData || currentLiftData.data.length === 0 ? (
                 <div className="text-center w-full self-center">
                   <TrendingUp size={20} className="mx-auto mb-2 text-gray-700"/>
                   <p className="text-gray-600 text-xs">{strengthData.length === 0 ? 'Complete 2+ workouts with the same exercise to see trends' : 'No data in this time range'}</p>
                 </div>
               ) : (() => {
                 const liftData = currentLiftData.data;
                 const liftMax = Math.max(...liftData.map(d => d.weight));
                 const liftMin = Math.min(...liftData.map(d => d.weight));
                 const liftRange = liftMax - liftMin || 1;
                 const liftPoints = liftData.map((d, i) => {
                   const x = (i / (liftData.length - 1 || 1)) * 100;
                   const y = 100 - ((d.weight - liftMin) / liftRange) * 80 - 10;
                   return `${x},${y}`;
                 }).join(' ');
                 return (
                   <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                     <polyline fill="none" stroke="#eab308" strokeWidth="2" points={liftPoints} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
                     {liftData.map((d, i) => {
                       const x = (i / (liftData.length - 1 || 1)) * 100;
                       const y = 100 - ((d.weight - liftMin) / liftRange) * 80 - 10;
                       return <circle key={i} cx={x} cy={y} r="6" fill="#eab308" stroke="black" strokeWidth="2" className="cursor-pointer" onClick={() => setFocusedStatEntry({ date: d.date, liftWeight: d.weight, liftName: currentLiftData.name })} />;
                     })}
                   </svg>
                 );
               })()
             ) : filteredHistory.length === 0 ? (
               <div className="text-center w-full self-center">
                 <Edit3 size={20} className="mx-auto mb-2 text-gray-700"/>
                 <p className="text-gray-600 text-xs">No data yet</p>
                 <p className="text-gray-700 text-[10px] mt-0.5">Tap LOG ENTRY to start tracking.</p>
               </div>
             ) : (
               <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={polylinePoints} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
                 {filteredHistory.map((d, i) => {
                    const val = localStat === 'cardio' ? (d.cardioCalories || 0) : (d[localStat] || 0);
                    const x = (i / (filteredHistory.length - 1 || 1)) * 100;
                    const y = 100 - ((val - minVal) / (range || 1)) * 80 - 10;
                    return <circle key={i} cx={x} cy={y} r="6" fill="var(--accent)" stroke="black" strokeWidth="2" className="cursor-pointer" onClick={() => setFocusedStatEntry(d)} />;
                 })}
               </svg>
             )}
          </div>
          {focusedStatEntry && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-950 border border-gray-700 p-4 rounded-xl shadow-2xl text-center z-20 animate-in fade-in zoom-in-95 w-44">
               <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">{focusedStatEntry.date}</p>
               {focusedStatEntry.liftWeight ? (
                 <><p className="text-2xl font-black text-white">{focusedStatEntry.liftWeight} <span className="text-xs text-yellow-400 font-normal">kg</span></p><p className="text-[10px] text-gray-500 font-medium">{focusedStatEntry.liftName}</p></>
               ) : localStat === 'cardio' ? (
                 <><p className="text-xl font-black text-white">{focusedStatEntry.cardioCalories || 0} <span className="text-xs text-orange-400 font-normal">kcal</span></p><p className="text-xs text-gray-500 font-bold">{focusedStatEntry.cardio || 0} min</p></>
               ) : (
                 <p className="text-2xl font-black text-white">{focusedStatEntry[localStat] || 0} <span className="text-xs accent-text font-normal">{localStat === 'cals' ? 'kcal' : localStat}</span></p>
               )}
               <button onClick={() => setFocusedStatEntry(null)} className="mt-2 text-[10px] text-gray-600 underline">CLOSE</button>
            </div>
          )}
       </div>

       {/* Recent Activity */}
       <div className="pb-10">
         <div className="flex justify-between items-center mb-3">
           <h3 className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.2em]">Recent Activity</h3>
           {workoutHistory.length > 5 && setShowWorkoutHistory && (
             <button onClick={() => setShowWorkoutHistory(true)} className="text-[10px] accent-text font-bold flex items-center gap-0.5 transition-all active:scale-95">
               VIEW ALL <ChevronRight size={10}/>
             </button>
           )}
         </div>
         {recentActivity.length === 0 ? (
           <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800/50 text-center">
             <Dumbbell size={24} className="mx-auto mb-2 text-gray-700"/>
             <p className="text-gray-500 text-sm">No workouts yet</p>
             <p className="text-gray-700 text-xs mt-1">Complete a workout in LIFT to see your activity here.</p>
           </div>
         ) : (
           <div className="space-y-2">
             {recentActivity.map((session, i) => (
               <div key={i} className="bg-gray-900/50 p-3 rounded-xl border border-gray-800/50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {session.type === 'cardio' ? <HeartPulse size={16} className="text-red-400"/> : <Dumbbell size={16} className="accent-text"/>}
                    <div><p className="text-white font-bold text-sm">{session.name}</p><p className="text-gray-600 text-[10px]">{session.date}</p></div>
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
