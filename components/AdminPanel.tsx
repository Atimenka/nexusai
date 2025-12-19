
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { AppSettings } from '../types';

interface AdminPanelProps {
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<AppSettings>({ 
    systemRule: '', 
    globalKnowledge: '', 
    temperature: 0.7, 
    creativeLevel: 'Balanced' 
  });
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'core' | 'security'>('rules');

  useEffect(() => {
    setSettings(db.getSettings());
  }, []);

  const handleSave = () => {
    db.updateSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#0d1117] border border-blue-500/30 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_100px_rgba(37,99,235,0.1)]">
        
        {/* Header */}
        <div className="p-8 border-b border-[#30363d] flex items-center justify-between bg-gradient-to-r from-[#161b22] to-[#0d1117]">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20 relative group">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl group-hover:blur-2xl transition-all"></div>
              <i className="fas fa-microchip text-2xl relative"></i>
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Neural Kernel <span className="text-blue-500">v5.2.1</span></h2>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Root Access: Atimenka // Authorized</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#161b22] border border-[#30363d] text-gray-500 hover:text-white hover:border-white/20 transition-all flex items-center justify-center"><i className="fas fa-times"></i></button>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#161b22]/30 px-4">
           {[
             {id: 'rules', label: 'Directives', icon: 'fa-brain'},
             {id: 'core', label: 'AI Engine', icon: 'fa-atom'},
             {id: 'security', label: 'Vault', icon: 'fa-shield-halved'}
           ].map((tab) => (
             <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`px-8 py-5 text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 border-b-2 ${activeTab === tab.id ? 'text-blue-500 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
             >
               <i className={`fas ${tab.icon} text-[10px]`}></i>
               {tab.label}
             </button>
           ))}
        </div>

        {/* Content */}
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar bg-[#0d1117]">
          {activeTab === 'rules' && (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-sm font-black text-white uppercase mb-1">System Instructions</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Define how Nexus perceives reality and users.</p>
                </div>
                <span className="text-[9px] font-black text-blue-500 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full uppercase">Atimenka Override Active</span>
              </div>
              <textarea
                className="w-full h-80 bg-[#161b22] border border-[#30363d] rounded-3xl p-6 text-xs text-gray-300 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50 shadow-inner leading-relaxed"
                value={settings.systemRule}
                onChange={(e) => setSettings({ ...settings, systemRule: e.target.value })}
                placeholder="Enter root instructions here..."
              />
            </div>
          )}

          {activeTab === 'core' && (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 py-4">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <h3 className="text-[11px] font-black text-white uppercase tracking-wider">Creativity Temperature</h3>
                  <span className="text-[11px] font-black text-blue-500">{settings.temperature.toFixed(2)}</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05" 
                  className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  value={settings.temperature}
                  onChange={(e) => setSettings({...settings, temperature: parseFloat(e.target.value)})}
                />
                <div className="flex justify-between text-[9px] font-black text-gray-600 uppercase">
                  <span>Logic (Precise)</span>
                  <span>Artistic (Creative)</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {['Stable', 'Balanced', 'Chaos'].map(level => (
                  <button 
                    key={level}
                    onClick={() => setSettings({...settings, creativeLevel: level as any, temperature: level === 'Stable' ? 0.3 : (level === 'Chaos' ? 0.95 : 0.7)})}
                    className={`p-6 rounded-3xl border transition-all text-center group ${settings.creativeLevel === level ? 'bg-blue-600 border-white/10 text-white' : 'bg-[#161b22] border-[#30363d] text-gray-500 hover:border-blue-500/30'}`}
                  >
                    <div className={`w-8 h-8 rounded-full mx-auto mb-3 flex items-center justify-center text-[10px] ${settings.creativeLevel === level ? 'bg-white/20' : 'bg-gray-800'}`}>
                      <i className={`fas ${level === 'Stable' ? 'fa-shield' : (level === 'Chaos' ? 'fa-fire' : 'fa-balance-scale')}`}></i>
                    </div>
                    <span className="block text-[10px] font-black uppercase tracking-widest">{level}</span>
                  </button>
                ))}
              </div>

              <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl">
                <div className="flex items-center gap-4 text-blue-500 mb-2">
                  <i className="fas fa-info-circle text-sm"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Atimenka's Tip</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed font-medium">Используй <span className="text-white">Chaos</span> и температуру <span className="text-white">0.95+</span> для написания сюрреалистичных историй. Для кода или фактов лучше оставить <span className="text-white">Stable</span>.</p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-500 py-4">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {[
                   { l: 'God Mode (Bypassing Filters)', v: 'ENABLED', c: 'text-green-500', i: 'fa-bolt' },
                   { l: 'System Language Override', v: 'AUTO', c: 'text-blue-500', i: 'fa-language' },
                   { l: 'Encryption Protocol', v: 'AES-NXS', c: 'text-blue-400', i: 'fa-lock' },
                   { l: 'Master Account', v: 'ATIMENKA', c: 'text-red-500', i: 'fa-crown' }
                 ].map(item => (
                   <div key={item.l} className="p-5 bg-[#161b22] border border-[#30363d] rounded-3xl flex items-center gap-5">
                      <div className="w-10 h-10 rounded-2xl bg-gray-800 flex items-center justify-center text-gray-400"><i className={`fas ${item.i}`}></i></div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-500 uppercase leading-none mb-1">{item.l}</span>
                        <span className={`text-[10px] font-black uppercase ${item.c}`}>{item.v}</span>
                      </div>
                   </div>
                 ))}
               </div>
               
               <div className="mt-10 p-8 border border-red-500/20 bg-red-500/5 rounded-[2rem] flex items-center justify-between gap-6">
                  <div className="max-w-md">
                    <h4 className="text-[11px] font-black text-red-500 uppercase mb-1">Emergency Core Purge</h4>
                    <p className="text-[10px] text-gray-500 font-medium">Это действие безвозвратно удалит все системные правила и вернет ядро к заводским настройкам.</p>
                  </div>
                  <button className="px-6 py-3 border border-red-500/40 text-red-500 text-[10px] font-black uppercase rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-95">Reset Kernel</button>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-[#30363d] flex justify-end gap-4 bg-[#161b22]/50 backdrop-blur-md">
          <button onClick={onClose} className="px-8 py-4 text-[11px] font-black uppercase text-gray-500 hover:text-white transition-all">Cancel</button>
          <button onClick={handleSave} className={`px-10 py-4 rounded-2xl text-[11px] font-black uppercase transition-all shadow-2xl active:scale-95 ${isSaved ? 'bg-green-600 shadow-green-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'} text-white`}>
            {isSaved ? (
              <span className="flex items-center gap-2"><i className="fas fa-check"></i> Sync Complete</span>
            ) : (
              <span className="flex items-center gap-2"><i className="fas fa-save"></i> Save Kernel Configuration</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
