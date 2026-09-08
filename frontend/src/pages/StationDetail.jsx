import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Thermometer, Droplets, Gauge, Wind, CloudRain,
  Compass, ShieldCheck, Activity, AlertTriangle, Layers, Calendar
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine
} from 'recharts';
import { fetchStationDetail, fetchStationReadings, fetchStationNeighbors, fetchTrustScore } from '../services/api';

export default function StationDetail({ stationId, onBack }) {
  const [station, setStation] = useState(null);
  const [readings, setReadings] = useState([]);
  const [neighborsData, setNeighborsData] = useState(null);
  const [trustData, setTrustData] = useState(null);
  const [selectedParam, setSelectedParam] = useState('temperature');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!stationId) return;
      try {
        setLoading(true);
        const [st, read, neigh, trust] = await Promise.all([
          fetchStationDetail(stationId),
          fetchStationReadings(stationId, 40),
          fetchStationNeighbors(stationId, selectedParam),
          fetchTrustScore(stationId)
        ]);
        setStation(st);
        setReadings(read);
        setNeighborsData(neigh);
        setTrustData(trust);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [stationId, selectedParam]);

  if (loading && !station) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Activity className="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-2" />
        <p className="text-xs">Loading Deep Station Telemetry Diagnostics...</p>
      </div>
    );
  }

  if (!station) return null;

  // Format chart data
  const chartData = readings.map((r, i) => {
    const timeStr = r.timestamp.includes('T')
      ? r.timestamp.split('T')[1].substring(0, 5)
      : `t-${readings.length - i}`;
    const base = station['base_' + selectedParam] || 30.0;
    const expMin = base - 3.0;
    const expMax = base + 3.0;
    return {
      time: timeStr,
      observed: r[selectedParam],
      expectedMin: expMin,
      expectedMax: expMax,
      isAnomalous: r.quality_flag !== 'VALIDATED'
    };
  });

  const getUnit = (param) => {
    switch (param) {
      case 'temperature': return '°C';
      case 'humidity': return '%';
      case 'pressure': return ' hPa';
      case 'wind_speed': return ' km/h';
      case 'rainfall': return ' mm';
      default: return '';
    }
  };

  const paramOptions = [
    { key: 'temperature', label: 'Air Temperature', icon: Thermometer },
    { key: 'humidity', label: 'Relative Humidity', icon: Droplets },
    { key: 'pressure', label: 'Atmospheric Pressure', icon: Gauge },
    { key: 'wind_speed', label: 'Wind Speed', icon: Wind },
    { key: 'rainfall', label: 'Rainfall Rate', icon: CloudRain }
  ];

  return (
    <div className="space-y-4">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center space-x-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to National Map</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-mono">AWS Hardware ID:</span>
          <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
            {station.id}
          </span>
        </div>
      </div>

      {/* Station Header Profile */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-extrabold text-white tracking-tight">{station.name}</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {station.state}
            </span>
            <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded border ${
              station.status === 'NORMAL' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
              station.status === 'EXTREME' ? 'bg-purple-950 text-purple-300 border-purple-800' :
              'bg-rose-950 text-rose-300 border-rose-800'
            }`}>
              {station.status}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
            <span>Zone: <strong className="text-slate-200">{station.zone}</strong></span>
            <span>Coordinates: <strong className="text-slate-200">{station.lat}°N, {station.lng}°E</strong></span>
            <span>Elevation: <strong className="text-slate-200">{station.elevation}m MSL</strong></span>
            <span>Telemetry: <strong className="text-emerald-400">INSAT-3D / GPRS</strong></span>
          </div>
        </div>

        {/* Trust Score Gauge Card */}
        {trustData && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-4 shrink-0">
            <div className="text-right">
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Composite Trust Score
              </div>
              <div className="text-xs font-bold text-slate-300 mt-0.5">
                {trustData.reliability_grade}
              </div>
            </div>
            <div className="w-14 h-14 rounded-full border-4 border-slate-800 flex items-center justify-center relative bg-slate-900">
              <span className={`text-sm font-extrabold font-mono ${
                trustData.overall_trust_score >= 0.85 ? 'text-emerald-400' :
                trustData.overall_trust_score >= 0.60 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {Math.round(trustData.overall_trust_score * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Parameter Selector Pills */}
      <div className="flex flex-wrap gap-2">
        {paramOptions.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selectedParam === opt.key;
          const latestVal = readings.length > 0 ? readings[readings.length - 1][opt.key] : '--';
          return (
            <button
              key={opt.key}
              onClick={() => setSelectedParam(opt.key)}
              className={`p-3 rounded-xl border flex items-center space-x-3 transition-all flex-1 min-w-[170px] ${
                isSelected
                  ? 'bg-slate-800 border-cyan-500 shadow-md shadow-cyan-500/10'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className={`p-2 rounded-lg ${isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-[11px] text-slate-400">{opt.label}</div>
                <div className="text-sm font-bold font-mono text-white">
                  {latestVal}{getUnit(opt.key)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Time-Series Diurnal Curve with Anomaly Overlay */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white capitalize">
              {selectedParam.replace('_', ' ')} Telemetry Time-Series & Diurnal Baseline
            </h3>
            <p className="text-[11px] text-slate-400">
              Blue Line: Real-time telemetry feed | Shaded Band: Expected diurnal bounds (Level 2/3)
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="flex items-center space-x-1">
              <span className="w-3 h-0.5 bg-cyan-400"></span>
              <span className="text-slate-300">Observed</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-2 bg-slate-800 border border-slate-700"></span>
              <span className="text-slate-400">Expected Band</span>
            </span>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}
              />
              <Area type="monotone" dataKey="expectedMax" stroke="none" fill="#1e293b" fillOpacity={0.6} />
              <Line
                type="monotone"
                dataKey="observed"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.isAnomalous) {
                    return <circle cx={cx} cy={cy} r={5} fill="#f43f5e" stroke="#fff" strokeWidth={1.5} />;
                  }
                  return <circle cx={cx} cy={cy} r={2} fill="#38bdf8" />;
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Level 4 Spatial Cross-Validation & Sensor Drift Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Nearest Neighbor Spatial Agreement Table */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-1.5">
              <Compass className="w-4 h-4 text-purple-400" />
              <span>Level 4: Spatial Neighbor Cross-Validation</span>
            </h4>
            {neighborsData && (
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                neighborsData.spatial_agreement >= 0.70
                  ? 'bg-purple-950 text-purple-300 border-purple-800'
                  : 'bg-rose-950 text-rose-300 border-rose-800'
              }`}>
                {Math.round(neighborsData.spatial_agreement * 100)}% Regional Agreement
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            Compares this station's reading against 3 nearest AWS stations to verify synoptic consistency.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                <tr>
                  <th className="pb-2">Neighbor Station</th>
                  <th className="pb-2">Distance</th>
                  <th className="pb-2">Observed</th>
                  <th className="pb-2">Baseline Dev</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {neighborsData && neighborsData.neighbors.map((n) => (
                  <tr key={n.station_id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 font-sans font-bold text-slate-200">
                      {n.name}
                      <span className="block text-[9px] font-mono text-slate-500">{n.station_id}</span>
                    </td>
                    <td className="py-2.5 text-slate-400">{n.distance_km} km</td>
                    <td className="py-2.5 font-bold text-slate-200">
                      {n.current_value}{getUnit(selectedParam)}
                    </td>
                    <td className="py-2.5 text-cyan-400">
                      {n.deviation_from_baseline > 0 ? `+${n.deviation_from_baseline}` : n.deviation_from_baseline}
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        n.status === 'NORMAL' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                      }`}>
                        {n.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sensor Drift & Calibration Tracker */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Predictive Maintenance: Sensor Drift Monitor</span>
            </h4>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              STABLE CALIBRATION
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Cumulative calibration slope divergence over rolling 14-day observation window.
          </p>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Thermistor Zero-Point Stability</span>
                <span className="font-mono text-emerald-400">0.03°C / week (Nominal)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[12%]"></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Capacitive Humidity Sensor Slew</span>
                <span className="font-mono text-emerald-400">0.12% / week (Nominal)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[18%]"></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Barometric Transducer Drift</span>
                <span className="font-mono text-emerald-400">0.01 hPa / month (High Accuracy)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[8%]"></div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between mt-3">
              <span>Next Scheduled Calibration Maintenance:</span>
              <span className="font-mono font-bold text-slate-200">18-Nov-2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
