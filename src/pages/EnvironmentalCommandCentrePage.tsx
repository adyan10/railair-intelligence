import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Flame,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  MapPin,
  ExternalLink,
  Train,
  CheckCircle2,
  Calendar,
  Loader2,
  Brain,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { useEnvironmental } from '../context/EnvironmentalContext';
import { environmentalApiClient } from '../services/environmentalApiClient';
import type { CorridorStationComparison, HotspotRankItem, TimeSeriesPoint } from '../types/environmental';
import type { ForecastResponse, HealthRiskAdvisoryResponse } from '../types/environmentalAi';

export const EnvironmentalCommandCentrePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    pollutant,
    setPollutant,
    selectedPeriod,
    selectedPeriodIndex,
    setSelectedPeriodIndex,
    periods,
    gridData,
    setSelectedCell,
    inspectCoordinate,
  } = useEnvironmental();

  const [hotspots, setHotspots] = useState<HotspotRankItem[]>([]);
  const [corridorComparison, setCorridorComparison] = useState<CorridorStationComparison[]>([]);
  const [timeseries, setTimeseries] = useState<TimeSeriesPoint[]>([]);
  const [aiAdvisory, setAiAdvisory] = useState<HealthRiskAdvisoryResponse | null>(null);
  const [aiForecast, setAiForecast] = useState<ForecastResponse | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedPeriod) return;
    let isMounted = true;
    setLoadingData(true);

    async function loadDashboardData() {
      try {
        const [hData, cData, tData, advData, fData] = await Promise.all([
          environmentalApiClient.fetchHotspots(pollutant, selectedPeriod!.year, selectedPeriod!.month, 8),
          environmentalApiClient.fetchCorridorComparison(pollutant, selectedPeriod!.year, selectedPeriod!.month),
          environmentalApiClient.fetchTimeseries(undefined, 28.6676, 77.2431, pollutant),
          environmentalApiClient.fetchAiAdvisory(pollutant, undefined, '24_hour_mean', 'observed_ground'),
          environmentalApiClient.fetchAiForecast(pollutant as 'PM2.5' | 'PM10', undefined, 6),
        ]);
        if (isMounted) {
          setHotspots(hData.items);
          setCorridorComparison(cData);
          setTimeseries(tData.timeseries);
          setAiAdvisory(advData);
          setAiForecast(fData);
        }
      } catch (err) {
        console.error('Failed to load command centre data', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [pollutant, selectedPeriod]);

  const summary = gridData?.summary;

  const navigateToExplorerWithCell = (gridId: string, lat: number, lon: number) => {
    if (gridData) {
      const match = gridData.cells.find((c) => c.grid_id === gridId);
      if (match) setSelectedCell(match);
    }
    inspectCoordinate(lat, lon);
    navigate('/explorer');
  };

  return (
    <div className="flex-1 bg-[#F5F6F8] text-[#192734] p-4 sm:p-6 overflow-y-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-[#DCE3EA] p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#17365D] text-white">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#17365D] tracking-tight">
                ENVIRONMENTAL COMMAND CENTRE
              </h1>
              <p className="text-xs font-mono text-slate-500">
                Synchronized Regional Air Quality Intelligence & Corridor Exposure Analytics
              </p>
            </div>
          </div>
        </div>

        {/* Global Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Pollutant selector */}
          <div className="inline-flex rounded-lg border border-[#DCE3EA] p-1 bg-slate-50 text-xs font-mono">
            {(['PM2.5', 'PM10'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPollutant(p)}
                className={`px-3 py-1 rounded font-semibold transition-colors ${
                  pollutant === p
                    ? 'bg-[#17365D] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Period selector dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 border border-[#DCE3EA] px-3 py-1.5 rounded-lg text-xs font-mono">
            {loadingData ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
            ) : (
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
            )}
            <select
              value={selectedPeriodIndex}
              onChange={(e) => setSelectedPeriodIndex(Number(e.target.value))}
              className="bg-transparent font-semibold text-[#17365D] focus:outline-hidden cursor-pointer"
              aria-label="Select historical period"
            >
              {periods.map((p, idx) => (
                <option key={p.period} value={idx}>
                  {p.label} ({p.period})
                </option>
              ))}
            </select>
          </div>

          {/* Quick link to Explorer */}
          <button
            onClick={() => navigate('/explorer')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold transition-colors shadow-xs"
          >
            <span>Open in Explorer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Regional Mean */}
        <div className="bg-white rounded-xl border border-[#DCE3EA] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
            <span>REGIONAL AMBIENT MEAN</span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
              style={{
                backgroundColor:
                  summary?.cpcb_dominant_category === 'Good'
                    ? '#10B981'
                    : summary?.cpcb_dominant_category === 'Satisfactory'
                    ? '#84CC16'
                    : summary?.cpcb_dominant_category === 'Moderate'
                    ? '#EAB308'
                    : summary?.cpcb_dominant_category === 'Poor'
                    ? '#F97316'
                    : '#EF4444',
              }}
            >
              {summary?.cpcb_dominant_category ?? 'Loading'}
            </span>
          </div>
          <div className="text-2xl font-bold text-[#17365D] tracking-tight">
            {summary?.mean ?? '—'}{' '}
            <span className="text-xs font-normal text-slate-500 font-mono">µg/m³</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center justify-between">
            <span>Median: {summary?.median ?? '—'} µg/m³</span>
            <span>Std Dev: ±{summary?.std_dev ?? '—'}</span>
          </div>
        </div>

        {/* Card 2: Peak Hotspot Concentration */}
        <div className="bg-white rounded-xl border border-[#DCE3EA] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-red-500" />
              PEAK CONCENTRATION
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600 tracking-tight">
            {summary?.max ?? '—'}{' '}
            <span className="text-xs font-normal text-slate-500 font-mono">µg/m³</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            {hotspots[0] ? `At cell ${hotspots[0].grid_id}` : 'Top regional cell'}
          </div>
        </div>

        {/* Card 3: Minimum Cleanest Cell */}
        <div className="bg-white rounded-xl border border-[#DCE3EA] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
            <span>CLEANEST CELL</span>
            <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight">
            {summary?.min ?? '—'}{' '}
            <span className="text-xs font-normal text-slate-500 font-mono">µg/m³</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            Lowest recorded in corridor envelope
          </div>
        </div>

        {/* Card 4: Spatial Coverage Quality */}
        <div className="bg-white rounded-xl border border-[#DCE3EA] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
            <span>DATA COVERAGE</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-[#17365D] tracking-tight">
            {summary?.coverage_pct ?? 100}%
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            {summary?.valid_cells ?? 64} / {summary?.total_cells ?? 64} cells (0 missing)
          </div>
        </div>
      </div>

      {/* Environmental AI Public Safety Advisory & Forecast Summary Banner */}
      {aiAdvisory && (
        <div className="bg-white rounded-xl border border-[#DCE3EA] p-5 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold font-mono text-[#17365D] uppercase tracking-wider">
                  Environmental AI Public Safety Advisory & Statistical Forecast
                </h2>
                <p className="text-[11px] font-mono text-slate-500">
                  Statutory CPCB NAAQS 2009 Reference · Snapshot Timestamp: {aiAdvisory.data_timestamp}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-1 rounded text-xs font-bold text-white font-mono shadow-xs"
                style={{ backgroundColor: aiAdvisory.color }}
              >
                {aiAdvisory.cpcb_category} (Risk: {aiAdvisory.risk_level.toUpperCase()})
              </span>

              <button
                onClick={() => navigate('/explorer')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#17365D] hover:bg-[#122b4a] text-white text-xs font-mono font-medium transition-colors shadow-xs"
              >
                <span>Detailed AI Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="md:col-span-2 space-y-1">
              <div className="text-[11px] text-slate-500 font-semibold uppercase">General Population Guidance</div>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {aiAdvisory.general_public_advisory}
              </p>
            </div>

            {aiForecast && aiForecast.forecast_points.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] text-slate-500 font-semibold uppercase">
                  6-Month Statistical Forecast ({aiForecast.pollutant})
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-bold">{aiForecast.forecast_points[0].period} (Next Mo):</span>
                    <span className="text-[#17365D] font-bold text-sm">
                      {aiForecast.forecast_points[0].forecast_value} {aiForecast.unit}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Model: {aiForecast.selected_model} (Held-out RMSE: {aiForecast.evaluation.rmse} {aiForecast.unit})
                  </div>
                  <div className="text-[10px] text-slate-400">
                    *Monthly gridded estimate; not next-day forecast.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Charts & Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Multi-Year Seasonal Trend Chart (Span 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#DCE3EA] p-5 shadow-xs flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#17365D] font-mono">
                HISTORICAL 6-YEAR SEASONAL PROFILE (2017–2022)
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                72 Monthly time steps · Demonstrates regular winter peaks and monsoon depressions
              </p>
            </div>
            <div className="text-xs font-mono px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              Active: {selectedPeriod?.label} ({selectedPeriod?.period})
            </div>
          </div>

          <div className="h-64 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284C7" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#0284C7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="period"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  interval={11} // Tick per year
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  unit=" µg"
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as TimeSeriesPoint;
                      return (
                        <div className="bg-[#17365D] text-white p-2.5 rounded-lg shadow-lg text-xs font-mono border border-slate-700">
                          <div className="font-bold text-sky-300">{data.period}</div>
                          <div className="mt-1">
                            {pollutant}: <span className="font-bold text-white">{data.value} µg/m³</span>
                          </div>
                          <div className="text-[10px] text-slate-300">Category: {data.category}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0284C7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#trendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-2 text-center">
            Source: Zenodo Collection 2 Continuous NetCDF · 10 km Spatial Resolution
          </div>
        </div>

        {/* Rail Corridor Exposure Comparison (1 col) */}
        <div className="bg-white rounded-xl border border-[#DCE3EA] p-5 shadow-xs flex flex-col">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-[#17365D] font-mono flex items-center gap-1.5">
              <Train className="w-4 h-4 text-sky-600" />
              CORRIDOR STATIONS AMBIENT
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Regional grid value at the 7 canonical stations
            </p>
          </div>

          <div className="h-64 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={corridorComparison}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" fontSize={10} stroke="#64748B" unit=" µg" />
                <YAxis dataKey="station_id" type="category" fontSize={10} stroke="#64748B" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as CorridorStationComparison;
                      return (
                        <div className="bg-[#17365D] text-white p-2.5 rounded-lg shadow-lg text-xs font-mono">
                          <div className="font-bold text-sky-300">
                            {data.station_id} · {data.station_name}
                          </div>
                          <div className="mt-1">
                            Ambient: {data.ambient_grid_value} µg/m³
                          </div>
                          <div className="text-[10px] text-slate-300">
                            Cell distance: {data.distance_to_cell_km} km
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="ambient_grid_value" radius={[0, 4, 4, 0]}>
                  {corridorComparison.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-2 text-center">
            7 Canonical Nodes: MRT → MMU → MNR → GZB → SAH → DSO → NDLS
          </div>
        </div>
      </div>

      {/* Regional Hotspots Ranking Table */}
      <div className="bg-white rounded-xl border border-[#DCE3EA] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#17365D] font-mono flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-600" />
              RANKED POLLUTION HOTSPOTS — {selectedPeriod?.label.toUpperCase()}
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Top 8 highest concentration grid cells across the wider Delhi–NCR corridor envelope
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Sorted by {pollutant} Descending
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase bg-slate-50">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Grid Cell</th>
                <th className="py-2.5 px-3">Coordinates</th>
                <th className="py-2.5 px-3">Concentration</th>
                <th className="py-2.5 px-3">CPCB Category</th>
                <th className="py-2.5 px-3">Nearest Railway Node</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hotspots.map((h) => (
                <tr key={h.grid_id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-700">#{h.rank}</td>
                  <td className="py-2.5 px-3 font-semibold text-[#17365D]">{h.grid_id}</td>
                  <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                    {h.latitude.toFixed(4)}°N, {h.longitude.toFixed(4)}°E
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    {h.value} <span className="font-normal text-slate-500 text-[11px]">µg/m³</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                      style={{ backgroundColor: h.color }}
                    >
                      {h.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {h.nearest_canonical_station_id ? (
                      <span className="flex items-center gap-1.5">
                        <Train className="w-3 h-3 text-sky-600" />
                        <span>{h.nearest_canonical_station_id}</span>
                        <span className="text-[10px] text-slate-400">
                          ({h.distance_to_canonical_km} km)
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() =>
                        navigateToExplorerWithCell(h.grid_id, h.latitude, h.longitude)
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-[#17365D] hover:text-white text-slate-700 transition-colors text-[11px]"
                      title="Inspect this hotspot on the Explorer map"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>Map View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scientific Provenance & Architecture Notice */}
      <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 text-xs font-mono text-slate-600 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-[#17365D]">
            DATA INTEGRITY & METHODOLOGICAL NOTICE
          </div>
          <p className="text-[11px] leading-relaxed">
            Data displayed represents verified monthly gridded PM2.5/PM10 surface estimates from{' '}
            <strong>Zenodo Collection 2 (10 km WGS84)</strong> spanning 2017 to 2022. Ground values are
            derived from satellite aerosol optical depth (AOD), chemical transport models (CTM), and
            calibrated against Central Pollution Control Board (CPCB) statutory CAAQMS telemetry. This
            interface serves historical research intelligence; observations reflect monthly aggregate
            conditions and are distinct from unaggregated live telemetry.
          </p>
        </div>
      </div>
    </div>
  );
};
