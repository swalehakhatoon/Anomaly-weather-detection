import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Sparkles, Filter, Check, Wrench, Flame } from 'lucide-react';
import { fetchAlerts, submitFeedback } from '../services/api';

export default function AlertsPage({ onOpenExplainability, onSelectStation }) {
  const [alerts, setAlerts] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterClassification, setFilterClassification] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      const data = await fetchAlerts(filterSeverity);
      setAlerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 4000);
    return () => clearInterval(interval);
  }, [filterSeverity]);

  const handleAction = async (alertId, action) => {
    try {
      await submitFeedback(alertId, action);
      loadAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterClassification && a.classification !== filterClassification) return false;
    return true;
  });

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse';
      case 'HIGH':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'MEDIUM':
        return 'bg-sky-950 text-sky-300 border-sky-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getClassificationBadge = (cls) => {
    switch (cls) {
      case 'GENUINE_EXTREME':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'SENSOR_FAULT':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'DATA_QUALITY_ISSUE':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      default:
        return 'bg-cyan-950 text-cyan-300 border-cyan-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>National Anomaly & Incident Triage Console</span>
          </h2>
          <p className="text-xs text-slate-400">
            Active alerts prioritized by severity. Human verification feeds directly into retraining feedback loop.
          </p>
        </div>

        {/* Severity Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-mono flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Severity:</span>
          </span>
          {['', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                filterSeverity === sev
                  ? 'bg-cyan-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {sev || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 rounded-xl border border-slate-800 bg-slate-900/40 text-center text-slate-500">
            <CheckCircle className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-300">Zero Active Escalations</h4>
            <p className="text-xs text-slate-500 mt-1">
              No anomalies exceeding severity thresholds. Use the Judge Demo Simulator to inject an incident.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.alert_id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all shadow-md space-y-3"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center space-x-3">
                  <span
                    onClick={() => onSelectStation(alert.station_id)}
                    className="font-bold text-sm text-white hover:text-cyan-400 cursor-pointer transition-colors"
                  >
                    {alert.station_name}
                  </span>
                  <span className="text-xs font-mono text-slate-500">{alert.station_id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${getSeverityBadge(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${getClassificationBadge(alert.classification)}`}>
                    {alert.classification.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-400">
                  {alert.timestamp.includes('T') ? alert.timestamp.split('T')[1].substring(0, 8) + ' UTC' : alert.timestamp}
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="space-y-1 max-w-3xl">
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    {alert.message}
                  </p>
                  <div className="flex items-center space-x-4 text-[11px] font-mono text-slate-400">
                    <span>Parameter: <strong className="text-slate-200 capitalize">{alert.parameter}</strong></span>
                    <span>Observed Value: <strong className="text-cyan-400">{alert.value}</strong></span>
                    <span>Alert Thread ID: <strong className="text-slate-300">{alert.alert_id}</strong></span>
                  </div>
                </div>

                {/* Triage Action Buttons */}
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleAction(alert.alert_id, 'CONFIRM_FAULT')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all flex items-center space-x-1"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>Confirm Fault</span>
                  </button>
                  <button
                    onClick={() => handleAction(alert.alert_id, 'CONFIRM_EXTREME')}
                    className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all flex items-center space-x-1"
                  >
                    <Flame className="w-3 h-3" />
                    <span>Validate Extreme</span>
                  </button>
                  <button
                    onClick={() => handleAction(alert.alert_id, 'DISMISS')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
