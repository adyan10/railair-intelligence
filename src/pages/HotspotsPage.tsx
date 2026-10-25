import { useEffect, useState } from 'react';
import { mockRailairService } from '../services/mockRailairService';
import type { Hotspot } from '../types/railair';
import { HotspotTable } from '../components/HotspotTable';
import { MapContainer, CircleMarker, Popup } from 'react-leaflet';
import { OpenFreeMapLayer } from '../components/OpenFreeMapLayer';
import { severityColorClass, formatConcentration, confidenceLabel } from '../lib/formatters';
import { Flame, MonitorOff, Info } from 'lucide-react';

const SEVERITY_CIRCLE: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  moderate: '#f59e0b',
  low: '#22c55e',
};

export function HotspotsPage() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollutantFilter, setPollutantFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [view, setView] = useState<'table' | 'map'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('view') === 'map') return 'map';
    }
    return 'table';
  });

  useEffect(() => {
    mockRailairService.getHotspots().then((h) => {
      setHotspots(h);
      setLoading(false);
    });
  }, []);

  const filtered = hotspots.filter((h) => {
    if (pollutantFilter !== 'all' && h.pollutant !== pollutantFilter) return false;
    if (severityFilter !== 'all' && h.severity !== severityFilter) return false;
    return true;
  });

  const monitoringGapCount = hotspots.filter((h) => h.monitoringGap).length;

  const selectClass =
    'bg-navy-700 border border-navy-500 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors';

  return (
    <div className="p-5 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            Air Quality Hotspots
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ranked simulated pollution hotspots along the Meerut–New Delhi corridor.
          </p>
        </div>

        {/* Summary stats */}
        <div className="flex gap-3">
          <div className="bg-navy-700 rounded-lg px-3 py-2 text-center">
            <div className="text-lg font-bold font-mono text-orange-400">{hotspots.length}</div>
            <div className="text-xs text-slate-400">Total hotspots</div>
          </div>
          <div className="bg-navy-700 rounded-lg px-3 py-2 text-center">
            <div className="text-lg font-bold font-mono text-amber-400">{monitoringGapCount}</div>
            <div className="text-xs text-slate-400">Monitoring gaps</div>
          </div>
          <div className="bg-navy-700 rounded-lg px-3 py-2 text-center">
            <div className="text-lg font-bold font-mono text-red-400">
              {hotspots.filter((h) => h.severity === 'critical').length}
            </div>
            <div className="text-xs text-slate-400">Critical</div>
          </div>
        </div>
      </div>

      {/* Sim notice */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          Hotspot rankings and concentration estimates are <strong>simulated</strong>. The monitoring gap
          indicator (
          <MonitorOff className="w-3 h-3 inline" />
          ) shows where real-world monitoring infrastructure is absent or limited, increasing uncertainty.
        </span>
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Pollutant:</label>
          <select value={pollutantFilter} onChange={(e) => setPollutantFilter(e.target.value)} className={selectClass}>
            <option value="all">All</option>
            <option value="PM2.5">PM2.5</option>
            <option value="PM10">PM10</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Severity:</label>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className={selectClass}>
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="ml-auto flex border border-navy-500 rounded-lg overflow-hidden">
          {(['table', 'map'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-sm capitalize transition-colors ${
                view === v ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:bg-navy-700'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      {loading ? (
        <div className="bg-navy-800 rounded-xl border border-navy-500 p-6">
          <div className="space-y-3 animate-pulse">
            {[0,1,2,3].map((i) => <div key={i} className="h-10 bg-navy-700 rounded" />)}
          </div>
        </div>
      ) : view === 'table' ? (
        <div className="bg-navy-800 rounded-xl border border-navy-500 p-4">
          <HotspotTable
            hotspots={hotspots}
            pollutantFilter={pollutantFilter}
            severityFilter={severityFilter}
          />
        </div>
      ) : (
        <div className="bg-navy-800 rounded-xl border border-navy-500 p-1 relative z-0 isolate" style={{ height: 480 }}>
          <MapContainer
            center={[28.82, 77.46]}
            zoom={10}
            scrollWheelZoom
            style={{ height: '100%', width: '100%', borderRadius: 10 }}
            className="w-full h-full z-0"
          >
            <OpenFreeMapLayer />
            {filtered.map((h) => (
              <CircleMarker
                key={h.id}
                center={[h.position.lat, h.position.lng]}
                radius={10 + (4 - h.rank) * 2}
                pathOptions={{
                  color: SEVERITY_CIRCLE[h.severity] ?? '#94a3b8',
                  fillColor: SEVERITY_CIRCLE[h.severity] ?? '#94a3b8',
                  fillOpacity: 0.75,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1 min-w-[200px]">
                    <div className="font-bold">#{h.rank} {h.stationName}</div>
                    <div className="flex items-center justify-between">
                      <span>{h.pollutant}</span>
                      <span className="font-mono font-semibold">{formatConcentration(h.estimatedConcentration, h.unit)}</span>
                    </div>
                    <div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${severityColorClass(h.severity)}`}>
                        {h.severity}
                      </span>
                      {h.monitoringGap && (
                        <span className="ml-1 text-amber-300">· Monitoring gap</span>
                      )}
                    </div>
                    <div className="text-slate-400">{h.notes}</div>
                    <div className="text-amber-300 text-[10px]">⚠ Simulated · Confidence: {confidenceLabel(h.confidence)}</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Severity legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <span className="font-medium text-slate-300">Severity:</span>
        {Object.entries(SEVERITY_CIRCLE).map(([sev, color]) => (
          <div key={sev} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="capitalize">{sev}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
