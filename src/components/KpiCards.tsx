import type { ReactNode } from 'react';
import type { KpiSummary } from '../types/railair';
import { TrendingUp, Activity, Eye, ShieldAlert } from 'lucide-react';
import { formatConcentration, formatPercent, confidenceLabel } from '../lib/formatters';

interface Props {
  kpi: KpiSummary;
}

export function KpiCards({ kpi }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        icon={<Activity className="w-4 h-4 text-[#17365D]" />}
        label="Corridor Avg PM2.5"
        value={formatConcentration(kpi.avgPm25, 'µg/m³')}
        status="Very Poor (CPCB NAQI)"
        statusColor="text-orange-600"
        sub="WHO Annual Limit: 15 µg/m³ (9×)"
        badge="SIMULATED"
      />
      <KpiCard
        icon={<TrendingUp className="w-4 h-4 text-[#7C3AED]" />}
        label="Corridor Avg PM10"
        value={formatConcentration(kpi.avgPm10, 'µg/m³')}
        status="Severe Category"
        statusColor="text-red-600"
        sub="NAAQS 24h Standard: 100 µg/m³"
        badge="SIMULATED"
      />
      <KpiCard
        icon={<Eye className="w-4 h-4 text-[#059669]" />}
        label="Monitored Coverage"
        value={formatPercent(kpi.coveragePercent)}
        status={`${kpi.monitoredLocations} of ${kpi.totalLocations} Stations Monitored`}
        statusColor="text-emerald-700"
        sub="Remaining 5 nodes interpolated"
        badge="SIMULATED"
      />
      <KpiCard
        icon={<ShieldAlert className="w-4 h-4 text-[#D97706]" />}
        label="Model Confidence"
        value={confidenceLabel(kpi.dataConfidence)}
        status="Synthetic Baseline Engine v0.1"
        statusColor="text-amber-700"
        sub="Direct CPCB feeds in Phase 2"
        badge="SIMULATED"
      />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  status,
  statusColor,
  sub,
  badge,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  status: string;
  statusColor: string;
  sub: string;
  badge: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#DCE3EA] p-4 shadow-xs flex flex-col justify-between hover:border-[#17365D]/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#17365D]/10 text-[#17365D] flex items-center justify-center">
            {icon}
          </div>
          <span className="text-[11px] font-mono font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-800">
          {badge}
        </span>
      </div>

      <div className="my-1.5">
        <div className="text-2xl lg:text-3xl font-semibold text-[#17365D] font-mono tracking-tight">
          {value}
        </div>
        <div className={`text-xs font-mono font-medium mt-1 flex items-center gap-1.5 ${statusColor}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
          <span>{status}</span>
        </div>
      </div>

      <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-[#DCE3EA]/80 mt-1">
        {sub}
      </div>
    </div>
  );
}
