import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Tooltip as LeafletTooltip } from 'react-leaflet';
import type { Station, CorridorSegment } from '../types/railair';
import { pm25SeverityColor, formatConcentration, confidenceLabel } from '../lib/formatters';

interface Props {
  stations: Station[];
  segments: CorridorSegment[];
  selectedStationId?: string;
  onSelectStation?: (id: string) => void;
}

// Colour a segment line based on its pm25 estimate
function segmentColor(pm25: number): string {
  if (pm25 > 150) return '#ef4444';
  if (pm25 > 120) return '#f97316';
  if (pm25 > 90) return '#f59e0b';
  return '#22c55e';
}

export function CorridorMap({ stations, segments, selectedStationId, onSelectStation }: Props) {
  // Centre on corridor midpoint
  const centre: [number, number] = [28.82, 77.46];

  return (
    <MapContainer
      center={centre}
      zoom={10}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />

      {/* Segment lines */}
      {segments.map((seg) => (
        <Polyline
          key={seg.id}
          positions={seg.path.map((p) => [p.lat, p.lng])}
          pathOptions={{
            color: segmentColor(seg.pm25Estimate),
            weight: 4,
            opacity: 0.85,
          }}
        >
          <LeafletTooltip sticky>
            <div className="text-xs space-y-0.5">
              <div className="font-semibold">Segment: {seg.fromStationId} → {seg.toStationId}</div>
              <div>PM2.5 est: <strong>{seg.pm25Estimate} µg/m³</strong></div>
              <div>PM10 est: <strong>{seg.pm10Estimate} µg/m³</strong></div>
              <div className="text-amber-300">⚠ Simulated data</div>
            </div>
          </LeafletTooltip>
        </Polyline>
      ))}

      {/* Station markers */}
      {stations.map((station) => {
        const pm25obs = station.observations.find((o) => o.pollutant === 'PM2.5');
        const color = pm25obs ? pm25SeverityColor(pm25obs.value) : '#94a3b8';
        const isSelected = station.id === selectedStationId;

        return (
          <CircleMarker
            key={station.id}
            center={[station.position.lat, station.position.lng]}
            radius={isSelected ? 12 : 8}
            pathOptions={{
              color: isSelected ? '#ffffff' : color,
              fillColor: color,
              fillOpacity: 0.9,
              weight: isSelected ? 2.5 : 1.5,
            }}
            eventHandlers={{
              click: () => onSelectStation?.(station.id),
            }}
          >
            <LeafletTooltip permanent={station.type === 'terminal' || station.type === 'major'} direction="top" offset={[0, -10]}>
              <span className="text-xs font-semibold">{station.shortName}</span>
            </LeafletTooltip>
            <Popup>
              <div className="text-xs space-y-1 min-w-[180px]">
                <div className="font-bold text-sm">{station.name}</div>
                <div className="text-slate-400 capitalize">{station.type} · {station.distanceFromOriginKm} km from origin</div>
                <hr className="border-navy-500 my-1" />
                {station.observations.map((obs) => (
                  <div key={obs.id} className="flex justify-between">
                    <span className="text-slate-300">{obs.pollutant}</span>
                    <span className="font-mono font-semibold">{formatConcentration(obs.value, obs.unit)}</span>
                  </div>
                ))}
                <hr className="border-navy-500 my-1" />
                <div className="text-amber-300 text-[10px]">⚠ Simulated · Confidence: {confidenceLabel(station.provenance.confidence)}</div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
