import React from 'react';
import { ViewState, Case } from '../types';
import { logOut, auth } from '../services/firebase';

interface LayoutProps {
  children: React.ReactNode;
  view: ViewState;
  onNavigate: (v: ViewState) => void;
  activeCase: Case | null;
}

const Layout: React.FC<LayoutProps> = ({ children, view, onNavigate, activeCase }) => {
  const user = auth.currentUser;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('HOME')}>
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold">P</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Pressure Lab</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-4 hidden sm:flex">
                <button 
                    onClick={() => onNavigate('HOME')}
                    className={`text-sm font-medium hover:text-blue-400 transition ${view === 'HOME' ? 'text-blue-400' : 'text-slate-300'}`}
                >
                    Cases
                </button>
                {activeCase && (
                    <>
                        <span className="text-slate-600">/</span>
                        <span className="text-sm font-medium text-white truncate max-w-[200px]">
                            {activeCase.title}
                        </span>
                    </>
                )}
            </nav>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-700 ml-4">
                {user?.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-slate-600" />
                ) : (
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs">
                        {user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                )}
                <button 
                    onClick={logOut}
                    className="text-xs text-slate-400 hover:text-white transition border border-slate-700 rounded px-2 py-1"
                >
                    Sign Out
                </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;