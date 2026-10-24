import { useState } from 'react';
import { mockRailairService } from '../services/mockRailairService';
import type { JourneyEstimate, Station } from '../types/railair';
import { STATIONS } from '../data/mock';
import {
  formatConcentration,
  formatExposureProxy,
  formatMinutes,
  formatKm,
  pm25SeverityColor,
} from '../lib/formatters';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Navigation, AlertCircle, Info, Loader } from 'lucide-react';

const STATION_IDS = STATIONS.map((s) => s.id);

function ExposureTooltip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; pm25: number; pm10: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip px-3 py-2 text-xs space-y-1">
      <div className="font-semibold text-slate-200">{d.label}</div>
      <div className="text-cyan-300">PM2.5 proxy: {d.pm25.toFixed(1)} µg·h/m³</div>
      <div className="text-teal-300">PM10 proxy: {d.pm10.toFixed(1)} µg·h/m³</div>
      <div className="text-amber-400 text-[10px]">Concentration × time — not inhaled dose</div>
    </div>
  );
}

export function JourneyPage() {
  const [originId, setOriginId] = useState<string>('MRT');
  const [destId, setDestId] = useState<string>('NDLS');
  const [duration, setDuration] = useState<number>(108);
  const [estimate, setEstimate] = useState<JourneyEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runEstimate() {
    if (originId === destId) {
      setError('Origin and destination must be different.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await mockRailairService.getJourneyEstimate(
        originId,
        destId,
        duration,
        `${STATIONS.find((s) => s.id === originId)?.shortName} → ${STATIONS.find((s) => s.id === destId)?.shortName}`
      );
      setEstimate(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const chartData = estimate?.segments.map((seg) => ({
    label: `${seg.fromStation.shortName}→${seg.toStation.shortName}`,
    pm25: seg.pm25ExposureProxy,
    pm10: seg.pm10ExposureProxy,
  })) ?? [];

  const selectClass =
    'bg-navy-700 border border-navy-500 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors w-full';

  return (
    <div className="p-5 space-y-5 max-w-4xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold text-white">Journey Exposure Planner</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Estimate a concentration-time exposure proxy for a trip along the simulated corridor.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          The exposure proxy (µg·h/m³) is calculated as{' '}
          <code className="font-mono bg-navy-700 px-1 rounded">Σ(concentration × travel_time_hours)</code>.
          It is <strong>not</strong> an inhaled dose, personal exposure measurement, or validated health-risk score.
          All concentration inputs are simulated.
        </span>
      </div>

      {/* Controls */}
      <div className="bg-navy-800 rounded-xl border border-navy-500 p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-cyan-400" />
          Journey Parameters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Origin Station</label>
            <select
              value={originId}
              onChange={(e) => setOriginId(e.target.value)}
              className={selectClass}
            >
              {STATIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Destination Station</label>
            <select
              value={destId}
              onChange={(e) => setDestId(e.target.value)}
              className={selectClass}
            >
              {STATIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Journey Duration: <strong className="text-slate-200">{formatMinutes(duration)}</strong>
            </label>
            <input
              type="range"
              min={20}
              max={240}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-cyan-500 mt-2"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-0.5">
              <span>20 min</span>
              <span>4 h</span>
            </div>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs mb-3">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        <button
          onClick={runEstimate}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          {loading ? 'Calculating…' : 'Calculate Exposure Estimate'}
        </button>
      </div>

      {/* Results */}
      {estimate && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Duration', value: formatMinutes(estimate.totalDurationMinutes), color: 'text-slate-200' },
              { label: 'PM2.5 Exposure Proxy', value: formatExposureProxy(estimate.totalPm25ExposureProxy), color: 'text-cyan-300', badge: 'SIMULATED' },
              { label: 'PM10 Exposure Proxy', value: formatExposureProxy(estimate.totalPm10ExposureProxy), color: 'text-teal-300', badge: 'SIMULATED' },
              { label: 'Segments', value: String(estimate.segments.length), color: 'text-slate-200' },
            ].map((c) => (
              <div key={c.label} className="bg-navy-700 rounded-xl border border-navy-500 p-3">
                <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                  {c.label}
                  {c.badge && <span className="badge-simulated text-[9px]">{c.badge}</span>}
                </div>
                <div className={`text-lg font-bold font-mono ${c.color}`}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Calculation note */}
          <div className="text-xs text-slate-500 italic bg-navy-900 px-3 py-2 rounded-lg border border-navy-600">
            {estimate.calculationNote}
          </div>

          {/* Segment bar chart */}
          <div className="bg-navy-800 rounded-xl border border-navy-500 p-4">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Exposure Proxy by Segment</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4d" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#94a3b8', fontSize: 9 }}
                    axisLine={{ stroke: '#1e2d4d' }}
                    tickLine={false}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ExposureTooltip />} />
                  <Bar dataKey="pm25" name="PM2.5 Proxy" radius={[3, 3, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={pm25SeverityColor(d.pm25 * 4)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Segment table */}
          <div className="bg-navy-800 rounded-xl border border-navy-500 p-4 overflow-x-auto">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Segment Detail</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-navy-500 text-slate-400 text-left">
                  <th className="pb-2 font-medium">Segment</th>
                  <th className="pb-2 font-medium">Distance</th>
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">PM2.5 Conc.</th>
                  <th className="pb-2 font-medium">PM2.5 Proxy</th>
                  <th className="pb-2 font-medium">PM10 Conc.</th>
                  <th className="pb-2 font-medium">PM10 Proxy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-600">
                {estimate.segments.map((seg) => (
                  <tr key={seg.segmentId} className="hover:bg-navy-700/30">
                    <td className="py-2 pr-3 text-slate-200">
                      {seg.fromStation.shortName} → {seg.toStation.shortName}
                    </td>
                    <td className="py-2 pr-3 font-mono text-slate-300">{formatKm(seg.distanceKm)}</td>
                    <td className="py-2 pr-3 font-mono text-slate-300">{formatMinutes(seg.travelTimeMinutes)}</td>
                    <td className="py-2 pr-3 font-mono text-cyan-300">{seg.pm25Concentration} µg/m³</td>
                    <td className="py-2 pr-3 font-mono text-cyan-400">{formatExposureProxy(seg.pm25ExposureProxy)}</td>
                    <td className="py-2 pr-3 font-mono text-teal-300">{seg.pm10Concentration} µg/m³</td>
                    <td className="py-2 font-mono text-teal-400">{formatExposureProxy(seg.pm10ExposureProxy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
