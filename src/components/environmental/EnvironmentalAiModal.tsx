import React, { useState, useEffect } from 'react';
import {
  X,
  Brain,
  TrendingUp,
  ShieldAlert,
  BarChart3,
  AlertTriangle,
  Info,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { environmentalApiClient } from '../../services/environmentalApiClient';
import type {
  EnvironmentalAnalysisResponse,
  ForecastResponse,
  HealthRiskAdvisoryResponse,
} from '../../types/environmentalAi';
import type { EnvironmentalPollutant } from '../../types/environmental';

interface EnvironmentalAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePollutant: EnvironmentalPollutant;
  onPollutantChange?: (p: EnvironmentalPollutant) => void;
}

type TabType = 'analysis' | 'forecast' | 'advisory';

export const EnvironmentalAiModal: React.FC<EnvironmentalAiModalProps> = ({
  isOpen,
  onClose,
  activePollutant,
  onPollutantChange,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('analysis');
  const [datasetType, setDatasetType] = useState<'gridded_historical' | 'ground_snapshot'>('gridded_historical');
  const [horizonMonths, setHorizonMonths] = useState<number>(6);
  const [averagingPeriod, setAveragingPeriod] = useState<'24_hour_mean' | 'monthly_mean' | '1_hour_snapshot'>('24_hour_mean');

  const [analysisData, setAnalysisData] = useState<EnvironmentalAnalysisResponse | null>(null);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [advisoryData, setAdvisoryData] = useState<HealthRiskAdvisoryResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data when active tab or parameters change
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadData() {
      try {
        if (activeTab === 'analysis') {
          const res = await environmentalApiClient.fetchAiAnalysis(datasetType, activePollutant);
          if (isMounted) setAnalysisData(res);
        } else if (activeTab === 'forecast') {
          const res = await environmentalApiClient.fetchAiForecast(activePollutant, undefined, horizonMonths);
          if (isMounted) setForecastData(res);
        } else if (activeTab === 'advisory') {
          setAdvisoryData(null);
          const basis = averagingPeriod === 'monthly_mean' ? 'modelled_gridded' : 'observed_ground';
          const res = await environmentalApiClient.fetchAiAdvisory(
            activePollutant,
            undefined,
            averagingPeriod,
            basis
          );
          if (isMounted) setAdvisoryData(res);
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to query Environmental AI Engine.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab, activePollutant, datasetType, horizonMonths, averagingPeriod]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-white font-sans"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 tracking-tight">
                  Environmental Intelligence & Forecasting Engine
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 border border-sky-800 text-sky-300">
                  v1.0 STATISTICAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Deterministic climatology, out-of-sample statistical forecasting, and CPCB statutory health advisories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Pollutant Parameter Selector */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs font-mono">
              {(['PM2.5', 'PM10'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => onPollutantChange?.(p)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    activePollutant === p
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close modal"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2 gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`pb-2.5 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'analysis'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analysis & Climatology</span>
          </button>

          <button
            onClick={() => setActiveTab('forecast')}
            className={`pb-2.5 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'forecast'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Statistical Forecast</span>
          </button>

          <button
            onClick={() => setActiveTab('advisory')}
            className={`pb-2.5 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'advisory'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Public Safety Advisory</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400 text-sm font-mono">
              <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
              <span>Querying verified environmental engine...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-mono flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && activeTab === 'analysis' && analysisData && (
            <div className="space-y-5">
              {/* Dataset Scope & Source Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Data Source:</span>
                  <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                    <button
                      onClick={() => setDatasetType('gridded_historical')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        datasetType === 'gridded_historical'
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Gridded NetCDF (2017–2022)
                    </button>
                    <button
                      onClick={() => setDatasetType('ground_snapshot')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        datasetType === 'ground_snapshot'
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      CPCB Ground Telemetry Snapshot
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                    {analysisData.data_kind.toUpperCase()}
                  </span>
                  <span>{analysisData.spatial_scope}</span>
                </div>
              </div>

              {/* Descriptive Stats KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                  <div className="text-[11px] text-slate-400 uppercase font-mono">Mean Concentration</div>
                  <div className="text-xl font-bold text-white mt-1">
                    {analysisData.stats.mean ?? 'NA'}{' '}
                    <span className="text-xs font-normal text-slate-400">{analysisData.unit}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Median: {analysisData.stats.median} {analysisData.unit}
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                  <div className="text-[11px] text-slate-400 uppercase font-mono">Observed Range</div>
                  <div className="text-xl font-bold text-sky-400 mt-1">
                    {analysisData.stats.min_value} – {analysisData.stats.max_value}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Std Dev: ±{analysisData.stats.std_dev} {analysisData.unit}
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                  <div className="text-[11px] text-slate-400 uppercase font-mono">Interquartile Range</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    {analysisData.stats.iqr ?? 'NA'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    P25: {analysisData.stats.p25} · P75: {analysisData.stats.p75}
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                  <div className="text-[11px] text-slate-400 uppercase font-mono">Data Completeness</div>
                  <div className="text-xl font-bold text-slate-200 mt-1">
                    {analysisData.stats.valid_count} / {analysisData.stats.count}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Nulls Preserved: {analysisData.stats.null_count}
                  </div>
                </div>
              </div>

              {/* Seasonal Patterns (If Gridded Dataset) */}
              {analysisData.seasonal_trends.length > 0 && (
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                      Meteorological Seasonal Profile (Indo-Gangetic Plain)
                    </h3>
                    <span className="text-[10px] text-slate-400">72-Month Historical Climatology</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {analysisData.seasonal_trends.map((s) => (
                      <div
                        key={s.season_name}
                        className="bg-slate-900 border border-slate-800 p-3 rounded-lg space-y-1"
                      >
                        <div className="text-xs font-semibold text-slate-200">{s.season_name}</div>
                        <div className="text-lg font-bold text-sky-300">
                          {s.mean_concentration ?? 'NA'}{' '}
                          <span className="text-[10px] font-normal text-slate-400">{s.unit}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Months: {s.months.join(', ')} ({s.valid_observations} periods)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 12-Month Climatology Bar Chart */}
              {analysisData.climatology.length > 0 && (
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider text-slate-300 font-mono">
                      12-Month Multi-Year Historical Baseline (Jan – Dec Mean ± StDev)
                    </span>
                    <span className="text-[10px] text-slate-400">Zenodo IIT Delhi 10 km Modelled Grid</span>
                  </div>

                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analysisData.climatology} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis dataKey="month_name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-slate-950 border border-slate-700 p-2 rounded-lg text-xs font-mono shadow-xl">
                                  <div className="text-sky-400 font-bold">{d.month_name} (Historical Climatology)</div>
                                  <div className="text-slate-200">
                                    Mean: {d.historical_mean} {d.unit}
                                  </div>
                                  <div className="text-slate-400 text-[10px]">
                                    Std Dev: ±{d.historical_std} {d.unit}
                                  </div>
                                  <div className="text-slate-400 text-[10px]">
                                    Range: {d.historical_min} – {d.historical_max} {d.unit}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="historical_mean" fill="#0284C7" radius={[4, 4, 0, 0]}>
                          {analysisData.climatology.map((entry) => (
                            <Cell
                              key={`cell-${entry.month}`}
                              fill={entry.historical_mean > 150 ? '#EF4444' : entry.historical_mean > 90 ? '#F97316' : '#0284C7'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Standardized Anomaly Detection List */}
              {analysisData.recent_anomalies.length > 0 && (
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                      Recent Standardized Anomaly Assessments (Z-Score vs Month Baseline)
                    </h3>
                    <span className="text-[10px] text-slate-400">Baseline Deviation Analysis</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {analysisData.recent_anomalies.slice(-3).map((a) => (
                      <div
                        key={a.target_period}
                        className="bg-slate-900 border border-slate-800 p-3 rounded-lg space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200 font-mono text-xs">{a.target_period}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              a.anomaly_status === 'normal'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : a.anomaly_status === 'mild_anomaly'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-red-950 text-red-300 border border-red-800'
                            }`}
                          >
                            {a.anomaly_status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-slate-100">
                          {a.target_value} {a.unit}{' '}
                          <span className="text-[11px] font-normal text-slate-400">
                            (Baseline: {a.baseline_mean} {a.unit})
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Deviation: {a.deviation > 0 ? `+${a.deviation}` : a.deviation} {a.unit} · Z-score: {a.z_score}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Statistical anomaly denotes mathematical variance from historical baseline, not an immediate health emergency.
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {!loading && !error && activeTab === 'forecast' && forecastData && (
            <div className="space-y-5">
              {/* Statistical Forecast Header & Horizon Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
                <div>
                  <div className="font-bold text-slate-200">
                    Monthly Mean Statistical Projection ({forecastData.pollutant})
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Model: {forecastData.selected_model} · Resolution: {forecastData.forecast_resolution}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Horizon:</span>
                  <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                    {[3, 6, 9, 12].map((h) => (
                      <button
                        key={h}
                        onClick={() => setHorizonMonths(h)}
                        className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                          horizonMonths === h ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {h}M
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Genuine Out-of-Sample Evaluation Metrics Banner */}
              <div className="bg-sky-950/40 border border-sky-800/70 p-3 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-sky-300">
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  <span>Held-Out Chronological Evaluation (Leakage Prevention)</span>
                </div>
                <div className="text-slate-300 leading-relaxed text-[11px]">
                  Evaluated on 12 held-out months (2022) with train period {forecastData.evaluation.train_period_range}.
                  Held-out Test MAE:{' '}
                  <span className="font-mono font-bold text-white">
                    {forecastData.evaluation.mae} {forecastData.evaluation.unit}
                  </span>{' '}
                  · Held-out Test RMSE:{' '}
                  <span className="font-mono font-bold text-white">
                    {forecastData.evaluation.rmse} {forecastData.evaluation.unit}
                  </span>
                  .
                </div>
              </div>

              {/* Interactive Forecast Chart with ~95% Prediction Interval */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-300 font-mono">
                    Projected Trajectory with Empirical Uncertainty (~95% Bounds)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ±1.96 × Held-Out Test RMSE ({forecastData.evaluation.rmse} {forecastData.unit})
                  </span>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecastData.forecast_points} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                      <XAxis dataKey="period" stroke="#94A3B8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-xs font-mono shadow-xl space-y-1">
                                <div className="text-sky-400 font-bold">{d.period} (Step {d.step_ahead})</div>
                                <div className="text-white font-semibold">
                                  Point Estimate: {d.forecast_value} {d.unit}
                                </div>
                                <div className="text-slate-400 text-[10px]">
                                  95% Interval: [{d.lower_bound} – {d.upper_bound}] {d.unit}
                                </div>
                                <div className="text-[10px] font-semibold" style={{ color: d.color }}>
                                  Category: {d.category}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="upper_bound"
                        fill="#0284C7"
                        fillOpacity={0.15}
                        stroke="#0284C7"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        name="Upper Bound"
                      />
                      <Area
                        type="monotone"
                        dataKey="lower_bound"
                        fill="#0284C7"
                        fillOpacity={0.15}
                        stroke="#0284C7"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        name="Lower Bound"
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast_value"
                        stroke="#38BDF8"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#38BDF8', strokeWidth: 1 }}
                        name="Forecast Value"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Forecast Points Table */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3">Horizon</th>
                      <th className="py-2.5 px-3">Point Forecast</th>
                      <th className="py-2.5 px-3">~95% Bounds</th>
                      <th className="py-2.5 px-3">CPCB Band</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {forecastData.forecast_points.map((pt) => (
                      <tr key={pt.period} className="hover:bg-slate-900/50">
                        <td className="py-2 px-3 font-bold text-white">{pt.period}</td>
                        <td className="py-2 px-3 text-slate-400">+{pt.step_ahead} Mo</td>
                        <td className="py-2 px-3 font-semibold text-sky-300">
                          {pt.forecast_value} {pt.unit}
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          [{pt.lower_bound} – {pt.upper_bound}]
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                            style={{ backgroundColor: pt.color }}
                          >
                            {pt.category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Critical Limitation Safeguard */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-sky-400" />
                  <span>Forecast Methodology & Boundary Limitations</span>
                </div>
                <p>
                  Monthly gridded statistical forecasts operate strictly at monthly resolution based on the 2017–2022 IIT Delhi NetCDF series.
                  These models cannot establish next-hour or next-day predictions. The CPCB statutory ground snapshot is a single timestamp and is strictly excluded from temporal time-series forecasting.
                </p>
              </div>
            </div>
          )}

          {!loading && !error && activeTab === 'advisory' && advisoryData && (
            <div className="space-y-5">
              {/* Advisory Overview Card */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider text-white shadow-xs"
                      style={{ backgroundColor: advisoryData.color }}
                    >
                      {advisoryData.cpcb_category} (Risk: {advisoryData.risk_level.toUpperCase()})
                    </span>
                    {advisoryData.exceedance_status === 'unverified_averaging_period' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-amber-300 border border-amber-500/30">
                        UNVERIFIED PERIOD
                      </span>
                    )}
                    {advisoryData.exceedance_status === 'exceeds_threshold' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-500/30">
                        EXCEEDS STANDARD
                      </span>
                    )}
                    {advisoryData.exceedance_status === 'within_threshold' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        WITHIN STANDARD
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-mono">
                      {advisoryData.pollutant} · {advisoryData.concentration !== null ? advisoryData.concentration : 'NA'} {advisoryData.unit}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex flex-wrap gap-x-3 gap-y-1">
                    <span>Averaging Basis: {advisoryData.averaging_period.replace(/_/g, ' ')}</span>
                    <span>·</span>
                    <span>Data Kind: {advisoryData.data_basis === 'modelled_gridded' ? 'Modelled Gridded Estimate' : 'Observed Ground Sensor'}</span>
                    <span>·</span>
                    <span>Ref: {advisoryData.standard_reference}</span>
                  </div>
                </div>

                {/* Averaging Period Selector */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Averaging Period:</span>
                  <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                    <button
                      onClick={() => setAveragingPeriod('24_hour_mean')}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                        averagingPeriod === '24_hour_mean'
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      24-Hr Standard
                    </button>
                    <button
                      onClick={() => setAveragingPeriod('monthly_mean')}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                        averagingPeriod === 'monthly_mean'
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Monthly Mean
                    </button>
                    <button
                      onClick={() => setAveragingPeriod('1_hour_snapshot')}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                        averagingPeriod === '1_hour_snapshot'
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      1-Hr Snapshot
                    </button>
                  </div>
                </div>
              </div>

              {/* Compatibility & Safeguard Notice */}
              {advisoryData.exceedance_status === 'unverified_averaging_period' && (
                <div className="bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-xl text-xs space-y-1.5">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Averaging Period & Statutory Standard Compatibility Notice</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {advisoryData.averaging_period === '24_hour_mean' && (
                      <>
                        The active ground record is an <strong>instantaneous snapshot</strong> from{' '}
                        <span className="font-mono text-amber-200">{advisoryData.data_timestamp}</span>. CPCB NAAQS 2009 statutory standards require a 24-hour integrated mean (minimum 16 hours continuous diurnal sampling). Evaluating an instantaneous point observation directly against a 24-hour statutory threshold without continuous diurnal sampling is statistically unverified.
                      </>
                    )}
                    {advisoryData.averaging_period === 'monthly_mean' && (
                      <>
                        This concentration is a <strong>monthly modelled gridded mean</strong> derived from satellite AOD and chemical transport modelling (IIT Delhi NetCDF series, period ending{' '}
                        <span className="font-mono text-amber-200">{advisoryData.data_timestamp}</span>). CPCB NAAQS 2009 establishes 24-hour and annual standards, but does <strong>not</strong> define a monthly statutory threshold. This value provides climatological context rather than a statutory compliance violation.
                      </>
                    )}
                    {advisoryData.averaging_period === '1_hour_snapshot' && (
                      <>
                        The active record is an instantaneous measurement at <span className="font-mono text-amber-200">{advisoryData.data_timestamp}</span>. Under CPCB NAAQS 2009, 1-hour statutory standards exist strictly for <strong>CO</strong> (4.0 mg/m³) and <strong>Ozone</strong> (180 µg/m³); there is no statutory 1-hour threshold for <strong>{advisoryData.pollutant}</strong>.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* General Public Advisory */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                  <Info className="w-4 h-4 text-sky-400" />
                  <span>General Population Environmental Guidance</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800/80">
                  {advisoryData.general_public_advisory}
                </p>
              </div>

              {/* Sensitive Groups Dedicated Guidance */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Sensitive & Vulnerable Populations Guidance</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {advisoryData.sensitive_groups_guidance.map((sg) => (
                    <div
                      key={sg.group_name}
                      className="bg-slate-900 border border-slate-800 p-3 rounded-lg space-y-1 text-xs"
                    >
                      <div className="font-bold text-slate-200 text-[11px]">{sg.group_name}</div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{sg.precaution}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer and Non-Clinical Notice */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[10px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">Statutory & Clinical Integrity Notice</div>
                <p>{advisoryData.disclaimer}</p>
                <div className="pt-1 text-slate-400 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                  <span>Data Timestamp: {advisoryData.data_timestamp}</span>
                  <span>·</span>
                  <span>Confidence: {advisoryData.confidence_level === 'not_estimated' ? 'NOT ESTIMATED (DETERMINISTIC EVALUATION)' : advisoryData.confidence_level.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>RailAir Intelligence AI Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
