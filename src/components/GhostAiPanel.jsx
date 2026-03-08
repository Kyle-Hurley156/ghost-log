import React, { useMemo, useState } from 'react';
import { X, Sparkles, ChefHat, Target, BarChart3, Camera, Trophy, MessageSquare, HelpCircle, ChevronDown, ChevronUp, Send } from 'lucide-react';

export const GhostAiPanel = ({ show, onClose, workoutHistory = [], setToast }) => {
  const [showFaq, setShowFaq] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  // Calculate PRs from workout history
  const personalRecords = useMemo(() => {
    const prMap = {};
    workoutHistory.forEach(session => {
      if (session.type === 'cardio' || !session.exercises) return;
      session.exercises.forEach(ex => {
        (ex.sets || []).forEach(set => {
          const w = parseFloat(set.weight);
          const r = parseFloat(set.reps);
          if (!w || !r) return;
          const key = ex.name;
          if (!prMap[key] || w > prMap[key].weight || (w === prMap[key].weight && r > prMap[key].reps)) {
            prMap[key] = { weight: w, reps: r, date: session.date };
          }
        });
      });
    });
    // Sort by weight descending, take top 10
    return Object.entries(prMap)
      .sort((a, b) => b[1].weight - a[1].weight)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data }));
  }, [workoutHistory]);

  const handleFeedback = () => {
    if (!feedbackText.trim()) return;
    // Open mailto with feedback
    const subject = encodeURIComponent('GhostLog Feedback');
    const body = encodeURIComponent(feedbackText);
    window.open(`mailto:ghostlogapp@gmail.com?subject=${subject}&body=${body}`, '_self');
    setFeedbackText('');
    setShowFeedback(false);
    if (setToast) setToast('Opening email...');
  };

  const faqItems = [
    { q: 'How do I track a workout?', a: 'Go to LIFT tab, tap a split or "Empty Workout", fill in weight & reps, tap the checkmark, then FINISH.' },
    { q: 'How does barcode scanning work?', a: 'In EAT tab, create a meal, tap the camera icon. Point at a barcode and it auto-detects. Tap SNAP FOR AI to photograph food instead.' },
    { q: 'What is Ghost Chef?', a: 'Ghost Chef generates a meal that fits your remaining macros perfectly. Find it in the EAT tab (Pro feature).' },
    { q: 'How do targets work?', a: 'Tap the CUT/BULK badge in the header. Use the wand to auto-calculate calories & protein based on your weight (Pro).' },
    { q: 'Is my data saved?', a: 'Yes. All data syncs to the cloud when you\'re logged in. It persists across devices, updates, and reinstalls.' },
    { q: 'How do I export my data?', a: 'Go to STATS tab and tap EXPORT. You\'ll get a CSV with all your stats and workout history (Pro).' },
    { q: 'How do I add custom exercises?', a: 'When adding an exercise, type a name that\'s not in the database. Tap "+ Create" to save it permanently.' },
  ];

  return (
    <div className={`fixed inset-y-0 right-0 w-80 bg-gray-950 border-l border-gray-800/50 shadow-2xl z-[100] transform transition-transform duration-300 ${show ? 'translate-x-0' : 'translate-x-full'}`}>
      {show && <div className="absolute inset-0 -left-[100vw] bg-black/60" onClick={onClose}></div>}
      <div className="p-5 h-full flex flex-col relative z-10 bg-gray-950 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <Sparkles size={20} className="accent-text"/> GHOST AI
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800 transition-colors">
            <X size={24} className="text-gray-500"/>
          </button>
        </div>

        {/* Feature Cards */}
        <div className="space-y-3 mb-6">
          {[
            { icon: Target, title: 'Smart Targets', desc: 'Tap the CUT/BULK badge in the header. Use the wand to auto-calculate calories & protein.' },
            { icon: ChefHat, title: 'Ghost Chef', desc: 'In EAT tab, ask Ghost to generate a meal that fits your remaining macros.' },
            { icon: Camera, title: 'Food Scanner', desc: 'Tap camera when adding ingredients. Barcodes auto-scan, or snap food for AI.' },
            { icon: BarChart3, title: 'Ghost Report', desc: 'In STATS, tap Analyze for an AI critique of your training and nutrition.' },
          ].map((item, i) => (
            <div key={i} className="bg-gray-900/50 p-3 rounded-xl border border-gray-800/50">
              <div className="flex items-center gap-2 mb-1">
                <item.icon size={14} className="accent-text"/>
                <h4 className="text-white font-bold text-xs">{item.title}</h4>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Personal Records */}
        {personalRecords.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Trophy size={14} className="text-yellow-400"/> Personal Records
            </h3>
            <div className="space-y-1.5">
              {personalRecords.map((pr, i) => (
                <div key={i} className="bg-gray-900/50 px-3 py-2 rounded-lg border border-gray-800/50 flex justify-between items-center">
                  <span className="text-xs text-white font-medium truncate flex-1">{pr.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-yellow-400">{pr.weight}kg</span>
                    <span className="text-[10px] text-gray-500">x{pr.reps}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="mb-4">
          <button onClick={() => setShowFaq(!showFaq)} className="w-full flex justify-between items-center text-xs font-black text-white uppercase tracking-wider mb-2">
            <span className="flex items-center gap-2"><HelpCircle size={14} className="text-gray-400"/> FAQ</span>
            {showFaq ? <ChevronUp size={14} className="text-gray-500"/> : <ChevronDown size={14} className="text-gray-500"/>}
          </button>
          {showFaq && (
            <div className="space-y-2">
              {faqItems.map((item, i) => (
                <div key={i} className="bg-gray-900/50 p-3 rounded-lg border border-gray-800/50">
                  <p className="text-xs text-white font-bold mb-1">{item.q}</p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback */}
        <div className="mb-4">
          <button onClick={() => setShowFeedback(!showFeedback)} className="w-full flex justify-between items-center text-xs font-black text-white uppercase tracking-wider mb-2">
            <span className="flex items-center gap-2"><MessageSquare size={14} className="text-gray-400"/> Feedback</span>
            {showFeedback ? <ChevronUp size={14} className="text-gray-500"/> : <ChevronDown size={14} className="text-gray-500"/>}
          </button>
          {showFeedback && (
            <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800/50">
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="Tell us what you think, report bugs, or request features..."
                className="w-full bg-black/50 p-2 rounded-lg text-xs text-white border border-gray-800/50 outline-none focus:accent-border resize-none h-20"
              />
              <button onClick={handleFeedback} disabled={!feedbackText.trim()} className="w-full accent-bg text-white text-xs font-bold py-2 rounded-lg mt-2 flex items-center justify-center gap-1 disabled:opacity-30 active:scale-95">
                <Send size={12}/> SEND FEEDBACK
              </button>
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-gray-800/50">
          <p className="text-[10px] text-gray-600 text-center uppercase tracking-widest">Ghost is watching</p>
        </div>
      </div>
    </div>
  );
};
