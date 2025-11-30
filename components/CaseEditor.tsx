import React, { useState } from 'react';
import { Case, Material, Thread, Role, Message } from '../types';
import { generateId, fileToBase64, estimateTokens } from '../utils';
import { analyzeArgument } from '../services/geminiService';
import { logEvent } from '../services/firebase';

interface CaseEditorProps {
  initialCase?: Case;
  onSave: (c: Case) => void;
  onCancel: () => void;
}

const MAX_FILE_SIZE_MB = 0.8; // Firestore doc limit is 1MB. We leave room for text.
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const CaseEditor: React.FC<CaseEditorProps> = ({ initialCase, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialCase?.title || '');
  const [background, setBackground] = useState(initialCase?.background || '');
  const [materials, setMaterials] = useState<Material[]>(initialCase?.materials || []);
  const [initialThreads, setInitialThreads] = useState<string[]>(initialCase ? [] : ['']); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newMaterials: Material[] = [];
      let errorMsg = '';

      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        
        if (file.size > MAX_FILE_SIZE_BYTES) {
          errorMsg += `"${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit for cloud storage.\n`;
          continue;
        }

        try {
          const base64 = await fileToBase64(file);
          newMaterials.push({
            id: generateId(),
            name: file.name,
            type: file.type,
            data: base64
          });
        } catch (err) {
          console.error("File upload failed", err);
        }
      }
      
      if (errorMsg) {
        alert(errorMsg + "Please upload smaller files or compress images.");
      }

      setMaterials(prev => [...prev, ...newMaterials]);
    }
  };

  const removeMaterial = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  const handleSave = async () => {
    if (!title || !background) return;

    setIsSubmitting(true);
    setLoadingMessage("Preparing case files...");

    const caseId = initialCase?.id || generateId();
    
    // Construct the case object immediately so we can pass it to the AI for context
    const baseCase: Case = {
      id: caseId,
      title,
      background,
      materials,
      threads: initialCase?.threads || [],
      createdAt: initialCase?.createdAt || Date.now(),
      lastUpdated: Date.now()
    };

    // If it's a new case and we have initial thread inputs, process them with AI
    if (!initialCase && initialThreads.length > 0) {
       const validArguments = initialThreads.filter(arg => arg.trim().length > 0);
       const processedThreads: Thread[] = [];

       // Track argument submission
       if (validArguments.length > 0) {
         logEvent('argument_submitted', {
           case_id: caseId,
           argument_count: validArguments.length
         });
       }

       for (let i = 0; i < validArguments.length; i++) {
         const arg = validArguments[i];
         setLoadingMessage(`Analyzing Argument ${i + 1} of ${validArguments.length}...`);

         const threadId = generateId();
         const userMsg: Message = {
            id: generateId(),
            role: Role.USER,
            content: arg,
            timestamp: Date.now()
         };

         // Temporary thread structure for the AI service
         const tempThread: Thread = {
            id: threadId,
            title: arg.substring(0, 50) + (arg.length > 50 ? '...' : ''),
            messages: [userMsg],
            tokenUsage: 0
         };

         try {
             // 1. Call AI to analyze the argument against the case background/materials
             const responseText = await analyzeArgument(baseCase, tempThread, []);
             
             // 2. Create the AI response message
             const aiMsg: Message = {
                 id: generateId(),
                 role: Role.MODEL,
                 content: responseText,
                 timestamp: Date.now() + 1000
             };

             // 3. Finalize thread
             tempThread.messages.push(aiMsg);
             tempThread.tokenUsage = estimateTokens(arg + responseText);
             processedThreads.push(tempThread);

         } catch (err) {
             console.error(`Error analyzing argument ${i}:`, err);
             // Fallback: If AI fails, still create the thread but maybe with an error note or just the user msg
             const errorMsg: Message = {
                 id: generateId(),
                 role: Role.MODEL,
                 content: "[System] AI analysis failed temporarily. You can regenerate this response in the dashboard.",
                 timestamp: Date.now()
             };
             tempThread.messages.push(errorMsg);
             processedThreads.push(tempThread);
         }
       }
       baseCase.threads = processedThreads;
    }

    // Double check size before saving
    try {
      const jsonString = JSON.stringify(baseCase);
      const sizeBytes = new Blob([jsonString]).size;
      if (sizeBytes > 1000000) {
         alert("Case data is too large for the database. Please remove some images or reduce content.");
         setIsSubmitting(false);
         return;
      }
      
      onSave(baseCase);
    } catch (e) {
      console.error("Submission error", e);
      setIsSubmitting(false);
    }
    
    // Note: onSave usually handles navigation, so we might stay submitting until unmount
    setLoadingMessage('');
  };

  return (
    <div className="relative max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm">
            <div className="w-16 h-16 mb-4 relative">
                 <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Creating Case Simulation</h3>
            <p className="text-slate-500 animate-pulse">{loadingMessage}</p>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-6 text-slate-900">{initialCase ? 'Edit Case' : 'Create New Case'}</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Case Title</label>
          <input 
            type="text" 
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            placeholder="e.g. Smith v. Jones - Liability Dispute"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Case Background</label>
          <textarea 
            value={background}
            onChange={e => setBackground(e.target.value)}
            rows={6}
            disabled={isSubmitting}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            placeholder="Describe the facts of the case, the timeline, and the key parties involved..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Materials (PDF, Images, Text)</label>
          <p className="text-xs text-slate-500 mb-2">Maximum size per file: 800KB. Files are stored securely in the case dossier.</p>
          <div className={`border-2 border-dashed border-slate-300 rounded-lg p-6 text-center transition ${isSubmitting ? 'opacity-50' : 'hover:bg-slate-50'}`}>
             <input type="file" multiple onChange={handleFileUpload} className="hidden" id="file-upload" accept=".pdf,image/*,.txt" disabled={isSubmitting} />
             <label htmlFor="file-upload" className={`cursor-pointer text-blue-600 font-medium hover:underline ${isSubmitting ? 'cursor-not-allowed' : ''}`}>
               Upload files
             </label>
             <span className="text-slate-500 ml-1">or drag and drop</span>
          </div>
          {materials.length > 0 && (
            <ul className="mt-3 space-y-2">
              {materials.map(m => (
                <li key={m.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded text-sm">
                  <span className="truncate max-w-xs" title={m.name}>{m.name}</span>
                  <button onClick={() => removeMaterial(m.id)} disabled={isSubmitting} className="text-red-500 hover:text-red-700 disabled:opacity-50">✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!initialCase && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Initial Arguments (Threads)</label>
            <p className="text-xs text-slate-500 mb-3">Enter your arguments. The AI Opposing Counsel will analyze and respond to each one upon creation.</p>
            {initialThreads.map((thread, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input 
                  type="text"
                  value={thread}
                  disabled={isSubmitting}
                  onChange={e => {
                    const newThreads = [...initialThreads];
                    newThreads[idx] = e.target.value;
                    setInitialThreads(newThreads);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50"
                  placeholder="Enter an argument..."
                />
                {initialThreads.length > 1 && (
                  <button 
                    onClick={() => setInitialThreads(prev => prev.filter((_, i) => i !== idx))}
                    disabled={isSubmitting}
                    className="text-slate-400 hover:text-red-500 px-2 disabled:opacity-50"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button 
              onClick={() => setInitialThreads(prev => [...prev, ''])}
              disabled={isSubmitting}
              className="text-sm text-blue-600 font-medium hover:underline mt-1 disabled:opacity-50"
            >
              + Add another argument
            </button>
          </div>
        )}

        <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
          <button 
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!title || !background || isSubmitting}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? 'Analyzing & Saving...' : initialCase ? 'Update Case' : 'Create & Analyze'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaseEditor;