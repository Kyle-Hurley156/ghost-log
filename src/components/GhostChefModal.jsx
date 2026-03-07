import React, { useState, useEffect, useRef } from 'react';
import { X, ChefHat, Loader2, Timer, Sparkles, Send } from 'lucide-react';
import { API_URL } from '../constants';
import { parseAIResponse } from '../helpers';

const MAX_PROMPTS = 8;

export const GhostChefModal = ({ isOpen, onClose, targets, currentTotals, setToast, aiCooldown, setAiCooldown }) => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [promptCount, setPromptCount] = useState(0);
  const [reqCals, setReqCals] = useState(0);
  const [reqProt, setReqProt] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setReqCals(Math.max(0, targets.cal - currentTotals.cal));
      setReqProt(Math.max(0, targets.p - currentTotals.p));
      if (messages.length === 0) {
        setMessages([{ role: 'chef', type: 'intro', text: 'What are you feeling? Tap a quick option or type your own.' }]);
        setPromptCount(0);
      }
    }
  }, [isOpen, targets, currentTotals]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleClose = () => {
    setMessages([]);
    setPromptCount(0);
    setUserInput('');
    onClose();
  };

  const sendPrompt = async (text) => {
    if (loading) return;
    if (promptCount >= MAX_PROMPTS) { setToast(`Chef limit reached (${MAX_PROMPTS}). Close and reopen.`); return; }
    if (aiCooldown > 0) { setToast(`Ghost is resting for ${aiCooldown}s`); return; }

    const userMsg = text || userInput.trim();
    if (!userMsg) return;

    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setUserInput('');
    setLoading(true);
    setPromptCount(prev => prev + 1);

    try {
      const carbLimit = targets.c > 0 ? `Carbs under ${targets.c}g.` : '';
      const fatLimit = targets.f > 0 ? `Fats under ${targets.f}g.` : '';
      const prompt = `You are Ghost Chef, a concise fitness meal assistant. User wants: "${userMsg}". Budget: ~${reqCals}cal, ${reqProt}g protein. ${carbLimit} ${fatLimit} Reply with a SHORT, simple meal. Return JSON only: {"mealName":"Short Name","ingredients":["item - amount"],"macros":{"cal":number,"p":number,"c":number,"f":number},"tip":"One sentence tip"} Keep ingredients to 3-5 items max. Keep it simple and appetizing. JSON ONLY.`;

      const response = await fetch(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, isImage: false, imageData: null })
      });
      const data = await response.json();
      if (!response.ok || !data.candidates) throw new Error(data.error || "AI Busy");

      const result = parseAIResponse(data.candidates[0].content.parts[0].text);
      setMessages(prev => [...prev, { role: 'chef', type: 'meal', data: result }]);
      setAiCooldown(8);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'chef', type: 'error', text: 'Chef had a hiccup. Try again.' }]);
      setAiCooldown(3);
    }
    setLoading(false);
  };

  const quickOptions = ['High protein', 'Low carb', 'Quick & easy', 'Sweet snack'];

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-gray-900 w-full max-w-sm rounded-2xl border border-gray-800/50 shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* Fixed header */}
        <div className="flex justify-between items-center p-4 pb-3 border-b border-gray-800/50 shrink-0">
          <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            <ChefHat className="accent-text" size={20}/> GHOST CHEF
          </h3>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
            <X size={20} className="text-gray-500"/>
          </button>
        </div>

        {/* Budget bar */}
        <div className="flex justify-center gap-4 px-4 py-2 border-b border-gray-800/50 shrink-0">
          <span className="text-xs text-gray-500"><span className="text-white font-bold">{reqCals}</span> kcal left</span>
          <span className="text-xs text-gray-500"><span className="accent-text font-bold">{reqProt}g</span> prot left</span>
          <span className="text-[10px] text-gray-600">{promptCount}/{MAX_PROMPTS}</span>
        </div>

        {/* Chat messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`${msg.role === 'user' ? 'flex justify-end' : ''}`}>
              {msg.role === 'user' ? (
                <div className="accent-bg-dim accent-text text-sm px-3 py-2 rounded-xl rounded-br-sm max-w-[80%] border accent-border-dim">
                  {msg.text}
                </div>
              ) : msg.type === 'intro' ? (
                <div className="text-sm text-gray-400">{msg.text}</div>
              ) : msg.type === 'error' ? (
                <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">{msg.text}</div>
              ) : msg.type === 'meal' && msg.data ? (
                <div className="bg-black/40 rounded-xl border border-gray-800/50 overflow-hidden">
                  <div className="p-3">
                    <h4 className="text-white font-bold text-sm">{msg.data.mealName}</h4>
                    <ul className="text-xs text-gray-400 mt-2 space-y-1">
                      {(msg.data.ingredients || []).map((ing, j) => (
                        <li key={j} className="flex items-start gap-1.5">
                          <span className="accent-text mt-0.5 shrink-0">-</span> {ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-3 text-[10px] font-mono px-3 py-2 bg-black/30 border-t border-gray-800/50">
                    <span className="text-white">{msg.data.macros?.cal} kcal</span>
                    <span className="text-red-300">{msg.data.macros?.p}p</span>
                    <span className="text-orange-300">{msg.data.macros?.c}c</span>
                    <span className="text-yellow-300">{msg.data.macros?.f}f</span>
                  </div>
                  {msg.data.tip && (
                    <div className="px-3 py-2 border-t border-gray-800/50">
                      <p className="text-[10px] text-gray-500 italic">{msg.data.tip}</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ))}

          {/* Quick options — only show at start */}
          {messages.length === 1 && !loading && (
            <div className="flex flex-wrap gap-2">
              {quickOptions.map((opt) => (
                <button key={opt} onClick={() => sendPrompt(opt)} className="text-xs px-3 py-1.5 rounded-full border border-gray-700/50 text-gray-400 hover:accent-text hover:accent-border-dim hover:accent-bg-dim transition-all">
                  {opt}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 size={14} className="animate-spin accent-text"/> Chef is cooking...
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="p-3 border-t border-gray-800/50 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendPrompt()}
              placeholder={promptCount >= MAX_PROMPTS ? 'Limit reached' : 'e.g. "something with chicken"'}
              disabled={promptCount >= MAX_PROMPTS || loading}
              className="flex-1 bg-black/50 px-3 py-2.5 rounded-xl text-sm text-white border border-gray-800/50 outline-none focus:accent-border transition-colors disabled:opacity-40"
            />
            <button
              onClick={() => sendPrompt()}
              disabled={loading || aiCooldown > 0 || promptCount >= MAX_PROMPTS || !userInput.trim()}
              className="accent-bg text-white p-2.5 rounded-xl disabled:bg-gray-800 disabled:text-gray-600 transition-all active:scale-95"
            >
              {aiCooldown > 0 ? <Timer size={18}/> : <Send size={18}/>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
