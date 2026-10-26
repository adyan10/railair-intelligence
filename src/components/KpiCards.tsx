import type { ReactNode } from 'react';
import type { KpiSummary, ActivePollutant } from '../types/railair';
import { TrendingUp, Activity, Eye, ShieldAlert } from 'lucide-react';
import { formatConcentration, formatPercent, confidenceLabel } from '../lib/formatters';
import { getCpcbCategory, getNaqiEstimate } from '../lib/diurnal';

interface Props {
  kpi: KpiSummary;
  activePollutant?: ActivePollutant;
}

export function KpiCards({ kpi, activePollutant = 'PM2.5' }: Props) {
  const pm25Cat = getCpcbCategory(kpi.avgPm25, 'PM2.5');
  const pm10Cat = getCpcbCategory(kpi.avgPm10, 'PM10');
  const naqiVal = getNaqiEstimate(kpi.avgPm25);
  const naqiCat = getCpcbCategory(naqiVal, 'NAQI');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {activePollutant === 'NAQI' ? (
        <KpiCard
          icon={<Activity className="w-4 h-4 text-[#17365D]" />}
          label="Corridor Avg NAQI"
          value={`${naqiVal} AQI`}
          status={`${naqiCat.name} Category`}
          statusColor={naqiCat.color}
          sub="Illustrative proxy: PM2.5 × 1.35"
          badge="SIMULATED"
          highlight
        />
      ) : (
        <KpiCard
          icon={<Activity className="w-4 h-4 text-[#17365D]" />}
          label="Corridor Avg PM2.5"
          value={formatConcentration(kpi.avgPm25, 'µg/m³')}
          status={`${pm25Cat.name} (CPCB NAQI)`}
          statusColor={pm25Cat.color}
          sub={`WHO Limit: 15 µg/m³ (${Math.round(kpi.avgPm25 / 15)}×)`}
          badge="SIMULATED"
          highlight={activePollutant === 'PM2.5'}
        />
      )}

      <KpiCard
        icon={<TrendingUp className="w-4 h-4 text-[#7C3AED]" />}
        label="Corridor Avg PM10"
        value={formatConcentration(kpi.avgPm10, 'µg/m³')}
        status={`${pm10Cat.name} Category`}
        statusColor={pm10Cat.color}
        sub="NAAQS 24h Standard: 100 µg/m³"
        badge="SIMULATED"
        highlight={activePollutant === 'PM10'}
      />

      <KpiCard
        icon={<Eye className="w-4 h-4 text-[#059669]" />}
        label="Monitored Coverage"
        value={formatPercent(kpi.coveragePercent)}
        status={`${kpi.monitoredLocations} of ${kpi.totalLocations} Stations Monitored`}
        statusColor="#059669"
        sub="5 intermediate nodes synthetic"
        badge="SIMULATED"
      />

      <KpiCard
        icon={<ShieldAlert className="w-4 h-4 text-[#D97706]" />}
        label="Model Fidelity"
        value={confidenceLabel(kpi.dataConfidence)}
        status="Synthetic Baseline Engine v0.1"
        statusColor="#D97706"
        sub="Phase 2 live CPCB integrations"
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
  highlight,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  status: string;
  statusColor: string;
  sub: string;
  badge: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border p-4 shadow-xs flex flex-col justify-between transition-all ${
        highlight
          ? 'border-[#17365D] ring-1 ring-[#17365D]/30'
          : 'border-[#DCE3EA] hover:border-[#17365D]/30'
      }`}
    >
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
        <div
          className="text-xs font-mono font-medium mt-1 flex items-center gap-1.5"
          style={{ color: statusColor }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }}></span>
          <span>{status}</span>
        </div>
      </div>

      <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-[#DCE3EA]/80 mt-1">
        {sub}
      </div>
    </div>
  );
}
