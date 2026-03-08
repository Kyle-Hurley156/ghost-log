import React from 'react';
import { X, LogOut, Shield, FileText, Info, ExternalLink, Trash2, Mail } from 'lucide-react';
import { APP_VERSION } from '../constants';

export const SettingsPanel = ({ show, onClose, onLogout, userEmail, requestConfirm }) => (
  <div className={`fixed inset-y-0 left-0 w-80 bg-gray-950 border-r border-gray-800/50 shadow-2xl z-[100] transform transition-transform duration-300 ${show ? 'translate-x-0' : '-translate-x-full'}`}>
    {show && <div className="absolute inset-0 left-full w-screen bg-black/60" onClick={onClose}></div>}
    <div className="p-5 h-full flex flex-col relative z-10 bg-gray-950">
      <div className="flex justify-between items-center mb-6 pt-10">
        <h2 className="text-xl font-black tracking-tight text-white">Settings</h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800 transition-colors">
          <X size={24} className="text-gray-500"/>
        </button>
      </div>

      {/* Account */}
      <div className="mb-6">
        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-3">Account</p>
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 accent-bg-dim rounded-full flex items-center justify-center">
              <Mail size={18} className="accent-text"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold truncate">{userEmail || 'Not signed in'}</p>
              <p className="text-[10px] text-gray-500">Signed in</p>
            </div>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="mb-6">
        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-3">Legal</p>
        <div className="space-y-1">
          <a href="https://ghost-log.vercel.app/privacy.html" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-900/50 transition-colors">
            <span className="flex items-center gap-3 text-sm text-gray-300"><Shield size={16} className="text-gray-500"/> Privacy Policy</span>
            <ExternalLink size={14} className="text-gray-700"/>
          </a>
          <a href="https://ghost-log.vercel.app/terms.html" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-900/50 transition-colors">
            <span className="flex items-center gap-3 text-sm text-gray-300"><FileText size={16} className="text-gray-500"/> Terms of Service</span>
            <ExternalLink size={14} className="text-gray-700"/>
          </a>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6">
        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-3">Actions</p>
        <div className="space-y-1">
          <button onClick={() => requestConfirm('Clear all local data? Your cloud data will be restored on next login.', () => { localStorage.clear(); window.location.reload(); })} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-900/50 transition-colors text-sm text-gray-300">
            <Trash2 size={16} className="text-gray-500"/> Clear Local Cache
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/5 transition-colors text-sm text-red-400">
            <LogOut size={16}/> Log Out
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-gray-800/50">
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <Info size={12}/>
          <p className="text-[10px] uppercase tracking-widest font-bold">GhostLog v{APP_VERSION}</p>
        </div>
        <p className="text-[10px] text-gray-700 text-center mt-1">ghostlogapp@gmail.com</p>
      </div>
    </div>
  </div>
);
