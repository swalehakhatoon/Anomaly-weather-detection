import React from 'react';
import { Activity, ShieldAlert, Cpu, Radio, Database, MapPin } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, istTime, criticalAlertsCount }) {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & MoES identity */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-300 bg-clip-text text-transparent">
                  VayuDrishti AI
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  वायु-दृष्टि
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                MoES • IMD National AWS Quality-Control Surveillance
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>National Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 relative ${
                activeTab === 'alerts'
                  ? 'bg-slate-800 text-rose-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Alerts & Triage</span>
              {criticalAlertsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                  {criticalAlertsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border shadow-md ${
                activeTab === 'simulator'
                  ? 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/10'
                  : 'text-amber-400/90 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>⚡ Judge Demo Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab('api')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === 'api'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Trust Score API</span>
            </button>
          </nav>

          {/* Telemetry Status & Clock */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-3"></span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold tracking-wider">
                LIVE GPRS/INSAT
              </span>
            </div>
            <div className="hidden lg:block text-right">
              <div className="text-[11px] font-mono text-slate-300 font-medium">
                {istTime || 'IST ACTIVE'}
              </div>
              <div className="text-[9px] text-slate-500 font-mono">
                SIH 2026 EVALUATION
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
