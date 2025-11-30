import { onAuthStateChanged, User } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { auth, deleteCaseFromFirestore, logEvent, saveCaseToFirestore, setAnalyticsUserId, setAnalyticsUserProperties, subscribeToCases } from './services/firebase';
import { Case, Toast, ViewState } from './types';
import { generateId } from './utils';

// Components
import CaseDashboard from './components/CaseDashboard';
import CaseEditor from './components/CaseEditor';
import CaseList from './components/CaseList';
import Layout from './components/Layout';
import Login from './components/Login';
import VoiceSession from './components/VoiceSession';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [view, setView] = useState<ViewState>('HOME');
  const [cases, setCases] = useState<Case[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [showVoiceSession, setShowVoiceSession] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const activeCase = cases.find(c => c.id === activeCaseId) || null;

  // Capture URL parameters on first load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userProperties: Record<string, any> = {};

    // Capture UTM parameters
    const utmSource = urlParams.get('utm_source');
    const utmMedium = urlParams.get('utm_medium');
    const utmCampaign = urlParams.get('utm_campaign');
    const source = urlParams.get('source');

    if (utmSource) userProperties.utm_source = utmSource;
    if (utmMedium) userProperties.utm_medium = utmMedium;
    if (utmCampaign) userProperties.utm_campaign = utmCampaign;
    if (source) userProperties.source = source;

    // Set user properties if we have any
    if (Object.keys(userProperties).length > 0) {
      setAnalyticsUserProperties(userProperties);
    }
  }, []); // Run only once on mount

  // Track view changes
  useEffect(() => {
    if (user) {
      logEvent('screen_view', { screen_name: view });

      // Track case_viewed when navigating to CASE_DETAIL
      if (view === 'CASE_DETAIL' && activeCase) {
        logEvent('case_viewed', {
          case_id: activeCase.id,
          case_name: activeCase.title
        });
      }
    }
  }, [view, user, activeCase]);

  // Track voice session start/end
  useEffect(() => {
    if (showVoiceSession && activeCaseId) {
      logEvent('voice_session_started', { case_id: activeCaseId });
    }
  }, [showVoiceSession, activeCaseId]);

  // 1. Listen for Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        setAnalyticsUserId(currentUser.uid);
        logEvent('login', { method: 'google' });
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Listen for Database Changes (Real-time)
  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToCases((updatedCases) => {
        setCases(updatedCases);
      });
      return () => unsubscribe();
    } else {
      setCases([]);
    }
  }, [user]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleSaveCase = async (updatedCase: Case) => {
    // Optimistic Update (UI updates immediately, but real source of truth is the Listener above)
    // We actually don't need to manually setCases here because the listener will do it,
    // but for immediate feedback on 'Create', we handle navigation.

    try {
        await saveCaseToFirestore(updatedCase);

        if (view === 'CREATE_CASE') {
            logEvent('case_created', { case_id: updatedCase.id });
            setActiveCaseId(updatedCase.id);
            setView('CASE_DETAIL');
            addToast("Case created successfully", "success");
        } else {
            logEvent('case_updated', { case_id: updatedCase.id });
            addToast("Case updated", "success");
        }
    } catch (error) {
        console.error("Save failed", error);
        addToast("Failed to save changes", "error");
    }
  };

  const handleDeleteCase = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this case? This action cannot be undone.")) {
        return;
    }

    try {
        await deleteCaseFromFirestore(id);
        logEvent('case_deleted', { case_id: id });
        if (activeCaseId === id) {
            setActiveCaseId(null);
            setView('HOME');
        }
        addToast("Case deleted", "info");
    } catch (error) {
        addToast("Failed to delete case", "error");
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div></div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Voice Overlay */}
      {showVoiceSession && activeCase && (
        <VoiceSession 
          activeCase={activeCase} 
          onClose={() => setShowVoiceSession(false)} 
        />
      )}

      {/* Main Layout */}
      <Layout 
        view={view} 
        onNavigate={setView}
        activeCase={activeCase}
      >
        {view === 'HOME' && (
          <CaseList 
            cases={cases} 
            onCreate={() => setView('CREATE_CASE')}
            onSelect={(id) => { setActiveCaseId(id); setView('CASE_DETAIL'); }}
            onDelete={handleDeleteCase}
          />
        )}

        {view === 'CREATE_CASE' && (
          <CaseEditor 
            onSave={handleSaveCase} 
            onCancel={() => setView('HOME')} 
          />
        )}

        {view === 'EDIT_CASE' && activeCase && (
          <CaseEditor 
            initialCase={activeCase}
            onSave={(c) => { handleSaveCase(c); setView('CASE_DETAIL'); }} 
            onCancel={() => setView('CASE_DETAIL')} 
          />
        )}

        {view === 'CASE_DETAIL' && activeCase && (
          <CaseDashboard 
            activeCase={activeCase}
            onUpdateCase={handleSaveCase}
            onEditCase={() => setView('EDIT_CASE')}
            onStartVoice={() => setShowVoiceSession(true)}
            addToast={addToast}
          />
        )}
      </Layout>

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-fade-in-up ${
            t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
          }`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;