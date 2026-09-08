import React, { useState } from 'react';
import { X, Sparkles, AlertTriangle, ShieldCheck, Wrench, CheckCircle, Info } from 'lucide-react';
import { submitFeedback } from '../services/api';

export default function ExplainabilityDrawer({ anomaly, onClose, onFeedbackSubmitted }) {
  const [submitting, setSubmitting] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState('');

  if (!anomaly) return null;

  const handleAction = async (action) => {
    setSubmitting(true);
    try {
      await submitFeedback(anomaly.anomaly_id, action, feedbackNote);
      if (onFeedbackSubmitted) onFeedbackSubmitted();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const getClassificationBadge = (cls) => {
    switch (cls) {
      case 'GENUINE_EXTREME':
        return {
          title: 'GENUINE EXTREME WEATHER',
          badge: 'bg-purple-950 text-purple-300 border-purple-800',
          desc: 'Corroborated by spatial neighbors and multi-sensor atmospheric physics.'
        };
      case 'SENSOR_FAULT':
        return {
          title: 'SENSOR HARDWARE MALFUNCTION',
          badge: 'bg-rose-950 text-rose-300 border-rose-800',
          desc: 'Isolated reading; divergence from neighboring stations under same synoptic regime.'
        };
      case 'DATA_QUALITY_ISSUE':
        return {
          title: 'PHYSICAL RULE VIOLATION / DATA QUALITY',
          badge: 'bg-amber-950 text-amber-300 border-amber-800',
          desc: 'Deterministic bounds exceeded (e.g., supersaturation or negative rainfall).'
        };
      default:
        return {
          title: 'UNCERTAIN — HUMAN TRIAGE REQUIRED',
          badge: 'bg-cyan-950 text-cyan-300 border-cyan-800',
          desc: 'Conflicting signals or sparse geographic station density; binary guess prevented.'
        };
    }
  };

  const info = getClassificationBadge(anomaly.classification);

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Explainable AI (XAI) Diagnostic</h2>
              <p className="text-[10px] text-slate-400 font-mono">Event ID: {anomaly.anomaly_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Station Summary */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white">{anomaly.station_name}</span>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono border ${info.badge}`}>
                {info.title}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{info.desc}</p>
          </div>

          {/* Core Observation */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400">Observed Value</span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {anomaly.value} {anomaly.parameter === 'temperature' ? '°C' : anomaly.parameter === 'humidity' ? '%' : 'mm'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400">Expected Baseline</span>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                {anomaly.expected_range[0]} - {anomaly.expected_range[1]}
              </div>
            </div>
          </div>

          {/* Feature Attribution Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>Multi-Layer Factor Attribution</span>
            </h4>

            {/* Level 1 Rule Penalty */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Level 1: Physical Rule Bounds</span>
                <span className={`font-mono font-bold ${anomaly.rule_violation ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {anomaly.rule_violation ? 'VIOLATED (Penalty 1.0)' : 'PASSED (0.0)'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${anomaly.rule_violation ? 'bg-rose-500 w-full' : 'bg-emerald-500 w-0'}`}
                ></div>
              </div>
            </div>

            {/* Level 2 Z-score */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Level 2: Statistical Z-Score / MAD</span>
                <span className="font-mono font-bold text-amber-400">
                  {anomaly.z_score ? `${anomaly.z_score}σ` : 'Nominal'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${Math.min(100, ((anomaly.z_score || 0) / 5) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Level 3 Isolation Forest */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Level 3: ML Isolation Forest Score</span>
                <span className="font-mono font-bold text-cyan-400">
                  {anomaly.ml_score ? anomaly.ml_score : '0.25'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all"
                  style={{ width: `${Math.min(100, (anomaly.ml_score || 0.25) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Level 4 Spatial Agreement */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Level 4: Spatial Neighbor Agreement</span>
                <span className={`font-mono font-bold ${anomaly.spatial_agreement >= 0.7 ? 'text-purple-400' : 'text-rose-400'}`}>
                  {Math.round((anomaly.spatial_agreement || 0.1) * 100)}% Agreement
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${anomaly.spatial_agreement >= 0.7 ? 'bg-purple-500' : 'bg-rose-500'} transition-all`}
                  style={{ width: `${(anomaly.spatial_agreement || 0.1) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Plain-Language Diagnostic Findings */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Diagnostic Evidence Log
            </h4>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5 text-slate-300">
              {anomaly.contributing_factors.map((factor, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Operational Action */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
              <Wrench className="w-3.5 h-3.5" />
              <span>Recommended Operational Protocol</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {anomaly.recommended_action}
            </p>
          </div>

          {/* Human-in-the-Loop Analyst Verification */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Analyst Triage & Feedback Loop
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                Status: {anomaly.verification_status}
              </span>
            </div>

            <input
              type="text"
              placeholder="Add optional notes for retraining audit..."
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              className="w-full text-xs p-2 rounded bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />

            <div className="grid grid-cols-3 gap-2">
              <button
                disabled={submitting}
                onClick={() => handleAction('CONFIRM_FAULT')}
                className="py-2 px-2 rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-colors text-center"
              >
                Confirm Fault
              </button>
              <button
                disabled={submitting}
                onClick={() => handleAction('CONFIRM_EXTREME')}
                className="py-2 px-2 rounded bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition-colors text-center"
              >
                Validate Extreme
              </button>
              <button
                disabled={submitting}
                onClick={() => handleAction('DISMISS')}
                className="py-2 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors text-center"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
