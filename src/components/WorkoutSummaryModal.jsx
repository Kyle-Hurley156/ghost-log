import React from 'react';
import { X, Trophy, Timer, Dumbbell, TrendingUp, Share2 } from 'lucide-react';

export const WorkoutSummaryModal = ({ isOpen, onClose, summary, setToast }) => {
  if (!isOpen || !summary) return null;

  const { name, duration, exercises, totalSets, totalVolume, prs } = summary;

  const formatDuration = (s) => {
    if (!s) return '0m';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const shareWorkout = async () => {
    const prLine = prs.length > 0 ? `\nPRs: ${prs.map(p => `${p.exercise} ${p.weight}kg`).join(', ')}` : '';
    const text = `${name} | ${formatDuration(duration)}\n${exercises.length} exercises, ${totalSets} sets, ${(totalVolume / 1000).toFixed(1)}t volume${prLine}\n\nTracked with GhostLog`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      if (setToast) setToast('Copied to clipboard');
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center animate-in fade-in" onClick={onClose}>
      <div className="bg-gray-950 border border-gray-800/50 rounded-2xl p-6 mx-6 max-w-sm w-full animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-[10px] text-gray-600 uppercase font-bold tracking-wider">Workout Complete</p>
            <h2 className="text-white font-black text-xl">{name}</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-600 hover:text-white"><X size={16}/></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800/50 text-center">
            <Timer size={16} className="mx-auto mb-1 text-blue-400"/>
            <p className="text-white font-black text-lg">{formatDuration(duration)}</p>
            <p className="text-[9px] text-gray-600 uppercase font-bold">Duration</p>
          </div>
          <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800/50 text-center">
            <Dumbbell size={16} className="mx-auto mb-1 accent-text"/>
            <p className="text-white font-black text-lg">{totalSets}</p>
            <p className="text-[9px] text-gray-600 uppercase font-bold">Sets</p>
          </div>
          <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800/50 text-center">
            <TrendingUp size={16} className="mx-auto mb-1 text-green-400"/>
            <p className="text-white font-black text-lg">{totalVolume > 0 ? (totalVolume / 1000).toFixed(1) : '0'}</p>
            <p className="text-[9px] text-gray-600 uppercase font-bold">Volume (t)</p>
          </div>
          <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800/50 text-center">
            <Trophy size={16} className={`mx-auto mb-1 ${prs.length > 0 ? 'text-yellow-400' : 'text-gray-700'}`}/>
            <p className={`font-black text-lg ${prs.length > 0 ? 'text-yellow-400' : 'text-white'}`}>{prs.length}</p>
            <p className="text-[9px] text-gray-600 uppercase font-bold">PRs</p>
          </div>
        </div>

        {prs.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-6">
            <p className="text-[10px] text-yellow-400 font-bold uppercase mb-1">New Personal Records</p>
            {prs.map((pr, i) => (
              <p key={i} className="text-white text-sm font-bold">{pr.exercise} — {pr.weight}kg x {pr.reps}</p>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={shareWorkout} className="flex-1 bg-gray-900 text-gray-300 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-gray-800/50">
            <Share2 size={14}/> SHARE
          </button>
          <button onClick={onClose} className="flex-1 accent-bg text-white font-bold py-3 rounded-xl text-sm transition-all active:scale-[0.98] accent-glow">
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
