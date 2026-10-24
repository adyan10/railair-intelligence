import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { latLngBounds } from 'leaflet';
import type { Station, ActivePollutant } from '../types/railair';
import { getCpcbCategory, getNaqiEstimate } from '../lib/diurnal';

export interface CorridorMapProps {
  stations: Station[];
  trackPositions: [number, number][];
  selectedStationId?: string | null;
  onSelectStation: (id: string) => void;
  isDrawerOpen?: boolean;
  activePollutant: ActivePollutant;
  diurnalFactor: number;
  layers: {
    tracks: boolean;
    stations: boolean;
    buffer: boolean;
  };
  zoomTarget: 'india' | 'up' | 'corridor' | null;
  onZoomHandled: () => void;
}

function MapController({
  zoomTarget,
  onZoomHandled,
  trackPositions,
}: {
  zoomTarget: 'india' | 'up' | 'corridor' | null;
  onZoomHandled: () => void;
  trackPositions: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (trackPositions.length > 0) {
      const bounds = latLngBounds(trackPositions);
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [map, trackPositions]);

  useEffect(() => {
    if (!zoomTarget) return;
    if (zoomTarget === 'india') {
      map.setView([22.5, 80], 5);
    } else if (zoomTarget === 'up') {
      map.setView([27, 80.5], 7);
    } else if (zoomTarget === 'corridor' && trackPositions.length > 0) {
      const bounds = latLngBounds(trackPositions);
      map.fitBounds(bounds, { padding: [60, 60] });
    }
    onZoomHandled();
  }, [zoomTarget, map, trackPositions, onZoomHandled]);

  return null;
}

export function CorridorMap({
  stations,
  trackPositions,
  selectedStationId,
  onSelectStation,
  isDrawerOpen,
  activePollutant,
  diurnalFactor,
  layers,
  zoomTarget,
  onZoomHandled,
}: CorridorMapProps) {
  // Centre on Meerut-Delhi corridor midpoint
  const centre: [number, number] = [28.82, 77.46];

  // Calculate corridor mean category for dynamic buffer opacity
  const avgVal = stations.length > 0
    ? Math.round(
        stations.reduce((sum, s) => {
          const pm25 = s.observations.find((o) => o.pollutant === 'PM2.5')?.value ?? 0;
          const pm10 = s.observations.find((o) => o.pollutant === 'PM10')?.value ?? Math.round(pm25 * 1.7);
          const val = activePollutant === 'PM10'
            ? Math.round(pm10 * diurnalFactor)
            : activePollutant === 'NAQI'
            ? getNaqiEstimate(Math.round(pm25 * diurnalFactor))
            : Math.round(pm25 * diurnalFactor);
          return sum + val;
        }, 0) / stations.length
      )
    : 100;
  const avgCat = getCpcbCategory(avgVal, activePollutant);

  const catIndices: Record<string, number> = {
    'Good': 0,
    'Satisfactory': 1,
    'Moderate': 2,
    'Poor': 3,
    'Very Poor': 4,
    'Severe': 5,
  };
  const catIndex = catIndices[avgCat.name] ?? 2;
  const bufferOpacity = 0.08 + 0.04 * catIndex;
  const bufferColor = activePollutant === 'PM10' ? '#7C3AED' : '#D97706';

  return (
    <div className="w-full h-full relative z-0 isolate">
      <MapContainer
        center={centre}
        zoom={10}
        zoomControl={false}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        className="w-full h-full z-0"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, CartoDB | Track alignment: illustrative'
          maxZoom={18}
          subdomains="abcd"
        />

        <MapController
          zoomTarget={zoomTarget}
          onZoomHandled={onZoomHandled}
          trackPositions={trackPositions}
        />

        {/* 1. Illustrative 3km Buffer Envelope */}
        {layers.buffer && trackPositions.length > 0 && (
          <Polyline
            positions={trackPositions}
            pathOptions={{
              color: bufferColor,
              weight: 38,
              lineCap: 'round',
              lineJoin: 'round',
              opacity: bufferOpacity,
            }}
          >
            <Tooltip sticky className="station-label">
              <span>Illustrative buffer (simulated 3 km envelope, not empirical dispersion)</span>
            </Tooltip>
          </Polyline>
        )}

        {/* 2. Railway Track Geometry (Base Bed + Center Line) */}
        {layers.tracks && trackPositions.length > 0 && (
          <>
            <Polyline
              positions={trackPositions}
              pathOptions={{
                color: '#CBD5E1',
                weight: 7,
                lineCap: 'round',
                lineJoin: 'round',
                opacity: 1,
              }}
            />
            <Polyline
              positions={trackPositions}
              pathOptions={{
                color: '#17365D',
                weight: 3,
                lineCap: 'round',
                lineJoin: 'round',
                opacity: 1,
              }}
            >
              <Tooltip sticky className="station-label">
                <span>Track alignment: Northern Railway (Delhi Division)</span>
              </Tooltip>
            </Polyline>
          </>
        )}

        {/* 3. Station Markers & Tooltips */}
        {layers.stations &&
          stations.map((station, idx) => {
            const pm25obs = station.observations.find((o) => o.pollutant === 'PM2.5')?.value ?? 0;
            const pm10obs = station.observations.find((o) => o.pollutant === 'PM10')?.value ?? Math.round(pm25obs * 1.7);
            const val = activePollutant === 'PM10'
              ? Math.round(pm10obs * diurnalFactor)
              : activePollutant === 'NAQI'
              ? getNaqiEstimate(Math.round(pm25obs * diurnalFactor))
              : Math.round(pm25obs * diurnalFactor);

            const cpcb = getCpcbCategory(val, activePollutant);
            const isSelected = isDrawerOpen && station.id === selectedStationId;

            return (
              <CircleMarker
                key={station.id}
                center={[station.position.lat, station.position.lng]}
                radius={isSelected ? 8 : 6}
                pathOptions={{
                  color: '#17365D',
                  weight: isSelected ? 4 : 2,
                  fillColor: cpcb.color,
                  fillOpacity: 1,
                }}
                eventHandlers={{
                  click: () => onSelectStation(station.id),
                }}
              >
                <Tooltip
                  permanent
                  interactive
                  direction={idx % 2 === 1 ? 'left' : 'right'}
                  offset={idx % 2 === 1 ? [-8, 0] : [8, 0]}
                  className="station-label cursor-pointer"
                  eventHandlers={{
                    click: () => onSelectStation(station.id),
                  }}
                >
                  <span>{station.shortName} · {val}</span>
                </Tooltip>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}
