import React, { useState } from 'react';
import { Case, Thread, Role } from '../types';
import { generateId } from '../utils';
import ThreadView from './ThreadView';

interface CaseDashboardProps {
  activeCase: Case;
  onUpdateCase: (c: Case) => void;
  onEditCase: () => void;
  onStartVoice: () => void;
  addToast: (msg: string, type?: 'success' | 'error') => void;
}

const CaseDashboard: React.FC<CaseDashboardProps> = ({ activeCase, onUpdateCase, onEditCase, onStartVoice, addToast }) => {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(activeCase.threads[0]?.id || null);

  const activeThread = activeCase.threads.find(t => t.id === activeThreadId) || null;

  const handleCreateThread = () => {
    const newThread: Thread = {
      id: generateId(),
      title: 'New Argument',
      messages: [],
      tokenUsage: 0
    };
    const updatedCase = {
        ...activeCase,
        threads: [...activeCase.threads, newThread]
    };
    onUpdateCase(updatedCase);
    setActiveThreadId(newThread.id);
  };

  const handleDeleteThread = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this thread?")) return;

    const updatedCase = {
        ...activeCase,
        threads: activeCase.threads.filter(t => t.id !== id)
    };
    onUpdateCase(updatedCase);
    if (activeThreadId === id) setActiveThreadId(updatedCase.threads[0]?.id || null);
  };

  const handleUpdateThread = (updatedThread: Thread) => {
      const updatedCase = {
          ...activeCase,
          threads: activeCase.threads.map(t => t.id === updatedThread.id ? updatedThread : t)
      };
      onUpdateCase(updatedCase);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Sidebar */}
      <div className="w-80 flex flex-col gap-6">
        {/* Case Info Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
          <h2 className="font-bold text-slate-900 mb-2 truncate" title={activeCase.title}>{activeCase.title}</h2>
          <div className="flex flex-wrap gap-2 mb-4">
             <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full border border-slate-200">
                {activeCase.materials.length} Documents
             </span>
             <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full border border-slate-200">
                {activeCase.threads.length} Threads
             </span>
          </div>
          <div className="flex gap-2">
             <button onClick={onEditCase} className="flex-1 text-sm bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-lg border border-slate-200 transition">
                Edit Case
             </button>
             <button onClick={onStartVoice} className="flex-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg shadow-sm transition flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                Mock Trial
             </button>
          </div>
        </div>

        {/* Threads List */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-semibold text-slate-700">Threads</h3>
                <button onClick={handleCreateThread} className="text-blue-600 text-sm hover:underline">+ New</button>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {activeCase.threads.map(t => (
                    <div 
                        key={t.id}
                        onClick={() => setActiveThreadId(t.id)}
                        className={`group flex justify-between items-center px-3 py-2.5 rounded-lg cursor-pointer transition ${activeThreadId === t.id ? 'bg-blue-50 border-blue-200 text-blue-900 border' : 'hover:bg-slate-50 text-slate-600 border border-transparent'}`}
                    >
                        <div className="truncate text-sm font-medium pr-2">{t.title || "Untitled Thread"}</div>
                        <button 
                            onClick={(e) => handleDeleteThread(e, t.id)}
                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"
                            title="Delete thread"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                ))}
                {activeCase.threads.length === 0 && (
                    <div className="p-4 text-center text-sm text-slate-400 italic">
                        No threads yet.
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
         {activeThread ? (
             <ThreadView 
                key={activeThread.id} 
                thread={activeThread} 
                caseContext={activeCase}
                onUpdate={handleUpdateThread}
                addToast={addToast}
             />
         ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                 <div className="text-4xl mb-4">💬</div>
                 <p>Select a thread to view arguments</p>
             </div>
         )}
      </div>
    </div>
  );
};

export default CaseDashboard;