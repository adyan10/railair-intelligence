import { useEffect, useState, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { mockRailairService } from '../services/mockRailairService';
import type { CorridorSegment, Station, CorridorContextType, ActivePollutant } from '../types/railair';
import { CorridorMap } from '../components/CorridorMap';
import { formatHourIST, getCpcbCategory, getNaqiEstimate, getDiurnalFactor, CPCB_THRESHOLDS } from '../lib/diurnal';

export function CorridorPage() {
  const corridorCtx = useOutletContext<CorridorContextType | undefined>();
  const activePollutant: ActivePollutant = corridorCtx?.selectedPollutant ?? 'PM2.5';
  const selectedHour: number = corridorCtx?.selectedHour ?? 18;
  const diurnalFactor: number = corridorCtx?.diurnalFactor ?? 1.0;

  const [stations, setStations] = useState<Station[]>([]);
  const [segments, setSegments] = useState<CorridorSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStationId, setSelectedStationId] = useState<string>('NDLS');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Zoom preset state
  const [zoomTarget, setZoomTarget] = useState<'india' | 'up' | 'corridor' | null>(null);

  // Layer toggle states
  const [layers, setLayers] = useState({
    tracks: true,
    stations: true,
    buffer: true,
  });

  useEffect(() => {
    Promise.all([
      mockRailairService.getStations(),
      mockRailairService.getCorridorSegments(),
    ]).then(([s, seg]) => {
      setStations(s);
      setSegments(seg);
      setLoading(false);
    });
  }, []);

  const handleStationClick = useCallback((id: string) => {
    setSelectedStationId(id);
    setIsDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const handleZoomHandled = useCallback(() => {
    setZoomTarget(null);
  }, []);

  // Compute concatenated corridor track coordinates
  const trackPositions: [number, number][] = useMemo(() => {
    if (segments.length > 0) {
      return segments.flatMap((seg, idx) =>
        idx === 0
          ? seg.path.map((p) => [p.lat, p.lng] as [number, number])
          : seg.path.slice(1).map((p) => [p.lat, p.lng] as [number, number])
      );
    }
    // Fallback baseline alignment
    return [
      [28.9845, 77.7064],
      [28.9100, 77.6600],
      [28.8324, 77.5803],
      [28.8050, 77.5450],
      [28.7762, 77.5096],
      [28.7200, 77.4700],
      [28.6595, 77.4246],
      [28.6720, 77.3930],
      [28.6838, 77.3613],
      [28.6784, 77.3296],
      [28.6730, 77.2979],
      [28.6575, 77.2587],
      [28.6419, 77.2194],
    ];
  }, [segments]);

  // Selected station calculations
  const selectedStation = stations.find((s) => s.id === selectedStationId) ?? stations[0];

  const basePm25 = selectedStation?.observations.find((o) => o.pollutant === 'PM2.5')?.value ?? 140;
  const basePm10 = selectedStation?.observations.find((o) => o.pollutant === 'PM10')?.value ?? Math.round(basePm25 * 1.7);

  const currentPm25 = Math.round(basePm25 * diurnalFactor);
  const currentPm10 = Math.round(basePm10 * diurnalFactor);
  const currentNaqi = getNaqiEstimate(currentPm25);

  // 24-hour diurnal curve for the selected station and active pollutant
  const hourlyValues = useMemo(() => {
    if (!selectedStation) return [];
    return Array.from({ length: 24 }, (_, h) => {
      const fac = getDiurnalFactor(h);
      if (activePollutant === 'PM10') {
        return Math.round(basePm10 * fac);
      } else if (activePollutant === 'NAQI') {
        return getNaqiEstimate(Math.round(basePm25 * fac));
      }
      return Math.round(basePm25 * fac);
    });
  }, [selectedStation, activePollutant, basePm10, basePm25]);

  const peakVal = useMemo(() => (hourlyValues.length > 0 ? Math.max(...hourlyValues) : 0), [hourlyValues]);

  // Copy Sample Record (JSON) handler
  const handleCopyJson = async () => {
    if (!selectedStation) return;
    const record = {
      instrument: 'RailAir.Intel',
      data_notice: 'Simulated prototype data (not a live CPCB feed)',
      station_code: selectedStation.id,
      station_name: selectedStation.name,
      coordinates_wgs84: [selectedStation.position.lat, selectedStation.position.lng],
      hour_ist: selectedHour,
      pm2_5_ug_m3: currentPm25,
      pm10_ug_m3: currentPm10,
    };

    const text = JSON.stringify(record, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback for environments where navigator.clipboard is restricted
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const thresholds = CPCB_THRESHOLDS[activePollutant];
  const legendTicks = ['0', String(thresholds[0]), String(thresholds[1]), String(thresholds[2]), String(thresholds[3]), `${thresholds[4]}+`];

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden">
      {/* 1. Leaflet Interactive Corridor Map Canvas */}
      {loading ? (
        <div className="w-full h-full bg-[#F5F6F8] flex items-center justify-center font-mono text-xs text-rail-muted animate-pulse">
          Loading Corridor Geospatial Alignments...
        </div>
      ) : (
        <div className="w-full h-full relative z-0 isolate">
          <CorridorMap
            stations={stations}
            trackPositions={trackPositions}
            selectedStationId={selectedStationId}
            onSelectStation={handleStationClick}
            isDrawerOpen={isDrawerOpen}
            activePollutant={activePollutant}
            diurnalFactor={diurnalFactor}
            layers={layers}
            zoomTarget={zoomTarget}
            onZoomHandled={handleZoomHandled}
          />
        </div>
      )}

      {/* 2. Top-Left: India / UP / Corridor Zoom Presets Card */}
      <div className="absolute top-4 left-4 z-20 flex gap-2 font-mono text-[11px]">
        <div className="bg-white/95 backdrop-blur-sm border border-rail-border rounded shadow-sm p-1 flex gap-1">
          <button
            onClick={() => setZoomTarget('india')}
            className="px-2 py-1 rounded hover:bg-slate-100 text-rail-navy font-semibold transition-colors"
            title="Fit view to India"
          >
            INDIA
          </button>
          <button
            onClick={() => setZoomTarget('up')}
            className="px-2 py-1 rounded hover:bg-slate-100 text-rail-navy font-semibold transition-colors"
            title="Fit view to Uttar Pradesh"
          >
            UTTAR PRADESH
          </button>
          <button
            onClick={() => setZoomTarget('corridor')}
            className="px-2 py-1 rounded hover:bg-slate-100 text-rail-navy font-semibold transition-colors"
            title="Fit view to Meerut-Delhi corridor"
          >
            CORRIDOR
          </button>
        </div>
      </div>

      {/* 3. Bottom-Left: Cartographic Layer Toggles and Continuous Legend */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-3 pointer-events-auto">
        {/* Cartographic Layers */}
        <div className="bg-white/95 backdrop-blur-sm border border-rail-border shadow-sm rounded p-3 w-64 font-mono text-xs space-y-2">
          <div className="text-[10px] text-rail-muted uppercase tracking-wider font-semibold">
            Cartographic Layers
          </div>
          <label className="flex justify-between items-center cursor-pointer text-[11px] text-rail-text hover:text-rail-navy">
            <span>Railway tracks (NR)</span>
            <input
              type="checkbox"
              id="lyr-tracks"
              checked={layers.tracks}
              onChange={(e) => setLayers((prev) => ({ ...prev, tracks: e.target.checked }))}
              className="accent-[#17365D] cursor-pointer"
            />
          </label>
          <label className="flex justify-between items-center cursor-pointer text-[11px] text-rail-text hover:text-rail-navy">
            <span>Station markers</span>
            <input
              type="checkbox"
              id="lyr-stations"
              checked={layers.stations}
              onChange={(e) => setLayers((prev) => ({ ...prev, stations: e.target.checked }))}
              className="accent-[#17365D] cursor-pointer"
            />
          </label>
          <label className="flex justify-between items-start cursor-pointer text-[11px] text-rail-text hover:text-rail-navy">
            <div>
              <div>Illustrative buffer</div>
              <div className="text-[9px] text-rail-muted">Simulated 3 km envelope, not plume</div>
            </div>
            <input
              type="checkbox"
              id="lyr-plume"
              checked={layers.buffer}
              onChange={(e) => setLayers((prev) => ({ ...prev, buffer: e.target.checked }))}
              className="accent-[#D97706] cursor-pointer mt-0.5"
            />
          </label>
        </div>

        {/* Legend Card */}
        <div className="bg-white/95 backdrop-blur-sm border border-rail-border shadow-sm rounded p-3 w-72 font-mono text-xs">
          <div className="flex justify-between text-[10px] text-rail-muted uppercase tracking-wider mb-1.5">
            <span id="legend-label">{activePollutant} scale</span>
            <span className="text-rail-navy font-semibold">
              {activePollutant === 'NAQI' ? 'index' : 'µg/m³'}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-sm flex overflow-hidden border border-rail-border">
            <div className="flex-1 bg-[#24764B]" title="Good" />
            <div className="flex-1 bg-[#84CC16]" title="Satisfactory" />
            <div className="flex-1 bg-[#D97706]" title="Moderate" />
            <div className="flex-1 bg-[#EA580C]" title="Poor" />
            <div className="flex-1 bg-[#DC2626]" title="Very Poor" />
            <div className="flex-1 bg-[#7F1D1D]" title="Severe" />
          </div>
          <div id="legend-ticks" className="flex justify-between text-[9px] text-rail-muted mt-1">
            {legendTicks.map((tick, i) => (
              <span key={i}>{tick}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Slide-Out Station Inspection Drawer */}
      <aside
        id="drawer"
        className={`absolute inset-y-0 right-0 w-80 sm:w-96 max-w-[calc(100vw-3rem)] sm:max-w-md bg-white border-l border-rail-border flex flex-col z-50 shadow-2xl transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
        }`}
        aria-label="Station Inspection"
      >
        <div className="p-4 border-b border-rail-border flex items-center justify-between bg-slate-50 shrink-0">
          <span className="font-mono text-xs uppercase tracking-wider text-rail-navy font-semibold">
            Station Inspection
          </span>
          <button
            onClick={handleCloseDrawer}
            className="w-7 h-7 rounded hover:bg-slate-200 text-rail-muted hover:text-rail-navy flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {selectedStation && (
          <div id="drawer-body" className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Station Header & Geographic Coordinates */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-rail-muted">
                <span className="font-semibold text-rail-navy">
                  {selectedStation.id} · NORTHERN RAILWAY
                </span>
                <span>
                  {selectedStation.position.lat.toFixed(4)}°N, {selectedStation.position.lng.toFixed(4)}°E
                </span>
              </div>
              <h2 className="text-xl font-bold text-rail-navy mt-1">
                {selectedStation.name}
              </h2>
              <div className="text-xs text-rail-muted">
                {selectedStation.sub ?? 'Delhi Division · Northern Railway'}
              </div>
            </div>

            {/* 3 Parameter Telemetry Cards */}
            <div className="grid grid-cols-3 gap-2 font-mono">
              {(['PM2.5', 'PM10', 'NAQI'] as const).map((k) => {
                const val = k === 'PM10' ? currentPm10 : k === 'NAQI' ? currentNaqi : currentPm25;
                const cat = getCpcbCategory(val, k);
                const isCurrent = k === activePollutant;
                return (
                  <div
                    key={k}
                    className={`p-2.5 bg-slate-50 border border-rail-border rounded transition-all ${
                      isCurrent ? 'ring-1 ring-rail-navy bg-white shadow-2xs' : ''
                    }`}
                  >
                    <div className="text-[10px] text-rail-muted uppercase">{k}</div>
                    <div className="text-xl font-bold mt-1" style={{ color: cat.color }}>
                      {val}{' '}
                      <span className="text-xs font-normal text-rail-muted">
                        {k === 'NAQI' ? 'index' : 'µg/m³'}
                      </span>
                    </div>
                    <div
                      className="text-[10px] mt-1 font-sans font-medium truncate"
                      style={{ color: cat.color }}
                    >
                      {cat.name}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Observation Status Notice */}
            <div className="p-3 bg-rail-light border border-slate-300 rounded text-[11px] font-mono space-y-1">
              <div className="flex justify-between text-rail-navy font-semibold text-[10px]">
                <span>OBSERVATION STATUS</span>
                <span className="text-amber-600 font-bold">[SIMULATED]</span>
              </div>
              <div>Timestamp: 24 Oct 2026, {formatHourIST(selectedHour)}</div>
              <div className="text-[10px] text-rail-muted pt-1 border-t border-slate-300 leading-tight">
                Not connected to active CPCB instrumentation. UI demonstration only.
              </div>
            </div>

            {/* 24-Hour Diurnal Curve Mini-Chart */}
            <div className="p-3.5 bg-white border border-rail-border rounded shadow-sm">
              <div className="flex justify-between text-[10px] font-mono mb-2">
                <span className="text-rail-muted uppercase">24h curve · {activePollutant}</span>
                <span className="text-rail-navy font-semibold">PEAK {peakVal}</span>
              </div>
              <div className="h-20 flex items-end gap-px">
                {hourlyValues.map((v, h) => {
                  const cat = getCpcbCategory(v, activePollutant);
                  const height = peakVal > 0 ? (v / peakVal) * 100 : 0;
                  const isCurrent = h === selectedHour;
                  return (
                    <div
                      key={h}
                      className="bar flex-1 rounded-t"
                      style={{
                        height: `${height}%`,
                        backgroundColor: cat.color,
                        opacity: isCurrent ? 1 : 0.4,
                      }}
                      title={`${formatHourIST(h)}: ${v}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] font-mono text-rail-muted mt-1.5 border-t border-rail-border pt-1">
                <span>00h</span>
                <span>06h</span>
                <span>12h</span>
                <span>18h</span>
                <span>23h</span>
              </div>
            </div>

            {/* Technical Railway Specifications Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 bg-slate-50 rounded border border-rail-border">
                <div className="text-rail-muted text-[10px]">Track gauge</div>
                <div className="mt-0.5 font-medium text-rail-navy">1676 mm Broad</div>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-rail-border">
                <div className="text-rail-muted text-[10px]">Traction</div>
                <div className="mt-0.5 font-medium text-rail-navy">25 kV AC</div>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-rail-border">
                <div className="text-rail-muted text-[10px]">Division</div>
                <div className="mt-0.5 font-medium text-rail-navy">Delhi (NR)</div>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-rail-border">
                <div className="text-rail-muted text-[10px]">Platforms</div>
                <div className="mt-0.5 font-medium text-rail-navy">
                  {selectedStation.platforms ?? '4 Platforms'}
                </div>
              </div>
            </div>

            {/* Action: Copy Sample Record (JSON) */}
            <div>
              <button
                onClick={handleCopyJson}
                className="w-full py-2.5 bg-slate-50 hover:bg-rail-light text-rail-navy rounded border border-rail-border font-mono text-xs transition-colors active:scale-98"
              >
                COPY SAMPLE RECORD (JSON)
              </button>
              <div
                id="copy-status"
                className={`text-center font-mono text-[10px] text-emerald-700 transition-opacity duration-300 mt-1.5 ${
                  copied ? 'opacity-100' : 'opacity-0'
                }`}
              >
                Copied to clipboard
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
