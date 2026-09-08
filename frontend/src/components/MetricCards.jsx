import React from 'react';
import { Activity, Radio, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export default function MetricCards({ metrics }) {
  if (!metrics) return null;

  const cards = [
    {
      label: 'Network Health Index',
      value: `${metrics.network_health_pct}%`,
      sub: `${metrics.network_health_pct >= 90 ? 'Optimal Operations' : 'Degraded Stations Detected'}`,
      icon: ShieldCheck,
      color: metrics.network_health_pct >= 85 ? 'emerald' : 'amber',
      accent: 'from-emerald-500/20 to-transparent'
    },
    {
      label: 'Operational AWS Stations',
      value: `${metrics.active_stations} / ${metrics.total_stations}`,
      sub: '5 Climatic Zones Synced',
      icon: Radio,
      color: 'cyan',
      accent: 'from-cyan-500/20 to-transparent'
    },
    {
      label: 'Active Anomalies',
      value: metrics.active_anomalies,
      sub: 'Evaluating Multi-Layer Context',
      icon: AlertTriangle,
      color: metrics.active_anomalies > 0 ? 'amber' : 'slate',
      accent: 'from-amber-500/20 to-transparent'
    },
    {
      label: 'Critical / High Alerts',
      value: metrics.critical_alerts,
      sub: metrics.critical_alerts > 0 ? 'Disaster / Tech Review Req' : 'Zero Escalations Active',
      icon: Activity,
      color: metrics.critical_alerts > 0 ? 'rose' : 'slate',
      accent: 'from-rose-500/20 to-transparent'
    },
    {
      label: 'Inference & QC Latency',
      value: `${Math.round(metrics.avg_latency_ms)}ms`,
      sub: 'Target: < 30,000ms (MoES SLA)',
      icon: Zap,
      color: 'sky',
      accent: 'from-sky-500/20 to-transparent'
    }
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case 'emerald':
        return { text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' };
      case 'amber':
        return { text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' };
      case 'rose':
        return { text: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10' };
      case 'cyan':
        return { text: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10' };
      case 'sky':
        return { text: 'text-sky-400', border: 'border-sky-500/30', bg: 'bg-sky-500/10' };
      default:
        return { text: 'text-slate-300', border: 'border-slate-800', bg: 'bg-slate-900' };
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card, idx) => {
        const c = getColorClasses(card.color);
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`relative overflow-hidden rounded-xl border p-4 bg-slate-900/80 backdrop-blur-sm ${c.border} transition-all duration-200 hover:border-slate-700`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg ${c.bg}`}>
                <Icon className={`w-4 h-4 ${c.text}`} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold font-mono tracking-tight text-white">
                {card.value}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 truncate">
              {card.sub}
            </p>
          </div>
        );
      })}
    </div>
  );
}
