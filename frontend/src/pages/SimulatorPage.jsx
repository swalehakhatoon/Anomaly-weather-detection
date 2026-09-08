import React, { useState } from 'react';
import {
  Cpu, RotateCcw, Play, CheckCircle2, AlertTriangle,
  Thermometer, Flame, CloudRain, Activity, ShieldAlert, Sparkles, ArrowRight
} from 'lucide-react';
import PipelineStepper from '../components/PipelineStepper';
import { injectSimulation, resetSimulation } from '../services/api';

export default function SimulatorPage({ stations, onOpenDashboard }) {
  const [selectedStation, setSelectedStation] = useState('IMD-RJ-04');
  const [activeScenario, setActiveScenario] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);
  const [injecting, setInjecting] = useState(false);

  const presets = [
    {
      id: 'STUCK_SENSOR',
      title: 'Preset A: Stuck Sensor Flatline',
      target: 'IMD-RJ-04 (Jaisalmer)',
      parameter: 'Temperature (Frozen @ 34.0°C)',
      expectedClassification: 'SENSOR_FAULT',
      badgeColor: 'rose',
      icon: Thermometer,
      description: 'Freezes sensor at 34.0°C flatline. 34.0°C is an ordinary temperature, but VayuDrishti flags it as SENSOR_FAULT because diurnal solar variation is missing (Level 2 MAD & Level 4 Neighbor Divergence).'
    },
    {
      id: 'HEATWAVE',
      title: 'Preset B: Coordinated Regional Heatwave',
      target: 'Rajasthan & Delhi Network (4 Stations)',
      parameter: 'Temperature (+7.5°C Surge to ~46°C)',
      expectedClassification: 'GENUINE_EXTREME',
      badgeColor: 'purple',
      icon: Flame,
      description: 'Injects a wide-area heat dome across 4 neighboring stations. VayuDrishti computes >80% spatial agreement and classifies as GENUINE_EXTREME, escalating to NDMA rather than dispatching a repair technician.'
    },
    {
      id: 'PHYSICAL_IMPOSSIBLE',
      title: 'Preset C: Physically Impossible Bounds',
      target: 'IMD-MH-01 (Mumbai Colaba)',
      parameter: 'RH = 118% & Rain = -12.0 mm',
      expectedClassification: 'DATA_QUALITY_ISSUE',
      badgeColor: 'amber',
      icon: ShieldAlert,
      description: 'Simulates corrupted telemetry payload. Deterministic Level 1 checks immediately reject the record with zero ML ambiguity.'
    },
    {
      id: 'DRIFT',
      title: 'Preset D: Gradual Sensor Calibration Drift',
      target: 'IMD-DL-01 (New Delhi)',
      parameter: 'Cumulative +0.25°C/hr Offset',
      expectedClassification: 'UNCERTAIN / DRIFT',
      badgeColor: 'cyan',
      icon: Activity,
      description: 'Simulates progressive calibration loss. Catches slow degradation over time before catastrophic sensor failure occurs.'
    },
    {
      id: 'CLOUDBURST',
      title: 'Preset E: Synoptic Cloudburst Front',
      target: 'IMD-ML-01 (Cherrapunji)',
      parameter: '-18 hPa Pressure Drop + 62mm Rain',
      expectedClassification: 'GENUINE_EXTREME',
      badgeColor: 'purple',
      icon: CloudRain,
      description: 'Simulates flash storm front. Verifies that barometric plunge combined with torrential rain passes multi-sensor physical synergy.'
    }
  ];

  const handleInject = async (scenarioId, customStation = null) => {
    setInjecting(true);
    setActiveScenario(scenarioId);
    try {
      const res = await injectSimulation(scenarioId, customStation || selectedStation);
      setExecutionResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setInjecting(false);
    }
  };

  const handleReset = async () => {
    setInjecting(true);
    try {
      await resetSimulation();
      setActiveScenario(null);
      setExecutionResult({ status: 'SUCCESS', desc: 'All 15 stations restored to nominal operational baselines.' });
    } catch (e) {
      console.error(e);
    } finally {
      setInjecting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="p-5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-slate-900 to-rose-950/20 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-amber-400" />
              <span>SIH 2026 Interactive Evaluation Simulator</span>
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              LIVE FAULT INJECTOR
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Test and verify VayuDrishti's core capability: distinguishing genuine extreme weather (e.g. heatwaves, cloudbursts)
            from sensor hardware malfunctions using 4-layer spatial-temporal cross-validation.
          </p>
        </div>

        <button
          onClick={handleReset}
          disabled={injecting}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-2 transition-all shadow shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Reset All Stations to Normal</span>
        </button>
      </div>

      {/* Visual Pipeline Stepper */}
      <PipelineStepper activeScenario={activeScenario} />

      {/* 5 Demo Preset Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Select an Evaluator Test Scenario:</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {presets.map((preset) => {
            const Icon = preset.icon;
            const isCurrent = activeScenario === preset.id;
            return (
              <div
                key={preset.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                  isCurrent
                    ? 'bg-slate-900 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-slate-800 text-amber-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-white">{preset.title}</h4>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {preset.description}
                  </p>

                  <div className="space-y-1 text-[10px] font-mono pt-1">
                    <div className="text-slate-400">
                      Target: <strong className="text-slate-200">{preset.target}</strong>
                    </div>
                    <div className="text-slate-400">
                      Expected Output: <strong className={preset.badgeColor === 'purple' ? 'text-purple-400' : 'text-rose-400'}>
                        {preset.expectedClassification}
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleInject(preset.id)}
                  disabled={injecting}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isCurrent ? 'Scenario Active in Network' : 'Inject Scenario Live'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Execution Feedback & Outcome Box */}
      {executionResult && (
        <div className="p-4 rounded-xl border border-cyan-500/40 bg-slate-950 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-in fade-in duration-300">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">
                Simulator Event Dispatched into Live Stream
              </div>
              <div className="text-xs text-slate-300 font-mono mt-0.5">
                {executionResult.desc || 'Telemetry injection processed.'}
              </div>
            </div>
          </div>

          <button
            onClick={onOpenDashboard}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center space-x-1 shadow transition-colors shrink-0"
          >
            <span>View Effect on National Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
