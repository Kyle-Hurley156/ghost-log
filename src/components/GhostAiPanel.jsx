import React, { useMemo, useState, useRef, useEffect } from 'react';
import { X, Sparkles, Trophy, HelpCircle, ChevronDown, ChevronUp, Send, Loader2, Lock, MessageSquare } from 'lucide-react';
import { API_URL } from '../constants';
import { getLocalDate } from '../helpers';

export const GhostAiPanel = ({ show, onClose, workoutHistory = [], setToast, statsHistory = [], userTargets = {}, phase = 'CUT', dailyLog = [], isPro, handlePremiumFeature, aiCooldown = 0, setAiCooldown }) => {
  const [showFaq, setShowFaq] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const chatScrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages, chatLoading]);

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
    return Object.entries(prMap)
      .sort((a, b) => b[1].weight - a[1].weight)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data }));
  }, [workoutHistory]);

  // Build context summary for AI
  const buildContext = () => {
    const recentWorkouts = workoutHistory.slice(-5).map(w => {
      if (w.type === 'cardio') return `${w.date}: Cardio - ${w.name}`;
      const exStr = (w.exercises || []).map(e => `${e.name} (${(e.sets||[]).length} sets)`).join(', ');
      return `${w.date}: ${w.name} - ${exStr}`;
    }).join('\n');

    const recentStats = statsHistory.slice(-7).map(s =>
      `${s.date}: weight=${s.weight||'?'}kg, cals=${s.cals||'?'}, sleep=${s.sleep||'?'}/5, stress=${s.stress||'?'}/5`
    ).join('\n');

    const todayMeals = dailyLog.map(m => `${m.name}: ${m.totalCals}cal, ${m.totalP}g protein`).join(', ');
    const prStr = personalRecords.slice(0, 5).map(pr => `${pr.name}: ${pr.weight}kg x${pr.reps}`).join(', ');

    return `User is ${phase}ing. Targets: ${userTargets.cal}cal, ${userTargets.p}g protein.
Today's meals: ${todayMeals || 'none logged yet'}.
Recent workouts:\n${recentWorkouts || 'none'}
Recent stats:\n${recentStats || 'none'}
Top PRs: ${prStr || 'none'}`;
  };

  const sendChat = async (text) => {
    const msg = text || chatInput.trim();
    if (!msg || chatLoading) return;
    if (aiCooldown > 0) { setToast(`Ghost is resting for ${aiCooldown}s`); return; }

    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const context = buildContext();
      const prompt = `You are Ghost AI, a concise fitness coach inside the GhostLog app. You are direct, knowledgeable, and slightly intense — like a coach who genuinely cares. Keep responses under 80 words. Use bullet points when listing things. Never use markdown headers.

User's context:
${context}

Conversation so far:
${chatMessages.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Ghost'}: ${m.text}`).join('\n')}

User: ${msg}

