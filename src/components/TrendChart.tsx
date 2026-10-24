import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { TrendDataPoint } from '../types/railair';

interface Props {
  data: TrendDataPoint[];
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { color: string; name: string; value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip px-3 py-2 text-xs">
      <div className="font-semibold text-slate-300 mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }} className="flex gap-2 justify-between">
          <span>{p.name}</span>
          <span className="font-mono">{p.value} µg/m³</span>
        </div>
      ))}
      <div className="mt-1 text-amber-400 text-[10px]">⚠ Simulated values</div>
    </div>
  );
}

export function TrendChart({ data }: Props) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4d" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#1e2d4d' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit=" µg"
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
            iconType="circle"
            iconSize={8}
          />
          <Line
            type="monotone"
            dataKey="pm25"
            name="PM2.5"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#06b6d4' }}
          />
          <Line
            type="monotone"
            dataKey="pm10"
            name="PM10"
            stroke="#14b8a6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#14b8a6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
