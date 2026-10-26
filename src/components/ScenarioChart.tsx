import type { ScenarioResult } from '../types/railair';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { formatConcentration, formatPercent } from '../lib/formatters';

interface Props {
  results: ScenarioResult[];
}

function ScenarioTooltip({ active, payload }: { active?: boolean; payload?: { payload: ScenarioResult }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip px-3 py-2 text-xs space-y-1">
      <div className="font-semibold text-slate-200">{d.label}</div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-400">Avg PM2.5</span>
        <span className="font-mono text-cyan-300">{formatConcentration(d.avgPm25, 'µg/m³')}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-400">Avg PM10</span>
        <span className="font-mono text-teal-300">{formatConcentration(d.avgPm10, 'µg/m³')}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-400">Exposure reduction</span>
        <span className="font-mono text-emerald-300">{formatPercent(d.exposureProxyReduction)}</span>
      </div>
      <div className="text-amber-400 text-[10px]">⚠ Hypothetical scenario – not validated</div>
    </div>
  );
}

export function ScenarioChart({ results }: Props) {
  const baselineValue = results.find((r) => r.isBaseline)?.avgPm25 ?? 0;

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={results} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4d" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={{ stroke: '#1e2d4d' }}
            tickLine={false}
            interval={0}
            width={80}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit=" µg"
          />
          <Tooltip content={<ScenarioTooltip />} />
          <ReferenceLine y={baselineValue} stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.6} />
          <Bar dataKey="avgPm25" name="Avg PM2.5" radius={[4, 4, 0, 0]}>
            {results.map((r) => (
              <Cell
                key={r.scenarioId}
                fill={r.isBaseline ? '#475569' : '#06b6d4'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