Ghost:`;

      const response = await fetch(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, isImage: false, imageData: null })
      });
      const data = await response.json();
      if (!response.ok || !data.candidates?.[0]) throw new Error(data.error?.message || 'No response');

      const reply = data.candidates[0].content.parts[0].text;
      setChatMessages(prev => [...prev, { role: 'ghost', text: reply }]);
      if (setAiCooldown) setAiCooldown(5);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'ghost', text: 'Ghost glitched. Try again.' }]);
      if (setAiCooldown) setAiCooldown(3);
    }
    setChatLoading(false);
  };

  const quickPrompts = ['Am I eating enough?', 'Rate my week', 'What should I train today?', 'How\'s my recovery?'];

  const faqItems = [
    { q: 'How do I track a workout?', a: 'Go to LIFT, tap a workout split (or "Empty Workout"). Fill in weight and reps for each set, tap the green checkmark to mark it done, then tap FINISH.' },
    { q: 'How does barcode scanning work?', a: 'In EAT, tap + NEW to create a meal. Tap the camera icon. Point at any barcode — it auto-detects and fills in the nutrition info.' },
    { q: 'What is AI Food Snap?', a: 'While the camera is open, tap SNAP FOR AI. This photographs food and Ghost Vision identifies it and estimates macros per 100g.' },
    { q: 'What is Ghost Chef?', a: 'Ghost Chef generates a meal that fits your remaining daily macros. Find the CHEF button in the EAT tab. Pro feature.' },
    { q: 'How do targets work?', a: 'Tap the CUT/BULK badge at the top. Use the wand icon to auto-calculate ideal calories and protein based on your body weight and goal.' },
    { q: 'How do I export my data?', a: 'Go to STATS and tap EXPORT. You\'ll get a CSV file with your full stats and workout history. Pro feature.' },
  ];

  return (
    <div className={`fixed inset-y-0 right-0 w-80 bg-gray-950 border-l border-gray-800/50 shadow-2xl z-[100] transform transition-transform duration-300 ${show ? 'translate-x-0' : 'translate-x-full'}`}>
      {show && <div className="absolute inset-0 -left-[100vw] bg-black/60" onClick={onClose}></div>}
      <div className="p-5 h-full flex flex-col relative z-10 bg-gray-950">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <Sparkles size={20} className="accent-text"/> GHOST AI
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800 transition-colors">
            <X size={24} className="text-gray-500"/>
          </button>
        </div>

        {/* Chat Section */}
        <div className="flex-1 flex flex-col min-h-0 mb-3">
          <button onClick={() => setShowChat(!showChat)} className="flex justify-between items-center text-xs font-black text-white uppercase tracking-wider mb-2">
            <span className="flex items-center gap-2"><MessageSquare size={14} className="accent-text"/> Chat with Ghost</span>
            {showChat ? <ChevronUp size={14} className="text-gray-500"/> : <ChevronDown size={14} className="text-gray-500"/>}
          </button>

          {showChat && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-2 mb-2 min-h-[120px] max-h-[300px]">
                {chatMessages.length === 0 && (
                  <div className="text-center py-6">
                    <Sparkles size={24} className="mx-auto mb-2 text-gray-700"/>
                    <p className="text-[10px] text-gray-600">Ask Ghost anything about your training, nutrition, or recovery.</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${msg.role === 'user' ? 'accent-bg text-white' : 'bg-gray-900 text-gray-300 border border-gray-800/50'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-900 border border-gray-800/50 px-3 py-2 rounded-xl">
                      <Loader2 size={14} className="animate-spin accent-text"/>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick prompts */}
              {chatMessages.length === 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {quickPrompts.map((q, i) => (
                    <button key={i} onClick={() => isPro ? sendChat(q) : handlePremiumFeature(() => sendChat(q))} className="text-[10px] bg-gray-900/50 border border-gray-800/50 text-gray-400 px-2.5 py-1.5 rounded-lg hover:text-white transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (isPro ? sendChat() : handlePremiumFeature(() => sendChat()))}
                  placeholder="Ask Ghost..."
                  className="flex-1 bg-black/50 px-3 py-2 rounded-xl text-xs text-white border border-gray-800/50 outline-none focus:accent-border"
                />
                <button
                  onClick={() => isPro ? sendChat() : handlePremiumFeature(() => sendChat())}
                  disabled={!chatInput.trim() || chatLoading}
                  className="accent-bg p-2 rounded-xl disabled:opacity-30 transition-all active:scale-95"
                >
                  {!isPro ? <Lock size={14} className="text-white"/> : <Send size={14} className="text-white"/>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable bottom section */}
        <div className="overflow-y-auto flex-shrink-0" style={{ maxHeight: showChat ? '35%' : '80%' }}>
          {/* Personal Records */}
          {personalRecords.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <Trophy size={14} className="text-yellow-400"/> Personal Records
              </h3>
              <div className="space-y-1">
                {personalRecords.map((pr, i) => (
                  <div key={i} className="bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-800/50 flex justify-between items-center">
                    <span className="text-[10px] text-white font-medium truncate flex-1">{pr.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-yellow-400">{pr.weight}kg</span>
                      <span className="text-[9px] text-gray-500">x{pr.reps}</span>
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
              <div className="space-y-1.5">
                {faqItems.map((item, i) => (
                  <div key={i} className="bg-gray-900/50 p-2.5 rounded-lg border border-gray-800/50">
                    <p className="text-[10px] text-white font-bold mb-0.5">{item.q}</p>
                    <p className="text-[9px] text-gray-400 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-800/50">
            <p className="text-[9px] text-gray-600 text-center uppercase tracking-widest">Ghost is watching</p>
          </div>
        </div>
      </div>
    </div>
  );
};
