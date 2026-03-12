import React from 'react';
import { X, ChefHat, Wand2, BarChart3, Loader2, Sparkles, Crown } from 'lucide-react';

export const PaywallModal = ({ isOpen, onClose, onSubscribe, onRestore, loading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/95 z-[80] flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
      <div className="bg-gray-950 w-full max-w-sm rounded-2xl p-6 border border-gray-800/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'var(--accent)', opacity: 0.1 }}></div>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-white z-10"><X size={22}/></button>

        <div className="text-center mb-6 pt-4">
          <Crown size={48} className="accent-text mx-auto mb-4"/>
          <h2 className="text-2xl font-black tracking-tight text-white uppercase">GHOST<span className="text-gray-500">LOG</span> <span className="accent-text">PRO</span></h2>
          <p className="text-sm text-gray-500 mt-2">Unlock the AI fitness engine.</p>
        </div>

        <div className="space-y-3 mb-6">
          {[
            { icon: ChefHat, title: 'Ghost Chef', desc: 'AI meal generation to hit your macros.' },
            { icon: Wand2, title: 'Auto-Targets', desc: 'AI calculates your exact calories & protein.' },
            { icon: BarChart3, title: 'Weekly Report', desc: 'Expert AI critique of your progress.' },
            { icon: Sparkles, title: 'Food Vision', desc: 'Snap a photo to identify any food.' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-900/50 p-3 rounded-xl border border-gray-800/50">
              <f.icon className="accent-text shrink-0" size={18}/>
              <div className="text-left">
                <p className="text-white font-bold text-sm">{f.title}</p>
                <p className="text-gray-500 text-xs">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onSubscribe} disabled={loading} className="w-full accent-bg hover:opacity-90 text-white font-black text-base py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 active:scale-[0.98] accent-glow">
          {loading ? <Loader2 className="animate-spin"/> : "SUBSCRIBE — $9.70/MO"}
        </button>
        <div className="mt-4 flex justify-center gap-4 text-[10px] font-bold text-gray-600 uppercase tracking-wider">
          <button onClick={onRestore} disabled={loading} className="hover:text-gray-400 transition-colors disabled:opacity-50">Restore</button>
          <span>·</span>
          <button onClick={() => window.open('https://ghost-log.vercel.app/terms', '_blank')} className="hover:text-gray-400 transition-colors">Terms</button>
          <span>·</span>
          <button onClick={() => window.open('https://ghost-log.vercel.app/privacy', '_blank')} className="hover:text-gray-400 transition-colors">Privacy</button>
        </div>
      </div>
    </div>
  );
};
