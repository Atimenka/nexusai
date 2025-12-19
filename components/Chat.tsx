
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatSession, Message } from '../types';
import { db } from '../services/db';
import { askGemini, isImageRequest, generateImage, speakText } from '../services/gemini';
import AdminPanel from './AdminPanel';

interface ChatProps {
  user: User;
  onLogout: () => void;
}

const Chat: React.FC<ChatProps> = ({ user, onLogout }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{data: string, mimeType: string} | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [hasKey, setHasKey] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSessions();
    checkApiKey();
    if (window.innerWidth >= 1024) setIsSidebarOpen(true);
  }, [user.id]);

  const checkApiKey = async () => {
    if ((window as any).aistudio?.hasSelectedApiKey) {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasKey(selected);
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [currentSession?.messages, isTyping]);

  const loadSessions = () => {
    const chats = db.getChats(user.id);
    setSessions(chats);
    const total = chats.reduce((acc, s) => acc + s.messages.length, 0);
    setMessageCount(total);
  };

  const handleUpdateApiKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleSend = async (e?: React.FormEvent, overridePrompt?: string) => {
    if (e) e.preventDefault();
    
    // Проверка ключа перед отправкой
    if ((window as any).aistudio?.hasSelectedApiKey) {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      if (!selected) {
        alert("ОШИБКА: Сначала нужно выбрать API ключ. Нажмите кнопку 'Выбрать ключ' в боковой панели.");
        return;
      }
    }

    if ((!input.trim() && !selectedImage && !overridePrompt) || isTyping) return;

    const userInput = overridePrompt || input.trim();
    const currentImg = selectedImage;
    if (!overridePrompt) setInput('');
    setSelectedImage(null);

    const userMessage: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: userInput || "[Protocol Uplink]", 
      timestamp: Date.now(),
      imageUrl: currentImg ? `data:${currentImg.mimeType};base64,${currentImg.data}` : undefined
    };

    let activeSession = currentSession || { 
      id: Date.now().toString(), 
      userId: user.id, 
      title: userInput.substring(0, 20) || (isStoryMode ? "New Legend" : "Nexus Dialogue"), 
      messages: [], 
      createdAt: Date.now() 
    };

    const updatedMessages = [...activeSession.messages, userMessage];
    activeSession = { ...activeSession, messages: updatedMessages };
    
    setCurrentSession(activeSession);
    db.saveChat(activeSession);
    setIsTyping(true);

    try {
      let aiResponse = "";
      let aiImg = undefined;

      if (!currentImg && isImageRequest(userInput)) {
        const url = await generateImage(userInput, isStoryMode);
        aiResponse = url ? "Visualization task completed." : "Failed to render visualization. Check API Key or VPN status.";
        aiImg = url || undefined;
      } else {
        aiResponse = await askGemini(userInput, updatedMessages, user.username, user.isAdmin, isStoryMode, currentImg || undefined);
      }

      const aiMessage: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        content: aiResponse, 
        imageUrl: aiImg,
        timestamp: Date.now() 
      };

      const finalSession = { ...activeSession, messages: [...updatedMessages, aiMessage] };
      setCurrentSession(finalSession);
      db.saveChat(finalSession);
      loadSessions();
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`flex h-screen text-[#e6edf3] relative overflow-hidden transition-colors duration-700 ${isStoryMode ? 'bg-[#1a1425]' : 'bg-[#0d1117]'}`}>
      <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => setSelectedImage({ data: (reader.result as string).split(',')[1], mimeType: file.type });
          reader.readAsDataURL(file);
        }
      }} />

      {/* Sidebar */}
      <aside className={`fixed lg:relative top-0 left-0 h-full border-r border-[#30363d] z-[70] transition-all duration-500 flex flex-col shadow-2xl ${isSidebarOpen ? 'w-[280px] translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-72'} ${isStoryMode ? 'bg-[#1a1425]' : 'bg-[#0d1117]'}`}>
        <div className="p-4 flex flex-col h-full w-[280px] lg:w-full">
          <button onClick={() => {setCurrentSession(null); if(window.innerWidth < 1024) setIsSidebarOpen(false);}} className={`w-full mb-8 flex items-center justify-center gap-3 py-3.5 rounded-2xl font-black transition-all text-[11px] uppercase tracking-widest shadow-xl active:scale-95 ${isStoryMode ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'}`}>
            <i className={`fas ${isStoryMode ? 'fa-feather-pointed' : 'fa-plus'}`}></i> {isStoryMode ? 'New Story' : 'New Stream'}
          </button>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
            <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 ml-2">{isStoryMode ? 'Chronicles' : 'Protocols'}</h3>
            {sessions.map(s => (
              <div key={s.id} onClick={() => {setCurrentSession(s); if(window.innerWidth < 1024) setIsSidebarOpen(false);}} className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group border ${currentSession?.id === s.id ? (isStoryMode ? 'bg-purple-900/20 border-purple-500/50' : 'bg-[#30363d]/50 border-blue-500/50') : 'hover:bg-[#21262d] border-transparent text-gray-400'}`}>
                <span className="text-[11px] truncate font-bold flex-1">{s.title}</span>
                <button onClick={(e) => {e.stopPropagation(); db.deleteChat(s.id); loadSessions();}} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 p-1 transition-all"><i className="fas fa-trash-alt text-[10px]"></i></button>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-6 border-t border-[#30363d] space-y-3">
             {!hasKey && (
               <div className="p-4 bg-red-600/10 border border-red-500/30 rounded-2xl mb-2 animate-pulse">
                 <p className="text-[9px] font-black text-red-500 uppercase mb-2">Ключ не выбран!</p>
                 <button onClick={handleUpdateApiKey} className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase rounded-xl shadow-xl transition-all">Выбрать ключ</button>
               </div>
             )}

             {user.isAdmin && (
               <div className={`px-4 py-2 border rounded-xl mb-4 ${isStoryMode ? 'bg-purple-500/5 border-purple-500/20' : 'bg-blue-500/5 border-blue-500/20'}`}>
                 <div className="flex justify-between items-center mb-1.5">
                    <span className={`text-[8px] font-black uppercase ${isStoryMode ? 'text-purple-400' : 'text-blue-400'}`}>Neural Load</span>
                    <span className={`text-[8px] font-black ${isStoryMode ? 'text-purple-500' : 'text-blue-500'}`}>{Math.min(100, (messageCount / 1500) * 100).toFixed(1)}%</span>
                 </div>
                 <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${isStoryMode ? 'bg-purple-500' : 'bg-blue-500'}`} style={{width: `${Math.min(100, (messageCount / 1500) * 100)}%`}}></div>
                 </div>
               </div>
             )}
            
            {user.isAdmin && <button onClick={() => setIsAdminOpen(true)} className="w-full flex items-center gap-3 px-4 py-2.5 text-yellow-500 hover:bg-yellow-500/10 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"><i className="fas fa-shield-virus"></i> Kernel Access</button>}
            
            <button onClick={handleUpdateApiKey} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${hasKey ? 'text-green-500 hover:bg-green-500/10' : 'text-red-500 bg-red-500/5 border border-red-500/20'}`}>
              <i className="fas fa-key"></i> {hasKey ? 'Сменить ключ API' : 'Настроить ключ API'}
            </button>

            <div className={`flex items-center justify-between p-4 rounded-2xl border border-[#30363d] shadow-inner mt-2 ${isStoryMode ? 'bg-[#251b36]' : 'bg-[#161b22]'}`}>
              <div className="flex flex-col">
                <span className={`text-[9px] font-black uppercase leading-none mb-1 ${isStoryMode ? 'text-purple-500' : 'text-blue-500'}`}>Authenticated</span>
                <span className="text-[11px] font-bold text-white truncate">{user.username}</span>
              </div>
              <button onClick={onLogout} className="text-gray-500 hover:text-red-500 transition-colors p-2"><i className="fas fa-power-off text-sm"></i></button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className={`h-16 border-b border-[#30363d] backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-20 ${isStoryMode ? 'bg-[#1a1425]/60' : 'bg-[#0d1117]/60'}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-white transition-all active:scale-90"><i className="fas fa-braille text-xl"></i></button>
            <h1 className="font-black text-sm sm:text-lg tracking-[-0.05em] text-white uppercase italic">Nexus Alpha <span className={isStoryMode ? 'text-purple-500' : 'text-blue-500'}>{isStoryMode ? 'Forge' : '5.2.1'}</span></h1>
          </div>
          <div className="flex items-center gap-5">
             <div className="flex items-center gap-3 px-3 py-1.5 bg-[#161b22] border border-[#30363d] rounded-2xl">
                <i className={`fas fa-book-open text-[10px] ${isStoryMode ? 'text-purple-500' : 'text-gray-500'}`}></i>
                <button 
                  onClick={() => setIsStoryMode(!isStoryMode)}
                  className={`w-10 h-5 rounded-full relative transition-all ${isStoryMode ? 'bg-purple-600' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isStoryMode ? 'left-6' : 'left-1'}`}></div>
                </button>
                <span className="text-[9px] font-black text-gray-500 uppercase hidden sm:inline">Story Mode</span>
             </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8 space-y-8">
          <div className="max-w-3xl mx-auto space-y-10 pb-16">
            {!currentSession ? (
              <div className="py-24 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-700">
                <div className="relative mb-10">
                  <div className={`absolute inset-0 blur-[60px] rounded-full animate-pulse ${isStoryMode ? 'bg-purple-500/30' : 'bg-blue-500/30'}`}></div>
                  <div className={`relative w-24 h-24 rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-white/10 ${isStoryMode ? 'bg-gradient-to-br from-purple-600 to-indigo-800' : 'bg-gradient-to-br from-blue-600 to-blue-800'}`}>
                    <i className={`fas ${isStoryMode ? 'fa-quill' : 'fa-brain'} text-4xl text-white`}></i>
                  </div>
                </div>
                <h2 className="text-4xl font-black text-white mb-3 uppercase tracking-tighter italic">{isStoryMode ? 'Forge Your Legend' : 'Neural Core Active'}</h2>
                <p className="text-[11px] text-gray-500 font-black uppercase tracking-[0.4em] mb-12">{isStoryMode ? 'Literary Engine v2.0' : 'Frequency Optimized v5.2.1'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl px-4">
                  {(isStoryMode ? [
                    {t: 'Напиши начало темного фэнтези', i: 'fa-dragon'}, 
                    {t: 'Придумай персонажа-киборга', i: 'fa-robot'}, 
                    {t: 'Опиши заброшенный город 2099', i: 'fa-city'}, 
                    {t: 'Создай сюжетный поворот', i: 'fa-random'}
                  ] : [
                    {t: 'Анализ текущих лимитов', i: 'fa-chart-line'}, 
                    {t: 'Что нового в 5.2.1?', i: 'fa-code-branch'}, 
                    {t: 'Нарисуй свой портрет', i: 'fa-user-robot'}, 
                    {t: 'Сгенерируй звук космоса', i: 'fa-satellite'}
                  ]).map(item => (
                    <button key={item.t} onClick={() => setInput(item.t)} className={`p-5 bg-[#161b22] border border-[#30363d] rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex items-center gap-4 group active:scale-95 shadow-lg`}>
                      <i className={`fas ${item.i} ${isStoryMode ? 'text-purple-500' : 'text-blue-500'} group-hover:scale-110 transition-transform`}></i>
                      <span className="flex-1 text-left">{item.t}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              currentSession.messages.map((msg, idx) => (
                <div key={msg.id} className={`flex gap-4 sm:gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 text-[11px] font-black border shadow-2xl ${msg.role === 'user' ? 'bg-[#161b22] border-[#30363d] text-blue-500' : (isStoryMode ? 'bg-purple-600 border-white/10 text-white shadow-purple-600/20' : 'bg-blue-600 border-white/10 text-white shadow-blue-600/20')}`}>
                    {msg.role === 'user' ? 'USR' : (isStoryMode ? 'BARD' : 'NXS')}
                  </div>
                  <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block text-left p-4 sm:p-5 rounded-3xl relative overflow-hidden ${msg.role === 'user' ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/10' : (isStoryMode ? 'bg-[#251b36] border border-purple-500/20 text-gray-200' : 'bg-[#161b22] border border-[#30363d] text-gray-200')}`}>
                      <div className={`prose prose-invert max-w-none text-sm sm:text-base leading-relaxed whitespace-pre-wrap ${isStoryMode ? 'font-serif italic tracking-wide' : 'font-medium'}`}>{msg.content}</div>
                      {msg.imageUrl && (
                         <div className="mt-4 rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                            <img src={msg.imageUrl} className="w-full h-auto object-cover" />
                         </div>
                      )}
                    </div>
                    {msg.role === 'model' && (
                      <div className="mt-3 flex items-center gap-5 justify-start px-2 opacity-60 hover:opacity-100 transition-opacity">
                        <button onClick={() => speakText(msg.content, isStoryMode)} className={`text-[9px] font-black text-gray-500 hover:${isStoryMode ? 'text-purple-500' : 'text-blue-500'} uppercase tracking-[0.2em] flex items-center gap-2 transition-colors`}><i className="fas fa-volume-up"></i> {isStoryMode ? 'Narrate' : 'Synth'}</button>
                        {isStoryMode && idx === currentSession.messages.length - 1 && (
                          <button onClick={() => handleSend(undefined, "Продолжи историю")} className="text-[9px] font-black text-purple-400 hover:text-purple-300 uppercase tracking-[0.2em] flex items-center gap-2 transition-colors animate-pulse"><i className="fas fa-forward"></i> Continue</button>
                        )}
                        <button onClick={() => navigator.clipboard.writeText(msg.content)} className={`text-[9px] font-black text-gray-500 hover:${isStoryMode ? 'text-purple-500' : 'text-blue-500'} uppercase tracking-[0.2em] flex items-center gap-2 transition-colors`}><i className="fas fa-clone"></i> Link</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Input area */}
        <div className={`p-4 sm:p-8 bg-gradient-to-t from-transparent via-transparent to-transparent z-20 shrink-0 ${isStoryMode ? 'from-[#1a1425]' : 'from-[#0d1117]'}`}>
          <div className="max-w-3xl mx-auto relative group">
            {selectedImage && (
              <div className="absolute -top-20 left-4 bg-[#161b22] border border-blue-500/50 p-2 rounded-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 shadow-2xl">
                <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-12 h-12 rounded-xl object-cover" />
                <button onClick={() => setSelectedImage(null)} className="text-red-500 p-2 hover:bg-red-500/10 rounded-xl transition-all"><i className="fas fa-times"></i></button>
              </div>
            )}
            <form onSubmit={handleSend} className="relative flex items-end gap-3">
              <div className="flex-1 relative">
                <button type="button" onClick={() => imageInputRef.current?.click()} className={`absolute left-4 bottom-4 transition-all p-1 active:scale-90 ${isStoryMode ? 'text-purple-500 hover:text-purple-400' : 'text-gray-500 hover:text-blue-500'}`}><i className={`fas ${isStoryMode ? 'fa-palette' : 'fa-plus-circle'} text-xl`}></i></button>
                <textarea
                  className={`w-full border rounded-[2rem] py-5 pl-14 pr-6 text-sm sm:text-base text-white focus:outline-none focus:ring-1 transition-all resize-none min-h-[64px] max-h-48 custom-scrollbar shadow-2xl group-hover:border-[#484f58] ${isStoryMode ? 'bg-[#251b36] border-purple-500/30 focus:ring-purple-500/50' : 'bg-[#161b22] border-[#30363d] focus:ring-blue-500/50'}`}
                  placeholder={isStoryMode ? "What happens next in the chronicle?" : "Neural input required..."}
                  rows={1} value={input}
                  onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 192) + 'px'; }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 1024) { e.preventDefault(); handleSend(e); } }}
                />
              </div>
              <button type="submit" disabled={(!input.trim() && !selectedImage) || isTyping} className={`h-[64px] w-[64px] rounded-full flex items-center justify-center transition-all shadow-xl active:scale-90 shrink-0 ${input.trim() || selectedImage ? (isStoryMode ? 'bg-purple-600 text-white shadow-purple-600/30' : 'bg-blue-600 text-white shadow-blue-600/30') : 'bg-[#21262d] text-gray-700'}`}>
                {isTyping ? <i className="fas fa-circle-notch fa-spin text-xl"></i> : <i className={`fas ${isStoryMode ? 'fa-feather' : 'fa-arrow-up'} text-xl`}></i>}
              </button>
            </form>
          </div>
          <p className="text-center mt-4 text-[8px] font-black text-gray-600 uppercase tracking-[0.3em]">{isStoryMode ? 'The Forge is Burning • Eternal Context' : 'Nexus Core v5.2.1 • Neural Uplink Active'}</p>
        </div>
      </main>
      {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}
    </div>
  );
};

export default Chat;
