import React, { useState, useEffect, useRef } from 'react';
import { Thread, Case, Message, Role, Material } from '../types';
import { analyzeArgument } from '../services/geminiService';
import { generateId, estimateTokens, fileToBase64 } from '../utils';

interface ThreadViewProps {
  thread: Thread;
  caseContext: Case;
  onUpdate: (t: Thread) => void;
  addToast: (msg: string, type?: 'success' | 'error') => void;
}

const ThreadView: React.FC<ThreadViewProps> = ({ thread, caseContext, onUpdate, addToast }) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<Material[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalTokens = thread.tokenUsage || 0;
  const TOKEN_LIMIT = 100000; // Arbitrary safe limit for "context usage" visual

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread.messages]);

  const handleGenerateResponse = async (userMsg?: Message) => {
    setIsTyping(true);
    try {
        const currentMessages = userMsg ? [...thread.messages, userMsg] : thread.messages;
        const tempThread = { ...thread, messages: currentMessages };

        const aiResponseText = await analyzeArgument(caseContext, tempThread, userMsg?.attachments || []);
        
        const aiMsg: Message = {
            id: generateId(),
            role: Role.MODEL,
            content: aiResponseText,
            timestamp: Date.now()
        };

        const updatedThread = {
            ...thread,
            messages: [...currentMessages, aiMsg],
            tokenUsage: estimateTokens(aiResponseText) + (thread.tokenUsage || 0)
        };
        onUpdate(updatedThread);
    } catch (error) {
        addToast("Failed to generate AI response", "error");
    } finally {
        setIsTyping(false);
    }
  };

  const handleSend = () => {
    if ((!inputText.trim() && attachments.length === 0) || isTyping) return;

    const newMsg: Message = {
        id: generateId(),
        role: Role.USER,
        content: inputText,
        attachments: [...attachments],
        timestamp: Date.now()
    };

    // Optimistic update
    const updatedThread = {
        ...thread,
        messages: [...thread.messages, newMsg],
        tokenUsage: estimateTokens(inputText) + (thread.tokenUsage || 0),
        title: thread.messages.length === 0 ? inputText.substring(0, 30) : thread.title
    };

    onUpdate(updatedThread);
    setInputText('');
    setAttachments([]);
    
    // Trigger AI
    handleGenerateResponse(newMsg);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const newAtt: Material[] = [];
        for (let i = 0; i < e.target.files.length; i++) {
          const file = e.target.files[i];
          const base64 = await fileToBase64(file);
          newAtt.push({ id: generateId(), name: file.name, type: file.type, data: base64 });
        }
        setAttachments(prev => [...prev, ...newAtt]);
      }
  };

  const handleDeleteAfter = (msgIndex: number) => {
      // Determine if this is the last message to customize the confirmation text
      const isLast = msgIndex === thread.messages.length - 1;
      const confirmMsg = isLast 
        ? "Are you sure you want to delete this message?" 
        : "Deleting this message will also remove all subsequent replies in this thread to maintain context consistency. Continue?";

      if (!window.confirm(confirmMsg)) return;

      // Deletes this message and everything after it
      const newMessages = thread.messages.slice(0, msgIndex);
      onUpdate({ ...thread, messages: newMessages });
  };

  const handleRegenerateLast = () => {
      if (thread.messages.length === 0) return;
      const lastMsg = thread.messages[thread.messages.length - 1];
      
      if (lastMsg.role === Role.MODEL) {
          // Remove last AI message and try again
          const newMessages = thread.messages.slice(0, -1);
          onUpdate({ ...thread, messages: newMessages });
          
          setIsTyping(true);
          const tempThread = { ...thread, messages: newMessages };
          
          analyzeArgument(caseContext, tempThread, [])
            .then(text => {
                const aiMsg: Message = { id: generateId(), role: Role.MODEL, content: text, timestamp: Date.now() };
                onUpdate({ ...tempThread, messages: [...newMessages, aiMsg] });
            })
            .catch(() => addToast("Regeneration failed", "error"))
            .finally(() => setIsTyping(false));
      }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
        <div>
            <h3 className="font-bold text-slate-800">{thread.title || "New Argument"}</h3>
            <p className="text-xs text-slate-500">
                Context Usage: {Math.round((totalTokens / TOKEN_LIMIT) * 100)}% 
                <span className="ml-2 w-16 inline-block h-1 bg-slate-100 rounded-full overflow-hidden align-middle">
                    <span className="block h-full bg-blue-500" style={{ width: `${Math.min(100, (totalTokens / TOKEN_LIMIT) * 100)}%` }}></span>
                </span>
            </p>
        </div>
        <div>
            {thread.messages.length > 0 && thread.messages[thread.messages.length - 1].role === Role.MODEL && (
                <button 
                    onClick={handleRegenerateLast}
                    disabled={isTyping}
                    className="text-xs text-slate-500 hover:text-blue-600 border px-2 py-1 rounded"
                >
                    ↻ Regenerate Last Response
                </button>
            )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50" ref={scrollRef}>
        {thread.messages.map((msg, idx) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === Role.USER ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-xl p-4 shadow-sm relative group ${msg.role === Role.USER ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}`}>
                    {/* Delete/Edit Action */}
                    <button 
                        onClick={() => handleDeleteAfter(idx)}
                        className={`absolute top-2 ${msg.role === Role.USER ? 'left-2 text-blue-200 hover:text-white' : 'right-2 text-slate-300 hover:text-red-500'} opacity-0 group-hover:opacity-100 transition p-1`}
                        title="Delete message"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>

                    <div className="font-semibold text-xs mb-1 opacity-70 uppercase tracking-wider">
                        {msg.role === Role.USER ? 'Defense Attorney' : 'Opposing Counsel'}
                    </div>
                    
                    <div className="whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                    </div>

                    {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/20 space-y-1">
                            {msg.attachments.map(att => (
                                <div key={att.id} className="flex items-center gap-2 text-xs opacity-90 bg-black/10 p-1.5 rounded">
                                    <span>📎</span> {att.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        ))}
        {isTyping && (
            <div className="flex items-start">
                <div className="bg-white border border-slate-200 rounded-xl rounded-bl-none p-4 shadow-sm">
                    <div className="flex gap-1">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map(att => (
                    <div key={att.id} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs flex items-center gap-1">
                        <span className="truncate max-w-[150px]">{att.name}</span>
                        <button onClick={() => setAttachments(prev => prev.filter(p => p.id !== att.id))} className="hover:text-red-500">×</button>
                    </div>
                ))}
            </div>
        )}
        <div className="flex gap-2">
             <label className="p-2 text-slate-400 hover:text-blue-600 cursor-pointer rounded-lg hover:bg-slate-50 transition">
                <input type="file" className="hidden" multiple onChange={handleFileUpload} />
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
             </label>
             <textarea 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                placeholder="Type your argument..."
                className="flex-1 resize-none border-0 focus:ring-0 bg-slate-50 rounded-lg px-4 py-2 max-h-32"
                rows={1}
             />
             <button 
                onClick={handleSend}
                disabled={(!inputText.trim() && attachments.length === 0) || isTyping}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
             >
                Send
             </button>
        </div>
      </div>
    </div>
  );
};

export default ThreadView;