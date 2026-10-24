import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { mockRailairService } from '../services/mockRailairService';
import type { KpiSummary, TrendDataPoint, DataQualityItem, CorridorContextType } from '../types/railair';
import { STATIONS } from '../data/mock';
import { KpiCards } from '../components/KpiCards';
import { TrendChart } from '../components/TrendChart';
import { DataQualityTable } from '../components/DataQualityTable';
import {
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Navigation,
} from 'lucide-react';
import { formatISOTimestamp } from '../lib/formatters';
import { formatHourIST, getCpcbCategory, getNaqiEstimate } from '../lib/diurnal';

export function OverviewPage() {
  const navigate = useNavigate();
  const corridorCtx = useOutletContext<CorridorContextType | undefined>();
  const activePollutant = corridorCtx?.selectedPollutant ?? 'PM2.5';
  const activeHour = corridorCtx?.selectedHour ?? 18;
  const diurnalFactor = corridorCtx?.diurnalFactor ?? 1.0;

  const [kpi, setKpi] = useState<KpiSummary | null>(null);
  const [trend, setTrend] = useState<TrendDataPoint[]>([]);
  const [quality, setQuality] = useState<DataQualityItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [k, t, q] = await Promise.all([
      mockRailairService.getKpiSummary(),
      mockRailairService.getTrend(),
      mockRailairService.getDataQuality(),
    ]);
    setKpi(k);
    setTrend(t);
    setQuality(q);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Scale baseline average metrics dynamically with the diurnal cycle
  const currentKpi: KpiSummary | null = kpi
    ? {
        ...kpi,
        avgPm25: Math.round(kpi.avgPm25 * diurnalFactor),
        avgPm10: Math.round(kpi.avgPm10 * diurnalFactor),
      }
    : null;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* =========================================================================
          HERO COMPOSITION: INSTITUTIONAL LIGHT OVERVIEW
         ========================================================================= */}
      <div className="relative bg-white rounded-2xl border border-[#DCE3EA] p-6 md:p-8 shadow-xs overflow-hidden">
        {/* Subtle Grid Canvas */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] bg-grid-canvas"
        />

        {/* Top Meta Row */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="inline-flex items-center space-x-2 text-xs font-mono font-medium px-3 py-1 rounded bg-[#17365D]/10 text-[#17365D]">
            <span>CORRIDOR PROTOTYPE: DELHI DIVISION</span>
            <span className="text-slate-300">·</span>
            <span>NR BROAD GAUGE</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-[#64748B] bg-slate-50 border border-[#DCE3EA] px-3 py-1 rounded-md">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>GEO-PROVENANCE SYSTEM: ACTIVE</span>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-mono text-[#17365D] hover:bg-slate-50 border border-[#DCE3EA] px-3 py-1 rounded-md transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Hero Grid: Text Content + Technical Locomotive Graphic */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#17365D] leading-[1.2]">
              Atmospheric intelligence along India's rail corridors.
            </h2>
            <p className="text-sm md:text-base text-[#64748B] leading-relaxed max-w-2xl">
              A technical geospatial instrument designed to monitor particulate exposure (PM2.5 / PM10),
              validate sensor fidelity, and map trackway environmental conditions with geographic rigor.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/corridor')}
                className="px-5 py-2.5 bg-[#17365D] hover:bg-[#122b4a] text-white rounded-md font-medium text-xs font-mono transition-all duration-200 flex items-center space-x-2 shadow-xs active:scale-95"
              >
                <span>Explore Corridor Map</span>
                <ChevronRight size={15} />
              </button>
              <button
                onClick={() => navigate('/journey')}
                className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-[#DCE3EA] text-[#17365D] rounded-md font-medium text-xs font-mono transition-all flex items-center space-x-2 shadow-2xs"
              >
                <Navigation size={14} />
                <span>Calculate Journey Exposure</span>
              </button>
            </div>
          </div>

          {/* Right Technical Locomotive Vector Composition */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* India Outline Muted Watermark */}
            <svg
              className="absolute right-0 w-72 h-auto text-[#DCE3EA]/60 -z-10 pointer-events-none"
              viewBox="0 0 400 450"
              fill="currentColor"
            >
              <path d="M190,20 L210,40 L230,45 L240,65 L225,80 L230,110 L250,130 L260,160 L240,180 L255,200 L240,230 L220,260 L205,300 L180,330 L160,370 L145,390 L135,350 L140,300 L125,270 L110,240 L105,210 L80,180 L95,150 L110,130 L130,110 L150,90 L170,50 Z" />
            </svg>

            {/* Indian Railways WAP-7 Technical Side-Profile Vector */}
            <div className="w-full p-4 bg-white/95 backdrop-blur-xs rounded-xl border border-[#DCE3EA] shadow-xs">
              <div className="text-[10px] font-mono text-[#64748B] mb-2 flex justify-between">
                <span>LOCOMOTIVE SPEC: WAP-7 [3-PHASE 25kV AC]</span>
                <span>NR FLEET</span>
              </div>
              <svg viewBox="0 0 600 200" className="w-full h-auto drop-shadow-xs">
                {/* Track line */}
                <line x1="20" y1="175" x2="580" y2="175" stroke="#17365D" strokeWidth="2" strokeDasharray="6,4" />

                {/* Body Shell */}
                <rect x="70" y="80" width="460" height="70" rx="4" fill="#17365D" />
                <rect x="70" y="112" width="460" height="12" fill="#FFFFFF" />
                <rect x="70" y="124" width="460" height="4" fill="#DC2626" />

                {/* Cabs */}
                <path d="M70,80 L50,105 L50,150 L70,150 Z" fill="#17365D" />
                <polygon points="53,105 68,88 68,110 53,110" fill="#E2E8F0" />

                <path d="M530,80 L550,105 L550,150 L530,150 Z" fill="#17365D" />
                <polygon points="547,105 532,88 532,110 547,110" fill="#E2E8F0" />

                {/* Windows */}
                <rect x="110" y="92" width="28" height="14" rx="2" fill="#CBD5E1" />
                <rect x="160" y="92" width="28" height="14" rx="2" fill="#CBD5E1" />
                <rect x="410" y="92" width="28" height="14" rx="2" fill="#CBD5E1" />
                <rect x="460" y="92" width="28" height="14" rx="2" fill="#CBD5E1" />

                {/* Pantograph (25kV AC Overhead) */}
                <polyline points="180,80 200,45 230,45 250,80" fill="none" stroke="#64748B" strokeWidth="2.5" />
                <line x1="190" y1="45" x2="240" y2="45" stroke="#475569" strokeWidth="3" />

                {/* 3-Axle Bogies */}
                <g fill="#334155">
                  <circle cx="110" cy="165" r="10" />
                  <circle cx="140" cy="165" r="10" />
                  <circle cx="170" cy="165" r="10" />
                  <circle cx="430" cy="165" r="10" />
                  <circle cx="460" cy="165" r="10" />
                  <circle cx="490" cy="165" r="10" />
                </g>
              </svg>
              <div className="flex justify-between items-center mt-2 text-[10px] font-mono text-[#64748B]">
                <span>ALIGNMENT: MEERUT - DELHI TRACKWAY</span>
                <span className="text-emerald-700 font-semibold">GEOMETRY VERIFIED (SAMPLE)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          DATA PROVENANCE & SIMULATED NOTICE
         ========================================================================= */}
      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5 text-xs font-mono">
        <div className="flex items-center space-x-2 text-amber-900 font-semibold text-xs">
          <AlertTriangle size={15} className="text-amber-700" />
          <span>DATA PROVENANCE NOTICE · SIMULATED BASELINE PROTOTYPE</span>
        </div>
        <p className="text-amber-800 text-xs leading-relaxed">
          All aerosol concentration metrics, exposure proxies, and station telemetry depicted here represent synthetic baseline models
          developed for interface prototyping. Direct empirical telemetry feeds from CPCB and SPCB monitors will connect via API in future phases.
          Coverage indicates 2 of 7 stations have baseline real-world references; the remaining 5 nodes are synthetic interpolations.
        </p>
        <div className="text-[11px] text-amber-700 pt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>RECORD BASELINE: {kpi ? formatISOTimestamp(kpi.timestamp) : '24 Oct 2026, 18:30 IST'}</span>
          <span>·</span>
          <span>ACTIVE DIURNAL STEP: {formatHourIST(activeHour)} ({diurnalFactor.toFixed(2)}× factor)</span>
          <span>·</span>
          <span>ACTIVE POLLUTANT: {activePollutant}</span>
          <span>·</span>
          <span>REPOSITORY ID: NR-DELHI-MTC-01</span>
        </div>
      </div>

      {/* =========================================================================
          KPI TELEMETRY CARDS
         ========================================================================= */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-[#DCE3EA] h-32 animate-pulse" />
          ))}
        </div>
      ) : kpi ? (
        <KpiCards kpi={currentKpi ?? kpi} activePollutant={activePollutant} />
      ) : null}

      {/* =========================================================================
          CORRIDOR NODE STRIP PREVIEW
         ========================================================================= */}
      <div className="bg-white rounded-xl border border-[#DCE3EA] p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#17365D] tracking-tight">
              Monitored Corridor Nodes (7 Station Alignment)
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Northern Railway Mainline · Meerut City to New Delhi Terminal (83 km) · {activePollutant} at {formatHourIST(activeHour)}
            </p>
          </div>
          <button
            onClick={() => navigate('/corridor')}
            className="text-xs font-mono font-medium text-[#17365D] hover:underline flex items-center space-x-1"
          >
            <span>View Full Interactive Map</span>
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Station Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {STATIONS.map((station, idx) => {
            const basePm25 = station.observations.find((o) => o.pollutant === 'PM2.5')?.value ?? 0;
            const basePm10 = station.observations.find((o) => o.pollutant === 'PM10')?.value ?? Math.round(basePm25 * 1.7);
            const val = activePollutant === 'PM10'
              ? Math.round(basePm10 * diurnalFactor)
              : activePollutant === 'NAQI'
              ? getNaqiEstimate(Math.round(basePm25 * diurnalFactor))
              : Math.round(basePm25 * diurnalFactor);
            const cpcb = getCpcbCategory(val, activePollutant);

            return (
              <div
                key={station.id}
                onClick={() => navigate('/corridor')}
                className="p-3 rounded-lg border border-[#DCE3EA] bg-slate-50 hover:bg-white hover:border-[#17365D]/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                  <span>#{idx + 1}</span>
                  <span>{station.distanceFromOriginKm} km</span>
                </div>
                <div className="font-semibold text-xs text-[#17365D] group-hover:text-[#122b4a] truncate">
                  {station.shortName}
                </div>
                <div className="text-[10px] font-mono text-slate-500 truncate">
                  IR: {station.id}
                </div>
                <div className="mt-2 pt-2 border-t border-[#DCE3EA] flex items-baseline justify-between">
                  <span className="text-base font-bold font-mono text-[#17365D]">
                    {val}
                    <span className="text-[9px] text-slate-400 font-normal ml-0.5">
                      {activePollutant === 'NAQI' ? 'AQI' : 'µg'}
                    </span>
                  </span>
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
                    style={{ backgroundColor: cpcb.bg, borderColor: cpcb.border, color: cpcb.text }}
                  >
                    {cpcb.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          24-HOUR SIMULATED TREND CHART
         ========================================================================= */}
      <div className="bg-white rounded-xl border border-[#DCE3EA] p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div>
            <h3 className="text-sm font-semibold text-[#17365D] tracking-tight">
              24-Hour Diurnal Simulated Concentration Profile
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Corridor average particulate levels · Active timestep: {formatHourIST(activeHour)} ({diurnalFactor.toFixed(2)}× baseline)
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-800">
            SIMULATED DIURNAL PROFILE
          </span>
        </div>

        {loading ? (
          <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
        ) : (
          <TrendChart data={trend} />
        )}
      </div>

      {/* =========================================================================
          REGULATORY STANDARDS BENCHMARKS (WHO vs NAAQS)
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl border border-[#DCE3EA] bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-medium text-slate-500 uppercase tracking-wider">
              WHO PM2.5 Guideline (2021)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
              NON-COMPLIANT
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-[#17365D]">15 µg/m³</div>
          <p className="text-xs font-mono text-slate-600 mt-2 leading-relaxed">
            Annual mean air quality benchmark. Current simulated corridor average of{' '}
            <strong className="text-[#17365D]">{currentKpi ? `${currentKpi.avgPm25} µg/m³` : '135 µg/m³'}</strong> at {formatHourIST(activeHour)} is approximately{' '}
            <strong className="text-red-700 font-semibold">{currentKpi ? `${Math.round(currentKpi.avgPm25 / 15)}×` : '9×'}</strong>{' '}
            above the international threshold.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-[#DCE3EA] bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-medium text-slate-500 uppercase tracking-wider">
              India NAAQS Standard (CPCB)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
              EXCEEDED
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-[#17365D]">60 µg/m³</div>
          <p className="text-xs font-mono text-slate-600 mt-2 leading-relaxed">
            National Ambient Air Quality Standard (24-hour limit). Current simulated corridor level is{' '}
            <strong className="text-orange-700 font-semibold">
              {currentKpi ? `+${Math.round((currentKpi.avgPm25 / 60 - 1) * 100)}%` : '+125%'}
            </strong>{' '}
            over India's domestic standard at {formatHourIST(activeHour)}.
          </p>
        </div>
      </div>

      {/* =========================================================================
          DATA PROVENANCE & SOURCES REGISTRY
         ========================================================================= */}
      <div className="bg-white rounded-xl border border-[#DCE3EA] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#17365D] tracking-tight">
              Data Provenance &amp; Instrument Fidelity Registry
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Auditable provenance metadata documenting empirical reference feeds and synthetic interpolations
            </p>
          </div>
        </div>

        {loading ? (
          <div className="h-32 bg-slate-100 rounded-lg animate-pulse" />
        ) : (
          <DataQualityTable items={quality} />
        )}
      </div>

      {/* =========================================================================
          FOOTER REFERENCE METADATA
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 font-mono border-t border-[#DCE3EA] pt-4 gap-2">
        <div>CENTRAL RAILWAY CORRIDOR RESEARCH DIRECTORY · DELHI DIVISION</div>
        <div className="flex items-center space-x-4">
          <span>WGS84 EPSG:4326</span>
          <span>SIMULATED MODELING v0.1</span>
        </div>
      </div>
    </div>
  );
}
