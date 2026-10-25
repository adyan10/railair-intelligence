import React from 'react';
import { Wind, AlertCircle } from 'lucide-react';
import { useEnvironmental } from '../context/EnvironmentalContext';
import { EnvironmentalExplorerMap } from '../components/environmental/EnvironmentalExplorerMap';
import { HistoricalTimeline } from '../components/environmental/HistoricalTimeline';
import { LocationInspectorPanel } from '../components/environmental/LocationInspectorPanel';

export const EnvironmentalExplorerPage: React.FC = () => {
  const { pollutant, setPollutant, selectedPeriod, gridData, error } = useEnvironmental();

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col">
      {/* 100% Full Viewport Map */}
      <div className="absolute inset-0 w-full h-full z-0">
        <EnvironmentalExplorerMap />
      </div>

      {/* Floating Ultra-Sleek Top Bar (Windy-style) */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none gap-2">
        {/* Left Floating Controls */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/70 shadow-xl font-mono text-xs text-white">
          <div className="flex items-center gap-1.5 text-sky-400 font-bold tracking-tight">
            <Wind className="w-4 h-4" />
            <span className="hidden sm:inline">RAILAIR EXPLORER</span>
          </div>

          <span className="text-slate-600 hidden sm:inline">|</span>

          {/* Active Period Badge */}
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 tracking-wider">
            {selectedPeriod ? selectedPeriod.label.toUpperCase() : 'HISTORICAL'}
          </span>

          {/* Pollutant Parameter Switcher */}
          <div className="flex items-center gap-0.5 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700 text-[11px]">
            {(['PM2.5', 'PM10'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPollutant(p)}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  pollutant === p
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Right Floating Summary Pill */}
        {gridData && (
          <div className="hidden sm:flex items-center gap-2.5 pointer-events-auto bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/70 shadow-xl font-mono text-xs text-white">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px]">Regional Mean:</span>
              <span className="font-bold text-slate-100">
                {gridData.summary.mean} {gridData.unit}
              </span>
            </div>
            <span className="text-slate-600">·</span>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
              <span className="text-slate-400">Spread:</span>
              <span className="font-semibold text-sky-300">
                {gridData.summary.min} – {gridData.summary.max}
              </span>
            </div>
            <span
              className="w-2.5 h-2.5 rounded-full shadow-xs"
              style={{
                backgroundColor:
                  gridData.summary.cpcb_dominant_category === 'Good'
                    ? '#10B981'
                    : gridData.summary.cpcb_dominant_category === 'Satisfactory'
                    ? '#84CC16'
                    : gridData.summary.cpcb_dominant_category === 'Moderate'
                    ? '#EAB308'
                    : gridData.summary.cpcb_dominant_category === 'Poor'
                    ? '#F97316'
                    : '#EF4444',
              }}
              title={`Dominant CPCB Category: ${gridData.summary.cpcb_dominant_category}`}
            />
          </div>
        )}
      </div>

      {/* Error Banner if any */}
      {error && (
        <div className="absolute top-16 left-4 right-4 z-30 bg-red-950/90 border border-red-800 text-red-200 px-4 py-2 rounded-xl text-xs font-mono flex items-center gap-2 shadow-xl backdrop-blur-md">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Floating Point Inspection Panel */}
      <LocationInspectorPanel />

      {/* Bottom Floating Playback Controller */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[92%] sm:w-[85%] md:w-[75%] lg:w-[60%] z-20">
        <HistoricalTimeline />
      </div>
    </div>
  );
};
