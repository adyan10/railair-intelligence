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
    <div className="bg-white border border-[#DCE3EA] rounded-lg p-3 shadow-md text-xs font-mono">
      <div className="font-semibold text-[#17365D] mb-1.5">{label} IST</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }} className="flex gap-4 justify-between py-0.5">
          <span className="font-medium">{p.name}:</span>
          <span className="font-bold">{p.value} µg/m³</span>
        </div>
      ))}
      <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
        Simulated Diurnal Profile
      </div>
    </div>
  );
}

export function TrendChart({ data }: Props) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#CBD5E1' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            unit=" µg"
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#475569', paddingTop: 12, fontFamily: 'monospace' }}
            iconType="circle"
            iconSize={8}
          />
          <Line
            type="monotone"
            dataKey="pm25"
            name="PM2.5 (Fine Particulate)"
            stroke="#D97706"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#D97706', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#D97706' }}
          />
          <Line
            type="monotone"
            dataKey="pm10"
            name="PM10 (Coarse Particulate)"
            stroke="#7C3AED"
            strokeWidth={2}
            dot={{ r: 2.5, fill: '#7C3AED', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#7C3AED' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
