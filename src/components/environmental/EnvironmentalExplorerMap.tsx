import React, { useEffect, useState, useRef } from 'react';
import {
  MapContainer,
  ImageOverlay,
  Rectangle,
  CircleMarker,
  Polyline,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { latLngBounds, type LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  SlidersHorizontal,
  Maximize2,
  ChevronUp,
} from 'lucide-react';
import { OpenFreeMapLayer } from '../OpenFreeMapLayer';
import { useEnvironmental } from '../../context/EnvironmentalContext';
import {
  CANONICAL_CORRIDOR_STATIONS,
  CORRIDOR_TRACK_COORDINATES,
} from '../../services/environmentalApiClient';
import {
  CORRIDOR_ENVELOPE,
  generateInterpolatedRasterDataUrl,
  PM25_COLOR_RAMP,
  PM10_COLOR_RAMP,
} from '../../services/rasterInterpolation';

// Exact Leaflet bounding box for Delhi-NCR corridor raster
const RASTER_BOUNDS: LatLngBoundsExpression = [
  [CORRIDOR_ENVELOPE.south, CORRIDOR_ENVELOPE.west],
  [CORRIDOR_ENVELOPE.north, CORRIDOR_ENVELOPE.east],
];

function MapFitController({ triggerReset }: { triggerReset: number }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(latLngBounds(RASTER_BOUNDS), { padding: [35, 35] });
  }, [map, triggerReset]);
  return null;
}

/**
 * Handles map click events: samples continuous interpolated concentration
 * and selects the nearest source grid cell.
 */
