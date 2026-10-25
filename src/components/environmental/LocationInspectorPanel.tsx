import React from 'react';
import { X, MapPin, Train, Activity, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { useEnvironmental } from '../../context/EnvironmentalContext';

export const LocationInspectorPanel: React.FC = () => {
  const { selectedCell, setSelectedCell, inspectionData, pollutant, selectedPeriod } = useEnvironmental();

  if (!selectedCell && !inspectionData) return null;

  const timeseries = inspectionData?.timeseries ?? [];
  const displayVal = inspectionData?.value ?? selectedCell?.value;
  const displayCategory = inspectionData?.category ?? selectedCell?.category ?? 'Standard';
  const displayColor = inspectionData?.color ?? selectedCell?.color ?? '#10B981';
  const queryLat = inspectionData?.query_latitude ?? selectedCell?.latitude;
  const queryLon = inspectionData?.query_longitude ?? selectedCell?.longitude;
  const sourceGridId = inspectionData?.grid_id ?? selectedCell?.grid_id;
  const nearestStation = inspectionData?.nearest_station ?? selectedCell?.nearest_station;
  const distToStation = inspectionData?.distance_to_station_km ?? selectedCell?.distance_to_station_km;
  const distToNode = inspectionData?.distance_to_query_km;

  return (
    <div className="absolute top-16 left-4 z-20 bg-slate-950/90 backdrop-blur-md p-4 rounded-xl border border-slate-700/80 shadow-2xl text-white font-mono text-xs w-80 sm:w-96 max-h-[80vh] overflow-y-auto animate-in fade-in slide-in-from-left-4 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-slate-100">POINT INSPECTION</span>
        </div>
        <button
          onClick={() => {
            setSelectedCell(null);
          }}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close inspection panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Point Concentration & AQI Category */}
      <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-slate-400 font-semibold">
            {selectedPeriod?.label.toUpperCase() ?? 'ACTIVE PERIOD'} · {pollutant}
          </span>
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
            style={{ backgroundColor: displayColor }}
          >
            {displayCategory}
          </span>
        </div>

        <div className="text-2xl font-bold text-slate-100 flex items-baseline gap-1.5 mt-1">
          <span>{displayVal ?? 'NA'}</span>
          <span className="text-xs font-normal text-slate-400">µg/m³</span>
        </div>

        <div className="text-[10px] text-slate-400 mt-2 space-y-0.5">
          <div>
            Clicked Point: {queryLat?.toFixed(4)}°N, {queryLon?.toFixed(4)}°E
          </div>
          {sourceGridId && (
            <div className="text-slate-400 flex items-center justify-between">
              <span>Source Node: {sourceGridId}</span>
              {distToNode !== undefined && distToNode > 0 && (
                <span>({distToNode} km to node)</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Proximity to Railway Corridor */}
      {nearestStation && (
        <div className="bg-slate-900/70 rounded-lg p-2.5 border border-slate-800/80 mb-3 text-[11px] flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-sky-950/80 border border-sky-800/70 text-sky-400">
            <Train className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-slate-200 font-semibold">
              Station {nearestStation} Proximity
            </div>
            <div className="text-[10px] text-slate-400">
              {distToStation} km to canonical railway corridor node
            </div>
          </div>
        </div>
      )}

      {/* 72-Month Multi-Year Seasonal History Sparkline */}
      {timeseries.length > 0 && (
        <div className="bg-slate-900/70 rounded-lg p-3 border border-slate-800/80 mb-3">
          <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold mb-2">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              6-Year Profile (2017–2022)
            </span>
            <span className="text-[10px] text-slate-400 font-normal">72 Months</span>
          </div>

          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="cellGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284C7" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#0284C7" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="year"
                  stroke="#64748B"
                  fontSize={9}
                  tickLine={false}
                  interval={11} // Tick once per year
                />
                <YAxis stroke="#64748B" fontSize={9} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-700 p-1.5 rounded shadow-lg text-[10px] font-mono">
                          <div className="text-sky-400 font-bold">{data.period}</div>
                          <div className="text-slate-200">
                            {data.value} µg/m³ ({data.category})
                          </div>
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
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#cellGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[9px] text-slate-400 text-center mt-1">
            Winter spikes (Nov–Jan) & monsoon depressions (Jul–Aug)
          </div>
        </div>
      )}

      {/* Scientific Honesty Notice */}
      <div className="flex items-start gap-1.5 text-[9px] text-slate-400 pt-1.5 border-t border-slate-800/80 leading-relaxed">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <span>
          Visual continuous field generated via spatial bilinear interpolation between 10 km source nodes. Interpolation is a cartographic visualization technique, not additional sensor precision.
        </span>
      </div>
    </div>
  );
};
