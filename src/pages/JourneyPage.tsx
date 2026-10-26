import { useEffect, useState } from 'react';
import { mockRailairService } from '../services/mockRailairService';
import type { JourneyEstimate, TrainServiceOption } from '../types/railair';
import { STATIONS } from '../data/mock';
import {
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
import { Navigation, AlertCircle, Info, Loader, Train, Clock, AlertTriangle } from 'lucide-react';

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
  const [availableTrains, setAvailableTrains] = useState<TrainServiceOption[]>([]);
  const [selectedTrainNo, setSelectedTrainNo] = useState<string>('');
  const [estimate, setEstimate] = useState<JourneyEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (originId === destId) {
      setAvailableTrains([]);
      setSelectedTrainNo('');
      setEstimate(null);
      setError('Origin and destination must be different corridor stations.');
      return;
    }

    setError(null);
    setLoading(true);

    mockRailairService.getTimetableOptions(originId, destId).then(async (trains) => {
      if (!active) return;
      setAvailableTrains(trains);

      if (trains.length === 0) {
        setSelectedTrainNo('');
        setEstimate(null);
        setError('No direct historical train service found for this station pair in the timetable dataset.');
        setLoading(false);
        return;
      }

      // Select the first eligible service for the new corridor route
      const defaultTrain = trains[0];
      setSelectedTrainNo(defaultTrain.trainNo);

      const originName = STATIONS.find((s) => s.id === originId)?.shortName ?? originId;
      const destName = STATIONS.find((s) => s.id === destId)?.shortName ?? destId;

      try {
        const result = await mockRailairService.getJourneyEstimate(
          originId,
          destId,
          defaultTrain.trainNo,
          `${originName} → ${destName}`
        );
        if (active) setEstimate(result);
      } catch (e) {
        if (active) setError(String(e));
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [originId, destId]);

  async function handleTrainChange(trainNo: string) {
    setSelectedTrainNo(trainNo);
    if (!trainNo || originId === destId) return;

    setLoading(true);
    setError(null);
    try {
      const originName = STATIONS.find((s) => s.id === originId)?.shortName ?? originId;
      const destName = STATIONS.find((s) => s.id === destId)?.shortName ?? destId;
      const result = await mockRailairService.getJourneyEstimate(
        originId,
        destId,
        trainNo,
        `${originName} → ${destName}`
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
        <h2 className="text-lg font-semibold text-rail-navy">Journey Exposure Planner</h2>
        <p className="text-xs text-rail-muted mt-0.5">
          Estimate a concentration-time exposure proxy based on historical train schedules along the corridor.
        </p>
      </div>

      {/* Scientific & Historical Disclaimer */}
      <div className="space-y-2">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            The exposure proxy (µg·h/m³) is calculated as{' '}
            <code className="font-mono bg-navy-700 px-1 rounded">Σ(segment_concentration × scheduled_travel_time_hours)</code>.
            It is an <strong>exposure proxy only</strong> — not an inhaled dose, personal exposure measurement, or validated health-risk score.
            Pollutant concentrations are simulated corridor estimates.
          </span>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 text-xs">
          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Historical Timetable Notice:</strong> Travel times and stop sequences are derived from historical Indian Railways timetable snapshots (2015 &amp; 2017). This is a research prototype, not a verified live or guaranteed operating schedule.
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-navy-800 rounded-xl border border-navy-500 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-cyan-400" />
          Corridor Route &amp; Timetable Selection
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Origin Station</label>
            <select
              value={originId}
              onChange={(e) => setOriginId(e.target.value)}
              className={selectClass}
            >
              {STATIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
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
                <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Select Train Service ({availableTrains.length} historical {availableTrains.length === 1 ? 'service' : 'services'})
            </label>
            <select
              value={selectedTrainNo}
              onChange={(e) => handleTrainChange(e.target.value)}
              disabled={availableTrains.length === 0 || loading}
              className={selectClass}
            >
              {availableTrains.length === 0 ? (
                <option value="">No scheduled service available</option>
              ) : (
                availableTrains.map((t) => (
                  <option key={t.trainNo} value={t.trainNo}>
                    #{t.trainNo} {t.trainName} ({t.departureTime} → {t.arrivalTime}, {formatMinutes(t.durationMinutes)})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-cyan-400 text-xs py-1">
            <Loader className="w-4 h-4 animate-spin" />
            Loading historical timetable records…
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs p-3 rounded-lg bg-red-950/30 border border-red-800/40">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Selected Train Details Card */}
        {estimate?.selectedTrain && (
          <div className="bg-navy-900/90 rounded-lg border border-cyan-800/50 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-700/80 pb-2">
              <div className="flex items-center gap-2">
                <Train className="w-4 h-4 text-cyan-400" />
                <span className="font-mono font-bold text-cyan-300 text-xs">
                  Train #{estimate.selectedTrain.trainNo}
                </span>
                <span className="text-xs font-semibold text-white">
                  {estimate.selectedTrain.trainName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-2 py-0.5 rounded font-mono">
                  Snapshot: {estimate.selectedTrain.snapshot}
                </span>
                {estimate.selectedTrain.crossesMidnight && (
                  <span className="bg-amber-950 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Overnight Service (+1 Day)
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Scheduled Departure</span>
                <span className="text-slate-200 font-semibold font-mono text-sm">
                  {estimate.selectedTrain.departureTime}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Scheduled Arrival</span>
                <span className="text-slate-200 font-semibold font-mono text-sm">
                  {estimate.selectedTrain.arrivalTime}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Calculated Duration</span>
                <span className="text-cyan-300 font-semibold font-mono text-sm">
                  {formatMinutes(estimate.totalDurationMinutes)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Corridor Stops</span>
                <span className="text-slate-200 font-semibold font-mono text-sm">
                  {estimate.selectedTrain.intermediateStops.length > 0
                    ? `${estimate.selectedTrain.intermediateStops.length} intermediate stops`
                    : 'Non-stop corridor express'}
                </span>
              </div>
            </div>

            {estimate.selectedTrain.intermediateStops.length > 0 && (
              <div className="text-[11px] text-slate-400 pt-1">
                <span className="text-slate-500 font-medium">Stops on corridor: </span>
                {estimate.selectedTrain.intermediateStops.join(' → ')}
              </div>
            )}

            <div className="text-[11px] text-slate-500 pt-1 border-t border-navy-800">
              Full service run: {estimate.selectedTrain.originStationName} → {estimate.selectedTrain.destinationStationName}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {estimate && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: 'Scheduled Duration',
                value: formatMinutes(estimate.totalDurationMinutes),
                color: 'text-slate-200',
                badge: 'TIMETABLE',
              },
              {
                label: 'PM2.5 Exposure Proxy',
                value: formatExposureProxy(estimate.totalPm25ExposureProxy),
                color: 'text-cyan-300',
                badge: 'SIMULATED',
              },
              {
                label: 'PM10 Exposure Proxy',
                value: formatExposureProxy(estimate.totalPm10ExposureProxy),
                color: 'text-teal-300',
                badge: 'SIMULATED',
              },
              {
                label: 'Corridor Segments',
                value: String(estimate.segments.length),
                color: 'text-slate-200',
              },
            ].map((c) => (
              <div key={c.label} className="bg-navy-700 rounded-xl border border-navy-500 p-3">
                <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                  {c.label}
                  {c.badge && (
                    <span className={c.badge === 'TIMETABLE' ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-1.5 py-0.5 rounded text-[9px] font-mono' : 'badge-simulated text-[9px]'}>
                      {c.badge}
                    </span>
                  )}
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
                  <th className="pb-2 font-medium">Scheduled Time</th>
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
                    <td className="py-2 pr-3 font-mono text-teal-400">{formatExposureProxy(seg.pm10ExposureProxy)}</td>
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
