import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { IndividualQuery } from './components/IndividualQuery';
import { BatchQuery } from './components/BatchQuery';
import { ReportModal } from './components/ReportModal';
import { RuiQueryResult } from './types';
import { initAuth, googleSignIn, logout } from './utils/googleSheetsSync';
import { User } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<'individual' | 'masiva'>('individual');
  const [serverStatus, setServerStatus] = useState<'connected' | 'checking' | 'fallback'>('checking');
  const [selectedResult, setSelectedResult] = useState<RuiQueryResult | null>(null);
  
  // Google Sheets / Firebase Auth states
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  useEffect(() => {
    // Check server health
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          setServerStatus('connected');
        } else {
          setServerStatus('fallback');
        }
      })
      .catch(() => {
        setServerStatus('fallback');
      });

    // Initialize silent auth state listener
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
      },
      () => {
        setUser(null);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
      }
    } catch (err) {
      console.error('Error logging in to Google Sheets:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Top App Bar & Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'individual' && <IndividualQuery />}
        {activeTab === 'masiva' && <BatchQuery onViewDetail={(res) => setSelectedResult(res)} />}
      </main>

      {/* Detail Modal for Selected Batch Row */}
      {selectedResult && (
        <ReportModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            &copy; 2026 <strong>Consulta RUI</strong> — Autor: Ober Osorio.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>DNP Ventanilla Social</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
