import React from 'react';
import { X, Ghost, ChefHat, Wand2, BarChart3, Loader2 } from 'lucide-react';

export const PaywallModal = ({ isOpen, onClose, onSubscribe, loading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/95 z-[80] flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
      <div className="bg-gray-900 w-full max-w-sm rounded-3xl p-6 border border-gray-800 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white z-10"><X size={24}/></button>

        <div className="text-center mb-6 pt-4">
          <Ghost size={56} className="text-blue-500 mx-auto mb-4 animate-bounce"/>
          <h2 className="text-3xl font-black italic text-white uppercase tracking-wider">GhostLog <span className="text-blue-400">PRO</span></h2>
          <p className="text-sm text-gray-400 mt-2">Unlock the ultimate AI fitness engine.</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
            <ChefHat className="text-blue-400" size={20}/>
            <div className="text-left">
              <p className="text-white font-bold text-sm">Ghost Chef</p>
              <p className="text-gray-500 text-xs">Infinite AI meal generation to hit your macros.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
            <Wand2 className="text-purple-400" size={20}/>
            <div className="text-left">
              <p className="text-white font-bold text-sm">Auto-Targets</p>
              <p className="text-gray-500 text-xs">AI calculates your exact calories and protein.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
            <BarChart3 className="text-green-400" size={20}/>
            <div className="text-left">
              <p className="text-white font-bold text-sm">Weekly Report</p>
              <p className="text-gray-500 text-xs">Expert AI critique of your progress and fatigue.</p>
            </div>
          </div>
        </div>

        <button onClick={onSubscribe} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-blue-900/50 transition-all flex justify-center items-center gap-2">
          {loading ? <Loader2 className="animate-spin"/> : "SUBSCRIBE FOR $9.70/MO"}
        </button>
        <div className="mt-4 flex justify-center gap-4 text-xs font-bold text-gray-600">
          <button className="hover:text-gray-400">Restore Purchases</button>
          <span>•</span>
          <button className="hover:text-gray-400">Terms</button>
        </div>
      </div>
    </div>
  );
};
