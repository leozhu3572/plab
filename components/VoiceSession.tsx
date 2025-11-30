import React, { useEffect, useRef, useState } from 'react';
import { Case } from '../types';
import { LiveClient } from '../services/liveClient';
import { generateVoiceDossier } from '../services/geminiService';

interface VoiceSessionProps {
  activeCase: Case;
  onClose: () => void;
}

const VoiceSession: React.FC<VoiceSessionProps> = ({ activeCase, onClose }) => {
  const [status, setStatus] = useState<'initializing' | 'ready' | 'connected' | 'error'>('initializing');
  const [errorMessage, setErrorMessage] = useState('');
  const [transcript, setTranscript] = useState<{text: string, isUser: boolean}[]>([]);
  const liveClientRef = useRef<LiveClient | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initSession = async () => {
      try {
        setErrorMessage('');
        // 1. Generate Dossier
        setStatus('initializing');
        const systemInstruction = await generateVoiceDossier(activeCase);
        
        // 2. Connect Live Client
        liveClientRef.current = new LiveClient();
        
        liveClientRef.current.onTranscriptUpdate = (text, isUser) => {
             setTranscript(prev => {
                 const last = prev[prev.length - 1];
                 // Simple concatenation for this demo if logic matches
                 return [...prev, { text, isUser }];
             });
             
             if (containerRef.current) {
                 containerRef.current.scrollTop = containerRef.current.scrollHeight;
             }
        };
        
        liveClientRef.current.onConnectionStateChange = (connected) => {
            if (connected) {
                setStatus('connected');
            } else {
                // If we were connected and lost it, it might be a close event
                if (status === 'connected') onClose();
            }
        };

        await liveClientRef.current.connect(systemInstruction);
      } catch (e: any) {
        console.error(e);
        setErrorMessage(e.message || "Failed to establish connection.");
        setStatus('error');
      }
    };

    initSession();

    return () => {
      liveClientRef.current?.disconnect();
    };
  }, [activeCase]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[80vh] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
          <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`}></span>
                Mock Trial - Live Session
              </h2>
              <p className="text-slate-400 text-sm">{activeCase.title}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white px-3 py-1 hover:bg-slate-700 rounded-lg transition"
          >
            End Session
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col relative">
          
          {/* Visualizer Area */}
          <div className="flex-1 flex items-center justify-center relative">
             {status === 'initializing' && (
                 <div className="text-blue-400 animate-pulse flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    Preparing Case Dossier...
                 </div>
             )}
             {status === 'error' && (
                 <div className="text-red-400 max-w-md text-center px-4">
                    <div className="text-3xl mb-2">⚠️</div>
                    <p className="font-bold mb-1">Connection Failed</p>
                    <p className="text-sm text-red-300 opacity-80">{errorMessage}</p>
                    <p className="text-xs text-slate-500 mt-4">Check microphone permissions and API Keys.</p>
                 </div>
             )}
             {status === 'connected' && (
                 <div className="relative w-64 h-64 flex items-center justify-center">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                    <div className="absolute inset-4 bg-blue-500/30 rounded-full animate-pulse delay-75"></div>
                    <div className="relative z-10 w-32 h-32 bg-slate-800 rounded-full border-4 border-blue-500 flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.5)]">
                        <svg className="w-16 h-16 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                    </div>
                 </div>
             )}
          </div>

          {/* Transcript Overlay */}
          <div className="h-48 bg-black/40 backdrop-blur-md border-t border-slate-700 p-6 overflow-y-auto" ref={containerRef}>
              <div className="space-y-2">
                  {transcript.map((t, i) => (
                      <div key={i} className={`text-sm ${t.isUser ? 'text-blue-300 text-right' : 'text-slate-200 text-left'}`}>
                          <span className="font-bold text-xs opacity-50 block mb-0.5">{t.isUser ? 'YOU' : 'OPPOSING COUNSEL'}</span>
                          {t.text}
                      </div>
                  ))}
                  {transcript.length === 0 && status === 'connected' && (
                      <p className="text-slate-500 text-center italic text-sm">Start speaking to begin the argument...</p>
                  )}
              </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default VoiceSession;