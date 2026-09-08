import React from 'react';
import { AlertCircle, HelpCircle, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

export default function LiveAnomalyTicker({ anomalies, onOpenExplainability, onSelectStation }) {
  const getBadgeStyle = (classification) => {
    switch (classification) {
      case 'GENUINE_EXTREME':
        return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'SENSOR_FAULT':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'DATA_QUALITY_ISSUE':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'UNCERTAIN':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="flex flex-col h-[520px] rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Real-Time Anomaly Stream
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
          {anomalies.length} Flagged Events
        </span>
      </div>

      {/* Ticker List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2.5">
        {anomalies.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <ShieldAlert className="w-8 h-8 text-emerald-500/40 mb-2" />
            <p className="text-xs font-medium text-slate-400">All Stations Operating Within Bounds</p>
            <p className="text-[10px] text-slate-600 mt-1 max-w-xs">
              Continuous 4-layer validation active. Use the Simulator tab to inject synthetic faults or heatwaves.
            </p>
          </div>
        ) : (
          anomalies.map((anom) => (
            <div
              key={anom.anomaly_id}
              className="p-3 rounded-lg border border-slate-800 bg-slate-950/80 hover:border-slate-700 transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-bold text-xs text-white hover:text-cyan-400 cursor-pointer transition-colors"
                  onClick={() => onSelectStation(anom.station_id)}
                >
                  {anom.station_name}
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${getBadgeStyle(anom.classification)}`}>
                  {anom.classification.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 capitalize">{anom.parameter}:</span>
                <span className="font-bold text-slate-200">
                  {anom.value}{anom.parameter === 'temperature' ? '°C' : anom.parameter === 'humidity' ? '%' : ' mm'}
                  <span className="text-[10px] text-slate-500 ml-1 font-normal">
                    (exp: {anom.expected_range[0]} - {anom.expected_range[1]})
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                <span className="text-slate-500 font-mono text-[10px]">
                  Conf: {Math.round(anom.confidence_score * 100)}%
                </span>
                <button
                  onClick={() => onOpenExplainability(anom)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-medium flex items-center space-x-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Why Flagged?</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
