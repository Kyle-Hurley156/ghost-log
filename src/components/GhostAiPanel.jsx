import React from 'react';
import { X, Ghost } from 'lucide-react';

export const GhostAiPanel = ({ show, onClose }) => (
  <div className={`fixed inset-y-0 right-0 w-80 bg-gray-900 border-l border-gray-800 shadow-2xl z-[100] transform transition-transform duration-300 ${show ? 'translate-x-0' : 'translate-x-full'}`}>
     {show && <div className="absolute inset-0 -left-[100vw] bg-black/50" onClick={onClose}></div>}
     <div className="p-4 h-full flex flex-col relative z-10 bg-gray-900">
      <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black italic text-blue-400 flex items-center gap-2"><Ghost size={24}/> GHOST AI</h2><button onClick={onClose}><X size={32} className="text-gray-500 hover:text-white"/></button></div>
      <div className="flex-1 overflow-y-auto space-y-4">
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700"><h4 className="text-white font-bold text-sm mb-2">How to use GhostLog</h4><ul className="text-xs text-gray-400 space-y-2 list-disc pl-4"><li><strong>Targets:</strong> Click the "CUT/BULK" button in the header to set your calorie goals. Use the "Wand" to auto-calculate.</li><li><strong>Ghost Chef:</strong> In the EAT tab, ask Ghost to invent a meal based on your remaining macros.</li><li><strong>Cardio:</strong> Use the "Cardio +" button in the TRAIN tab to log runs, rides, etc.</li><li><strong>Ghost Report:</strong> In the STATS tab, click "Analyze" to get a weekly critique of your progress.</li></ul></div>
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700"><p className="text-sm text-gray-300"><span className="text-blue-300 font-bold">Status:</span> Ghost is watching.</p></div>
      </div>
    </div>
  </div>
);
