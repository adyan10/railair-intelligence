import type { ReactNode } from 'react';
import type { KpiSummary } from '../types/railair';
import { TrendingUp, Activity, Eye, ShieldAlert } from 'lucide-react';
import { formatConcentration, formatPercent, confidenceLabel } from '../lib/formatters';

interface Props {
  kpi: KpiSummary;
}

export function KpiCards({ kpi }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        icon={<Activity className="w-4 h-4 text-cyan-400" />}
        label="Avg PM2.5"
        value={formatConcentration(kpi.avgPm25, 'µg/m³')}
        sub="WHO limit: 15 µg/m³"
        accent="cyan"
        badge="SIMULATED"
      />
      <KpiCard
        icon={<TrendingUp className="w-4 h-4 text-teal-400" />}
        label="Avg PM10"
        value={formatConcentration(kpi.avgPm10, 'µg/m³')}
        sub="WHO limit: 45 µg/m³"
        accent="teal"
        badge="SIMULATED"
      />
      <KpiCard
        icon={<Eye className="w-4 h-4 text-violet-400" />}
        label="Coverage"
        value={formatPercent(kpi.coveragePercent)}
        sub={`${kpi.monitoredLocations}/${kpi.totalLocations} stations monitored`}
        accent="violet"
        badge="SIMULATED"
      />
      <KpiCard
        icon={<ShieldAlert className="w-4 h-4 text-amber-400" />}
        label="Data Confidence"
        value={confidenceLabel(kpi.dataConfidence)}
        sub="Simulation engine v0.1"
        accent="amber"
        badge="SIMULATED"
      />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
  badge,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
  badge: string;
}) {
  const accentBorder: Record<string, string> = {
    cyan: 'border-t-cyan-500',
    teal: 'border-t-teal-500',
    violet: 'border-t-violet-500',
    amber: 'border-t-amber-500',
  };

  return (
    <div
      className={`bg-navy-700 rounded-xl border border-navy-500 border-t-2 ${accentBorder[accent] ?? 'border-t-slate-500'} p-4 flex flex-col gap-1.5`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">{icon}{label}</div>
        <span className="badge-simulated text-[10px]">{badge}</span>
      </div>
      <div className="text-xl font-bold text-white font-mono tracking-tight">{value}</div>
      <div className="text-xs text-slate-400 leading-snug">{sub}</div>
    </div>
  );
}