function MapClickHandler({
  onCoordinateClick,
}: {
  onCoordinateClick: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      onCoordinateClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export const EnvironmentalExplorerMap: React.FC = () => {
  const {
    pollutant,
    gridData,
    selectedCell,
    setSelectedCell,
    inspectCoordinate,
    layerOpacity,
    setLayerOpacity,
    showCorridor,
    setShowCorridor,
    showStations,
    setShowStations,
    showDiagnosticGrid,
    setShowDiagnosticGrid,
  } = useEnvironmental();

  const [resetViewCount, setResetViewCount] = useState(0);
  const [isControlsOpen, setIsControlsOpen] = useState(false);

  // Dual-buffer raster URLs for smooth animated cross-fades during playback
  const [activeRasterUrl, setActiveRasterUrl] = useState<string>('');
  const [prevRasterUrl, setPrevRasterUrl] = useState<string>('');
  const [isCrossFading, setIsCrossFading] = useState(false);
  const fadeTimeoutRef = useRef<number | null>(null);
  const activeRasterUrlRef = useRef<string>('');

  // Generate continuous raster data URL whenever gridData or pollutant changes
  useEffect(() => {
    if (!gridData?.cells || gridData.cells.length === 0) return;

    const newUrl = generateInterpolatedRasterDataUrl(gridData.cells, pollutant, 256, 256);
    if (!newUrl) return;

    const currentUrl = activeRasterUrlRef.current;
    if (currentUrl && currentUrl !== newUrl) {
      setPrevRasterUrl(currentUrl);
      setActiveRasterUrl(newUrl);
      activeRasterUrlRef.current = newUrl;
      setIsCrossFading(true);

      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = window.setTimeout(() => {
        setIsCrossFading(false);
        setPrevRasterUrl('');
      }, 250);
    } else {
      setActiveRasterUrl(newUrl);
      activeRasterUrlRef.current = newUrl;
    }

    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, [gridData, pollutant]);

  // Handle map click anywhere on the continuous pollution field
  const handleMapClick = (lat: number, lon: number) => {
    const { south, north, west, east } = CORRIDOR_ENVELOPE;
    if (lat < south || lat > north || lon < west || lon > east) {
      return; // Outside corridor coverage
    }

    // Trigger full inspection and time-series query
    inspectCoordinate(lat, lon);
  };

  const currentRamp = pollutant === 'PM2.5' ? PM25_COLOR_RAMP : PM10_COLOR_RAMP;

  return (
    <div className="relative w-full h-full min-h-[500px] flex-1 bg-slate-950 overflow-hidden select-none">
      <MapContainer
        center={[28.818, 77.493]}
        zoom={10}
        minZoom={7}
        maxZoom={14}
        className="w-full h-full z-0 cursor-crosshair"
        scrollWheelZoom={true}
      >
        <OpenFreeMapLayer />
        <MapFitController triggerReset={resetViewCount} />
        <MapClickHandler onCoordinateClick={handleMapClick} />

        {/* Previous Frame (for smooth cross-fade animation) */}
        {prevRasterUrl && (
          <ImageOverlay
            url={prevRasterUrl}
            bounds={RASTER_BOUNDS}
            opacity={isCrossFading ? layerOpacity * 0.4 : 0}
            zIndex={9}
          />
        )}

        {/* Primary Continuous-Looking Interpolated Pollution Raster */}
        {activeRasterUrl && (
          <ImageOverlay
            url={activeRasterUrl}
            bounds={RASTER_BOUNDS}
            opacity={layerOpacity}
            zIndex={10}
          />
        )}

        {/* Optional Secondary Diagnostic Grid (64 Cells Wireframe) */}
        {showDiagnosticGrid &&
          gridData?.cells.map((cell) => {
            const isSelected = selectedCell?.grid_id === cell.grid_id;
            const bounds: LatLngBoundsExpression = [
              [cell.bounds.south, cell.bounds.west],
              [cell.bounds.north, cell.bounds.east],
            ];

            return (
              <React.Fragment key={`diag-${cell.grid_id}`}>
                <Rectangle
                  bounds={bounds}
                  pathOptions={{
                    color: isSelected ? '#38BDF8' : '#94A3B8',
                    weight: isSelected ? 2 : 0.8,
                    dashArray: isSelected ? undefined : '3, 4',
                    fill: false,
                    opacity: isSelected ? 1 : 0.45,
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedCell(cell);
                      inspectCoordinate(cell.latitude, cell.longitude);
                    },
                  }}
                />
                {/* Subtle Centroid Marker */}
                <CircleMarker
                  center={[cell.latitude, cell.longitude]}
                  radius={isSelected ? 4 : 2}
                  pathOptions={{
                    color: isSelected ? '#38BDF8' : '#64748B',
                    fillColor: isSelected ? '#38BDF8' : '#94A3B8',
                    fillOpacity: 0.8,
                    weight: 1,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
                    <div className="p-1 font-mono text-[11px]">
                      <div className="font-bold text-slate-900">{cell.grid_id}</div>
                      <div className="text-slate-700">
                        Node: {cell.value ?? 'NA'} µg/m³ ({cell.category})
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              </React.Fragment>
            );
          })}

        {/* Selected Inspection Location Marker (if any) */}
        {selectedCell && (
          <CircleMarker
            center={[selectedCell.latitude, selectedCell.longitude]}
            radius={8}
            pathOptions={{
              color: '#38BDF8',
              fillColor: '#0284C7',
              fillOpacity: 0.9,
              weight: 2.5,
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -8]}>
              <span className="font-mono text-[10px] font-bold text-slate-900 bg-white/95 px-1.5 py-0.5 rounded shadow-xs border border-sky-400">
                {selectedCell.grid_id} · {selectedCell.value} µg/m³
              </span>
            </Tooltip>
          </CircleMarker>
        )}

        {/* Conventional Rail Corridor Alignment (83 km Meerut -> New Delhi) */}
        {showCorridor && (
          <Polyline
            positions={CORRIDOR_TRACK_COORDINATES}
            pathOptions={{
              color: '#0284C7',
              weight: 3.5,
              dashArray: '5, 5',
              opacity: 0.95,
            }}
          />
        )}

        {/* 7 Canonical RailAir Corridor Stations */}
        {showStations &&
          CANONICAL_CORRIDOR_STATIONS.map((st) => (
            <CircleMarker
              key={st.id}
              center={[st.lat, st.lng]}
              radius={5.5}
              pathOptions={{
                color: '#0F172A',
                fillColor: '#38BDF8',
                fillOpacity: 1.0,
                weight: 2,
              }}
            >
              <Tooltip
                permanent
                direction="right"
                offset={[8, 0]}
                className="corridor-station-label"
              >
                <span className="font-mono text-[10px] font-bold text-slate-900 bg-white/95 px-1 py-0.5 rounded shadow-xs border border-slate-300">
                  {st.id} · {st.name}
                </span>
              </Tooltip>
            </CircleMarker>
          ))}
      </MapContainer>

      {/* Sleek, Collapsible Floating Layer Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-10 font-mono text-xs">
        {!isControlsOpen ? (
          <button
            onClick={() => setIsControlsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/85 hover:bg-slate-900 text-slate-200 hover:text-white border border-slate-700/70 shadow-lg backdrop-blur-md transition-all text-xs"
            title="Open Map Layer Controls"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold">Layers</span>
            <span className="text-[10px] text-slate-400">({Math.round(layerOpacity * 100)}%)</span>
          </button>
        ) : (
          <div className="bg-slate-900/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-700/80 shadow-2xl text-white w-64 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                Visual Settings
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setResetViewCount((c) => c + 1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Reset corridor view"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setIsControlsOpen(false)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Collapse controls"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Opacity Slider */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Raster Opacity</span>
                <span className="font-bold text-sky-400">{Math.round(layerOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={0.95}
                step={0.05}
                value={layerOpacity}
                onChange={(e) => setLayerOpacity(Number(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                aria-label="Raster opacity slider"
              />
              <div className="text-[9px] text-slate-400 mt-1">
                Reveals roads and place names beneath
              </div>
            </div>

            {/* Layer Toggles */}
            <div className="space-y-1.5 pt-1 text-[11px] text-slate-300 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={showCorridor}
                  onChange={(e) => setShowCorridor(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-0 bg-slate-800 border-slate-600"
                />
                <span>Railway Corridor Track</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={showStations}
                  onChange={(e) => setShowStations(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-0 bg-slate-800 border-slate-600"
                />
                <span>7 Canonical Stations</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={showDiagnosticGrid}
                  onChange={(e) => setShowDiagnosticGrid(e.target.checked)}
                  className="rounded text-slate-400 focus:ring-0 bg-slate-800 border-slate-600"
                />
                <span className="text-slate-400">Diagnostic Grid (64 Cells)</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Legible Windy-Style Continuous Gradient Legend (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-950/85 backdrop-blur-md p-2.5 sm:p-3 rounded-xl border border-slate-700/60 shadow-xl text-white font-mono text-[10px] w-60 sm:w-72">
        <div className="flex items-center justify-between mb-1 text-slate-200">
          <span className="font-bold text-sky-300">{pollutant} Concentration</span>
          <span className="text-slate-400 text-[9px]">µg/m³</span>
        </div>

        {/* Continuous Linear Gradient Ramp */}
        <div
          className="h-2 rounded-full border border-slate-700/70 shadow-inner mb-1"
          style={{
            background:
              pollutant === 'PM2.5'
                ? 'linear-gradient(to right, #10B981 0%, #34D399 15%, #EAB308 30%, #F97316 45%, #EF4444 65%, #A855F7 85%, #701A75 100%)'
                : 'linear-gradient(to right, #10B981 0%, #34D399 15%, #EAB308 25%, #F97316 50%, #EF4444 70%, #A855F7 85%, #701A75 100%)',
          }}
        />

        {/* Threshold values along bar */}
        <div className="flex justify-between text-[9px] text-slate-400 font-mono px-0.5">
          {currentRamp.map((s) => (
            <span key={s.label}>{s.label}</span>
          ))}
        </div>

        <div className="text-[8px] text-slate-400 mt-1 text-center font-sans tracking-tight">
          Visual bilinear interpolation · 10 km source grid
        </div>
      </div>
    </div>
  );
};
