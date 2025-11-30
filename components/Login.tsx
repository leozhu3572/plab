import React, { useState } from 'react';
import { signIn } from '../services/firebase';

export const Login: React.FC = () => {
  const [errorState, setErrorState] = useState<{title: string, message: string, detail?: string} | null>(null);

  const handleSignIn = async () => {
    setErrorState(null);
    try {
      await signIn();
    } catch (e: any) {
      console.error("Sign In Error:", e);
      
      let title = "Sign In Failed";
      let message = "An unexpected error occurred.";
      let detail = e.message;

      if (e.code === 'auth/unauthorized-domain') {
        title = "Domain Not Authorized";
        message = "This domain is not on the whitelist in your Firebase Authentication settings.";
        detail = `Go to Firebase Console > Authentication > Settings > Authorized Domains and add: ${window.location.hostname}`;
      } else if (e.code === 'auth/api-key-not-valid' || e.code === 'auth/project-not-found') {
        title = "Invalid Configuration";
        message = "The Firebase configuration in services/firebase.ts is incorrect.";
        detail = "Please ensure you have replaced the placeholder config with your actual Firebase Project credentials.";
      } else if (e.code === 'auth/popup-closed-by-user') {
        title = "Sign In Cancelled";
        message = "You closed the sign-in popup before finishing.";
        detail = "";
      }

      setErrorState({ title, message, detail });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-center max-w-md w-full">
         <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-3xl font-bold shadow-lg shadow-blue-600/30">P</div>
         <h1 className="text-2xl font-bold text-slate-900 mb-2">Pressure Lab</h1>
         <p className="text-slate-500 mb-8">Sign in to sync your legal cases and mock trials across devices.</p>
         
         {errorState && (
             <div className="bg-red-50 text-red-900 p-4 rounded-lg text-sm mb-6 border border-red-200 text-left">
                 <div className="font-bold flex items-center gap-2 mb-1 text-red-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {errorState.title}
                 </div>
                 <p className="mb-2">{errorState.message}</p>
                 {errorState.detail && (
                     <div className="bg-white/50 p-2 rounded border border-red-100 font-mono text-xs break-all">
                        {errorState.detail}
                     </div>
                 )}
             </div>
         )}

         <button 
            onClick={handleSignIn} 
            className="w-full bg-white border border-slate-300 text-slate-700 font-medium py-3 rounded-lg hover:bg-slate-50 transition flex items-center justify-center gap-3 shadow-sm"
         >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
            Sign in with Google
         </button>
      </div>
    </div>
  );
};

export default Login;