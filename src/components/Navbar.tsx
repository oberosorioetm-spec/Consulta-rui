import React from 'react';
import { User as LucideUser, Users, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  activeTab: 'individual' | 'masiva';
  setActiveTab: (tab: 'individual' | 'masiva') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab
}) => {
  return (
    <header className="border-b border-slate-900 bg-slate-950 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
          
          {/* Logo and Brand Title - Simple & Clean */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <ShieldCheck className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-outfit leading-tight">
                Consulta RUI
              </h1>
              <p className="text-xs text-slate-400">
                Ventanilla Social DNP
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center w-full sm:w-auto">
            <nav className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-850 w-full sm:w-auto">
              <button
                id="btn-tab-individual"
                onClick={() => setActiveTab('individual')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'individual'
                    ? 'bg-slate-800 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <LucideUser className="w-3.5 h-3.5" />
                <span>Individual</span>
              </button>

              <button
                id="btn-tab-masiva"
                onClick={() => setActiveTab('masiva')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'masiva'
                    ? 'bg-slate-800 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Masiva</span>
              </button>
            </nav>
          </div>

        </div>
      </div>
    </header>
  );
};
