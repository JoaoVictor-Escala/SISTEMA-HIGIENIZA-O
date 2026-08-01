import React, { useState, useRef, useEffect } from 'react';
import { Send, ImagePlus, X, Bot, User, Sparkles, Trash2, Loader2, Plus, MessageSquare } from 'lucide-react';
import { askConsultantAI, getAiHistory, getAiSessions, deleteAiSession } from '../api';

export default function ConsultorIA() {
    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingHistory, setIsFetchingHistory] = useState(true);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Load Sessions on mount
    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const data = await getAiSessions();
                setSessions(data || []);
                if (data && data.length > 0) {
                    setActiveSessionId(data[0].id);
                } else {
                    setIsFetchingHistory(false);
                    setMessages([{ id: 1, role: 'ai', text: 'Olá! Sou seu **Consultor de Higienização**. Envie uma foto de uma mancha ou estofado e me diga o que deseja limpar.' }]);
                }
            } catch (e) {
                console.error("Erro ao carregar sessões", e);
                setIsFetchingHistory(false);
            }
        };
        fetchSessions();
    }, []);

    // Load Messages when activeSessionId changes
    useEffect(() => {
        if (!activeSessionId) return;
        
        const fetchHistory = async () => {
            setIsFetchingHistory(true);
            try {
                const history = await getAiHistory(activeSessionId);
                if (history && history.length > 0) {
                    setMessages(history);
                } else {
                    setMessages([{ id: 1, role: 'ai', text: 'Olá! Sou seu **Consultor de Higienização**. Envie uma foto de uma mancha ou estofado e me diga o que deseja limpar.' }]);
                }
            } catch (e) {
                console.error("Erro ao carregar histórico", e);
            } finally {
                setIsFetchingHistory(false);
            }
        };
        fetchHistory();
    }, [activeSessionId]);

    useEffect(() => {
        if (!isFetchingHistory) {
            scrollToBottom();
        }
    }, [messages, isLoading, isFetchingHistory]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleNewChat = () => {
        setActiveSessionId(null);
        setMessages([{ id: 1, role: 'ai', text: 'Olá! Sou seu **Consultor de Higienização**. Envie uma foto de uma mancha ou estofado e me diga o que deseja limpar.' }]);
        setInput('');
        setImagePreview(null);
    };

    const handleDeleteSession = (e, sessionId) => {
        e.stopPropagation();
        setDeleteConfirmId(sessionId);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        const sessionId = deleteConfirmId;
        setDeleteConfirmId(null);
        
        try {
            await deleteAiSession(sessionId);
            const newSessions = sessions.filter(s => s.id !== sessionId);
            setSessions(newSessions);
            if (activeSessionId === sessionId) {
                if (newSessions.length > 0) {
                    setActiveSessionId(newSessions[0].id);
                } else {
                    handleNewChat();
                }
            }
        } catch {
            alert('Erro ao apagar chat');
        }
    };

    const handleSend = async () => {
        if (!input.trim() && !imagePreview) return;

        const userMsg = { id: Date.now(), role: 'user', text: input, image: imagePreview };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setImagePreview(null);
        setIsLoading(true);

        try {
            const res = await askConsultantAI(userMsg.text, userMsg.image, activeSessionId);
            setMessages(prev => [...prev, { id: res.id || Date.now(), role: 'ai', text: res.response }]);
            
            // If it was a new session, backend returns the newly created sessionId and title
            if (res.sessionCreated) {
                setActiveSessionId(res.sessionId);
                setSessions(prev => [{ id: res.sessionId, title: res.sessionTitle, created_at: new Date().toISOString() }, ...prev]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now(), role: 'system', text: `❌ Erro: ${error.message}. Verifique a API.` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMarkdown = (text) => {
        if (!text) return null;
        const parts = text.split(/\*\*(.*?)\*\*/g);
        return parts.map((part, i) => {
            if (i % 2 === 1) return <strong key={i}>{part}</strong>;
            return <span key={i}>{part.split('\n').map((line, j) => <React.Fragment key={j}>{line}{j !== part.split('\n').length - 1 && <br/>}</React.Fragment>)}</span>;
        });
    };

    return (
        <div className="flex h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
            
            {/* Sidebar (Sessions) - Hidden on very small screens, visible on md+ */}
            <div className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shrink-0">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <button 
                        onClick={handleNewChat}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm shadow-blue-500/20"
                    >
                        <Plus size={18} />
                        Novo Chat
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {sessions.map(session => (
                        <div 
                            key={session.id}
                            onClick={() => setActiveSessionId(session.id)}
                            className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${activeSessionId === session.id ? 'bg-slate-100 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-750'}`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <MessageSquare size={16} className={activeSessionId === session.id ? 'text-blue-600' : 'text-slate-400'} />
                                <span className={`truncate text-[14px] ${activeSessionId === session.id ? 'font-medium text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                    {session.title}
                                </span>
                            </div>
                            <button 
                                onClick={(e) => handleDeleteSession(e, session.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-all"
                                title="Apagar Chat"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    
                    {sessions.length === 0 && (
                        <div className="text-center p-6 text-slate-400 text-sm">
                            Nenhum chat anterior.
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 dark:text-white">Consultor IA</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Especialista Químico em Higienização</p>
                        </div>
                    </div>
                    {/* Mobile New Chat Button */}
                    <button onClick={handleNewChat} className="md:hidden flex items-center gap-2 p-2 px-3 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-slate-700 dark:text-blue-400 rounded-lg transition-colors">
                        <Plus size={16} />
                        <span className="hidden sm:inline">Novo</span>
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50 dark:bg-slate-900">
                    {isFetchingHistory ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                        </div>
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex gap-3 max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-md'}`}>
                                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                        </div>
                                        
                                        <div className={`rounded-2xl px-5 py-3 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : msg.role === 'system' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'}`}>
                                            {msg.image && (
                                                <img src={msg.image} alt="Upload" className="max-w-[240px] rounded-lg mb-2 shadow-sm border border-slate-200" />
                                            )}
                                            <div className="text-[14.5px] leading-relaxed">
                                                {renderMarkdown(msg.text)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="flex gap-3 max-w-[85%]">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-md flex items-center justify-center shrink-0">
                                            <Bot size={16} />
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex items-center gap-2">
                                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
                    {imagePreview && (
                        <div className="mb-3 relative inline-block">
                            <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded-xl border-2 border-blue-500 shadow-md" />
                            <button onClick={removeImage} className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 shadow-lg hover:bg-slate-700 transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                            title="Anexar imagem"
                        >
                            <ImagePlus size={22} />
                        </button>
                        <input 
                            type="file" 
                            accept="image/*" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleImageUpload} 
                        />
                        
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Descreva a mancha..."
                            className="flex-1 bg-slate-100 dark:bg-slate-900 border-none rounded-full px-4 py-2.5 sm:px-5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-[14px] sm:text-[15px] dark:text-white transition-shadow min-w-0"
                        />
                        
                        <button 
                            onClick={handleSend}
                            disabled={(!input.trim() && !imagePreview) || isLoading}
                            className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-md shadow-blue-600/20"
                        >
                            <Send size={20} className={input.trim() || imagePreview ? 'translate-x-[2px]' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Apagar Chat</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                Tem certeza que deseja apagar este chat? Esta ação não pode ser desfeita.
                            </p>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                            <button 
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm shadow-red-600/20"
                            >
                                Sim, Apagar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
