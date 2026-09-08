import React, { useState, useEffect } from 'react';
import { Database, Code2, Copy, Check, ExternalLink, ShieldCheck, Zap, Layers } from 'lucide-react';
import { fetchTrustScore } from '../services/api';

export default function ApiExplorer({ stations }) {
  const [selectedStation, setSelectedStation] = useState(stations[0]?.id || 'IMD-RJ-04');
  const [trustData, setTrustData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!selectedStation) return;
      try {
        setLoading(true);
        const data = await fetchTrustScore(selectedStation);
        setTrustData(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedStation]);

  const jsonSnippet = trustData ? JSON.stringify(trustData, null, 2) : '// Loading response...';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl space-y-1">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
          <Database className="w-5 h-5 text-emerald-400" />
          <span>Downstream Anomaly Trust Score API Explorer</span>
        </h2>
        <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
          Downstream consumers (NDMA, Agricultural Advisories, Renewable Energy Grid Forecasting) query
          VayuDrishti's Trust Score to automatically filter or down-weight degraded sensor feeds before they corrupt forecasting models.
        </p>
      </div>

      {/* Interactive API Query Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Endpoint & Downstream Use Cases */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Query Endpoint Configuration
            </h4>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400">Select AWS Station:</label>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} - {s.name} ({s.zone})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-xs font-mono pt-1">
              <div className="text-[11px] text-slate-400">HTTP Method & Path:</div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 flex items-center space-x-2">
                <span className="font-bold text-slate-400">GET</span>
                <span className="truncate">/api/trust-score/{selectedStation}</span>
              </div>
            </div>

            {trustData && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Reliability Grade:</span>
                  <span className="font-bold font-mono text-emerald-400">{trustData.reliability_grade}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Overall Trust:</span>
                  <span className="font-bold font-mono text-white">
                    {Math.round(trustData.overall_trust_score * 100)}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Confidence Bounds:</span>
                  <span className="font-mono text-slate-300">
                    [{trustData.confidence_interval[0]}, {trustData.confidence_interval[1]}]
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Downstream Consumer Integration Protocols */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Downstream Consumer Integration Protocols</span>
            </h4>

            <div className="text-[11px] text-slate-400 space-y-2">
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <strong className="text-slate-200 block">1. Disaster Alerts (NDMA / SDMA):</strong>
                Accepts alerts only when classification is <code className="text-purple-400 font-mono">GENUINE_EXTREME</code> and Trust Score &ge; 0.90 to eliminate false alarms.
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <strong className="text-slate-200 block">2. Numerical Weather Prediction (NWP):</strong>
                Observation weights in assimilation engines (e.g. WRF/NCMRWF) are scaled linearly by <code className="text-cyan-400 font-mono">overall_trust_score</code>.
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <strong className="text-slate-200 block">3. Agricultural & Crop Advisories:</strong>
                Filters out stations flagged with <code className="text-rose-400 font-mono">SENSOR_CALIBRATION_SUSPECT</code> from irrigation recommendations.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live JSON Response Viewer */}
        <div className="lg:col-span-7">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl space-y-2 h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200 font-mono">
                  Live JSON Response Payload
                </span>
              </div>

              <button
                onClick={copyToClipboard}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono flex items-center space-x-1 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>

            <div className="flex-1 bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto">
              <pre className="text-xs font-mono text-cyan-300 leading-relaxed">
                {jsonSnippet}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
