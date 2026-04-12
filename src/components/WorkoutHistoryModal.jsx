import React, { useState, useMemo } from 'react';
import { X, Dumbbell, HeartPulse, ChevronDown, ChevronUp, Trophy } from 'lucide-react';

export const WorkoutHistoryModal = ({ isOpen, onClose, workoutHistory }) => {
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [filter, setFilter] = useState('all'); // all, strength, cardio

  const sorted = useMemo(() => {
    let list = [...workoutHistory].reverse();
    if (filter === 'strength') list = list.filter(w => w.type !== 'cardio');
    if (filter === 'cardio') list = list.filter(w => w.type === 'cardio');
    return list;
  }, [workoutHistory, filter]);

  // Group by date
  const grouped = useMemo(() => {
    const groups = {};
    sorted.forEach((w, i) => {
      const d = w.date || 'Unknown';
      if (!groups[d]) groups[d] = [];
      groups[d].push({ ...w, _idx: i });
    });
    return groups;
  }, [sorted]);

  if (!isOpen) return null;

  const totalVolume = (exercises) => {
    let vol = 0;
    (exercises || []).forEach(ex => {
      (ex.sets || []).forEach(s => {
        vol += (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0);
      });
    });
    return vol;
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto animate-in fade-in">
      <div className="safe-area-top pt-14 pb-32 px-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white font-black text-xl">Workout History</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-gray-900 text-gray-400 hover:text-white"><X size={18}/></button>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-6">
          {[['all', 'All'], ['strength', 'Strength'], ['cardio', 'Cardio']].map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${filter === key ? 'accent-bg text-white border-transparent' : 'bg-gray-900/50 text-gray-500 border-gray-800/50'}`}>
              {label}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-gray-600 font-bold self-center">{sorted.length} workouts</span>
        </div>

        {sorted.length === 0 ? (
          <div className="bg-gray-900/50 rounded-xl p-8 border border-gray-800/50 text-center">
            <Dumbbell size={28} className="mx-auto mb-3 text-gray-700"/>
            <p className="text-gray-400 text-sm">No workouts yet</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, sessions]) => (
            <div key={date} className="mb-4">
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] mb-2">{date}</p>
              {sessions.map((session) => {
                const isExpanded = expandedIdx === session._idx;
                const vol = session.type !== 'cardio' ? totalVolume(session.exercises) : 0;
                return (
                  <div key={session._idx} className="bg-gray-900/50 rounded-xl border border-gray-800/50 mb-2 overflow-hidden">
                    <button onClick={() => setExpandedIdx(isExpanded ? null : session._idx)} className="w-full p-4 flex justify-between items-center text-left">
                      <div className="flex items-center gap-3">
                        {session.type === 'cardio' ? <HeartPulse size={16} className="text-red-400"/> : <Dumbbell size={16} className="accent-text"/>}
                        <div>
                          <p className="text-white font-bold text-sm">{session.name}</p>
                          <p className="text-gray-600 text-[10px]">
                            {session.type === 'cardio'
                              ? `${session.cardioData?.duration || 0} min / ${session.cardioData?.calories || 0} cal`
                              : `${session.exercises?.length || 0} exercises${vol > 0 ? ` / ${(vol/1000).toFixed(1)}t volume` : ''}`
                            }
                          </p>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={14} className="text-gray-600"/> : <ChevronDown size={14} className="text-gray-600"/>}
                    </button>
                    {isExpanded && session.type !== 'cardio' && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-800/30 pt-3">
                        {(session.exercises || []).map((ex, ei) => (
                          <div key={ei}>
                            <p className="text-xs font-bold text-gray-300 mb-1.5 flex items-center gap-1.5">
                              {ex.name}
                              {session.prs?.includes(ex.name) && <Trophy size={10} className="text-yellow-400"/>}
                            </p>
                            <div className="space-y-1">
                              {(ex.sets || []).map((s, si) => (
                                <div key={si} className="flex gap-4 text-[10px] text-gray-500 font-mono pl-2">
                                  <span className="text-gray-700 w-4">S{si+1}</span>
                                  <span className="text-white">{s.weight || '-'} kg</span>
                                  <span className="text-gray-400">x {s.reps || '-'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {session.note && (
                          <div className="mt-3 pt-2 border-t border-gray-800/20">
                            <p className="text-[10px] text-gray-500 italic">{session.note}</p>
                          </div>
                        )}
                        {session.duration > 0 && (
                          <p className="text-[9px] text-gray-700 mt-2">{Math.floor(session.duration / 60)}m {session.duration % 60}s</p>
                        )}
                      </div>
                    )}
                    {isExpanded && session.type === 'cardio' && session.cardioData && (
                      <div className="px-4 pb-4 border-t border-gray-800/30 pt-3">
                        <div className="flex gap-6 text-xs">
                          <div><span className="text-gray-600">Duration</span> <span className="text-white font-bold ml-1">{session.cardioData.duration} min</span></div>
                          <div><span className="text-gray-600">Calories</span> <span className="text-orange-400 font-bold ml-1">{session.cardioData.calories} cal</span></div>
                          {session.cardioData.distance && <div><span className="text-gray-600">Distance</span> <span className="text-white font-bold ml-1">{session.cardioData.distance} km</span></div>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
