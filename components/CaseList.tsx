import React from 'react';
import { Case } from '../types';

interface CaseListProps {
  cases: Case[];
  onCreate: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const CaseList: React.FC<CaseListProps> = ({ cases, onCreate, onSelect, onDelete }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold text-slate-900">Your Cases</h2>
            <p className="text-slate-500 mt-1">Manage your mock trial simulations.</p>
        </div>
        <button 
            onClick={onCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition flex items-center gap-2"
        >
            <span>+ New Case</span>
        </button>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📁</div>
            <h3 className="text-lg font-medium text-slate-900">No cases yet</h3>
            <p className="text-slate-500 mb-6">Create your first case to start practicing.</p>
            <button 
                onClick={onCreate}
                className="text-blue-600 font-medium hover:underline"
            >
                Create a case now
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map(c => (
                <div key={c.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden group">
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-semibold text-slate-900 line-clamp-1" title={c.title}>{c.title}</h3>
                            <div className="relative">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                                    className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition"
                                    title="Delete Case"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                        <p className="text-slate-500 text-sm mb-4 line-clamp-3 h-14">{c.background}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-6">
                            <span className="flex items-center gap-1">
                                📄 {c.materials.length} Materials
                            </span>
                            <span className="flex items-center gap-1">
                                💬 {c.threads.length} Threads
                            </span>
                        </div>

                        <button 
                            onClick={() => onSelect(c.id)}
                            className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium py-2 rounded-lg border border-slate-200 transition"
                        >
                            Open Case
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default CaseList;
