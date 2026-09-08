import React from 'react';
import { ArrowRight, CheckCircle2, Shield, BarChart3, Brain, Compass, Award } from 'lucide-react';

export default function PipelineStepper({ activeScenario }) {
  const steps = [
    {
      id: 1,
      name: 'Telemetry Ingest',
      desc: 'MQTT / GPRS JSON',
      icon: Shield,
      status: 'complete'
    },
    {
      id: 2,
      name: 'Level 1: Rules',
      desc: 'Physical & Bound Bounds',
      icon: CheckCircle2,
      status: activeScenario === 'PHYSICAL_IMPOSSIBLE' ? 'flagged' : 'complete'
    },
    {
      id: 3,
      name: 'Level 2: Stats',
      desc: 'Z-Score / Flatline MAD',
      icon: BarChart3,
      status: activeScenario === 'STUCK_SENSOR' ? 'flagged' : 'complete'
    },
    {
      id: 4,
      name: 'Level 3: ML Engine',
      desc: 'Isolation Forest Model',
      icon: Brain,
      status: ['HEATWAVE', 'CLOUDBURST', 'DRIFT'].includes(activeScenario) ? 'flagged' : 'complete'
    },
    {
      id: 5,
      name: 'Level 4: Spatial Context',
      desc: 'k-NN Haversine Correlation',
      icon: Compass,
      status: activeScenario === 'HEATWAVE' ? 'corroborated' : activeScenario === 'STUCK_SENSOR' ? 'divergent' : 'complete'
    },
    {
      id: 6,
      name: 'Trust Score & Action',
      desc: 'Extreme vs Fault Decision',
      icon: Award,
      status: 'active'
    }
  ];

  const getStepBadge = (status) => {
    switch (status) {
      case 'flagged':
        return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
      case 'corroborated':
        return 'text-purple-400 border-purple-500/40 bg-purple-500/10';
      case 'divergent':
        return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
      default:
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    }
  };

  return (
    <div className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          VayuDrishti 4-Level Pipeline Execution Flow
        </h4>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
          ACTIVE ARCHITECTURE
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`p-2.5 rounded-lg border bg-slate-950/80 flex flex-col justify-between space-y-2 ${getStepBadge(step.status)}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400">0{step.id}</span>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-100">{step.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{step.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
