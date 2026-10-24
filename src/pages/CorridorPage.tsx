import { useEffect, useState } from 'react';
import { mockRailairService } from '../services/mockRailairService';
import type { CorridorSegment, Station } from '../types/railair';
import { CorridorMap } from '../components/CorridorMap';
import { formatConcentration, confidenceLabel, severityColorClass, pm25SeverityColor } from '../lib/formatters';
import { MapPin, Info } from 'lucide-react';

export function CorridorPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [segments, setSegments] = useState<CorridorSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('NDLS');

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

  const selectedStation = stations.find((s) => s.id === selectedId);
  const pm25 = selectedStation?.observations.find((o) => o.pollutant === 'PM2.5');
  const pm10 = selectedStation?.observations.find((o) => o.pollutant === 'PM10');

  return (
    <div className="flex h-full overflow-hidden">
      {/* Map area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-navy-500 bg-navy-800">
          <h2 className="text-sm font-semibold text-slate-200">Corridor Map</h2>
          <span className="badge-simulated">SIMULATED GEOMETRY</span>
          <span className="ml-auto text-xs text-slate-400">Click a station for details</span>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-2 bg-navy-900 border-b border-navy-600">
          <span className="text-xs text-slate-400 font-medium">PM2.5 Level:</span>
          {[
            { label: '>150', color: '#ef4444' },
            { label: '120–150', color: '#f97316' },
            { label: '90–120', color: '#f59e0b' },
            { label: '<90', color: '#22c55e' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <div className="w-5 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-xs text-slate-400">{l.label} µg/m³</span>
            </div>
          ))}
        </div>
        <div className="flex-1 p-3">
          {loading ? (
            <div className="h-full bg-navy-700 rounded-lg animate-pulse" />
          ) : (
            <CorridorMap
              stations={stations}
              segments={segments}
              selectedStationId={selectedId}
              onSelectStation={setSelectedId}
            />
          )}
        </div>
      </div>

      {/* Side panel */}
      <aside className="w-72 flex-shrink-0 border-l border-navy-500 bg-navy-800 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-navy-500">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Stations</h3>
          <div className="space-y-1">
            {stations.map((s) => {
              const obs = s.observations.find((o) => o.pollutant === 'PM2.5');
              const color = obs ? pm25SeverityColor(obs.value) : '#94a3b8';
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    selectedId === s.id
                      ? 'bg-navy-600 text-white'
                      : 'text-slate-300 hover:bg-navy-700'
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="flex-1 truncate">{s.shortName}</span>
                  {obs && (
                    <span className="font-mono text-xs" style={{ color }}>
                      {obs.value}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected station detail */}
        {selectedStation && (
          <div className="p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">{selectedStation.name}</h3>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 capitalize">
                {selectedStation.type} · {selectedStation.distanceFromOriginKm} km from Meerut
              </div>
            </div>

            <div className="space-y-2">
              {pm25 && (
                <div className="bg-navy-700 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="badge-pm25 mb-1 inline-block">PM2.5</span>
                      <div className="text-xl font-bold font-mono text-white">
                        {formatConcentration(pm25.value, pm25.unit)}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>WHO: {pm25.who_guideline} µg/m³</div>
                      <div>NAAQS: {pm25.naaqs_standard} µg/m³</div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-navy-600 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min((pm25.value / 200) * 100, 100)}%`,
                        backgroundColor: pm25SeverityColor(pm25.value),
                      }}
                    />
                  </div>
                </div>
              )}
              {pm10 && (
                <div className="bg-navy-700 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="badge-pm10 mb-1 inline-block">PM10</span>
                      <div className="text-xl font-bold font-mono text-white">
                        {formatConcentration(pm10.value, pm10.unit)}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>WHO: {pm10.who_guideline} µg/m³</div>
                      <div>NAAQS: {pm10.naaqs_standard} µg/m³</div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-navy-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${Math.min((pm10.value / 350) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/30 text-amber-300 text-xs">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Simulated data.</strong> Confidence: {confidenceLabel(selectedStation.provenance.confidence)} ({(selectedStation.provenance.confidenceScore * 100).toFixed(0)}%)
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
