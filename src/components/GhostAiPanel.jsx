import React from 'react';
import { X, Ghost, Sparkles, ChefHat, Target, BarChart3, Camera } from 'lucide-react';

export const GhostAiPanel = ({ show, onClose }) => (
  <div className={`fixed inset-y-0 right-0 w-80 bg-gray-950 border-l border-gray-800/50 shadow-2xl z-[100] transform transition-transform duration-300 ${show ? 'translate-x-0' : 'translate-x-full'}`}>
     {show && <div className="absolute inset-0 -left-[100vw] bg-black/60" onClick={onClose}></div>}
     <div className="p-5 h-full flex flex-col relative z-10 bg-gray-950">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
          <Sparkles size={20} className="accent-text"/> GHOST AI
        </h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800 transition-colors">
          <X size={24} className="text-gray-500"/>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3">
        {[
          { icon: Target, title: 'Smart Targets', desc: 'Tap the CUT/BULK badge in the header. Use the wand to auto-calculate calories & protein based on your weight.' },
          { icon: ChefHat, title: 'Ghost Chef', desc: 'In the EAT tab, ask Ghost to generate a meal that fits your remaining macros perfectly.' },
          { icon: Camera, title: 'Food Scanner', desc: 'Tap the camera icon when adding ingredients. Scan barcodes or snap photos for instant macro lookup.' },
          { icon: BarChart3, title: 'Ghost Report', desc: 'In STATS, tap Analyze for an AI critique of your training, recovery, and nutrition trends.' },
        ].map((item, i) => (
          <div key={i} className="bg-gray-900/50 p-4 rounded-xl border border-gray-800/50">
            <div className="flex items-center gap-2 mb-2">
              <item.icon size={14} className="accent-text"/>
              <h4 className="text-white font-bold text-sm">{item.title}</h4>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-800/50">
        <p className="text-[10px] text-gray-600 text-center uppercase tracking-widest">Ghost is watching</p>
      </div>
    </div>
  </div>
);
