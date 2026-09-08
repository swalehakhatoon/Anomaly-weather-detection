import React from 'react';
import MetricCards from '../components/MetricCards';
import StationMap from '../components/StationMap';
import LiveAnomalyTicker from '../components/LiveAnomalyTicker';
import { Cpu, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Dashboard({
  metrics,
  stations,
  anomalies,
  onSelectStation,
  onOpenExplainability,
  onOpenSimulator
}) {
  return (
    <div className="space-y-4">
      {/* Judge Showcase Quick Banner */}
      <div className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-slate-900 to-rose-950/30 p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-amber-200">
                SIH 2026 Live Demo: Extreme Weather vs. Sensor Failure Showcase
              </h3>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                1-Click Presets Ready
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Demonstrate how VayuDrishti reliably separates true heatwaves from stuck sensors using spatial cross-validation.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenSimulator}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all shrink-0"
        >
          <span>Launch Simulator</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5 KPI Metric Cards */}
      <MetricCards metrics={metrics} />

      {/* Main Grid: 70% Map, 30% Live Ticker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <StationMap
            stations={stations}
            onSelectStation={onSelectStation}
          />
        </div>
        <div className="lg:col-span-4">
          <LiveAnomalyTicker
            anomalies={anomalies}
            onOpenExplainability={onOpenExplainability}
            onSelectStation={onSelectStation}
          />
        </div>
      </div>
    </div>
  );
}
