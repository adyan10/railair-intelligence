import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  EnvironmentalPollutant,
  EnvironmentalPeriod,
  EnvironmentalGridResponse,
  GridCellRecord,
  LocationInspectionResponse,
  DatasetMetadata,
  CanonicalStation,
} from '../types/environmental';
import {
  environmentalApiClient,
  CANONICAL_CORRIDOR_STATIONS,
  haversineKm,
} from '../services/environmentalApiClient';
import { getActiveDataset } from '../services/datasetMetadata';

export interface EnvironmentalContextType {
  pollutant: EnvironmentalPollutant;
  setPollutant: (p: EnvironmentalPollutant) => void;
  periods: EnvironmentalPeriod[];
  selectedPeriodIndex: number;
  setSelectedPeriodIndex: (idx: number) => void;
  selectedPeriod: EnvironmentalPeriod | null;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  playbackSpeed: 1 | 2 | 4;
  setPlaybackSpeed: (speed: 1 | 2 | 4) => void;
  stepForward: () => void;
  stepBackward: () => void;
  gridData: EnvironmentalGridResponse | null;
  selectedCell: GridCellRecord | null;
  setSelectedCell: (cell: GridCellRecord | null) => void;
  selectedStation: CanonicalStation | null;
  setSelectedStation: (station: CanonicalStation | null) => void;
  inspectionData: LocationInspectionResponse | null;
  setInspectionData: (data: LocationInspectionResponse | null) => void;
  clearInspection: () => void;
  inspectCoordinate: (lat: number, lon: number, station?: CanonicalStation | null) => Promise<void>;
  inspectStation: (station: CanonicalStation) => Promise<void>;
  layerOpacity: number;
  setLayerOpacity: (opacity: number) => void;
  showCorridor: boolean;
  setShowCorridor: (show: boolean) => void;
  showStations: boolean;
  setShowStations: (show: boolean) => void;
  showHotspots: boolean;
  setShowHotspots: (show: boolean) => void;
  showDiagnosticGrid: boolean;
  setShowDiagnosticGrid: (show: boolean) => void;
  showCpcbMonitors: boolean;
  setShowCpcbMonitors: (show: boolean) => void;
  showCoverageBoundary: boolean;
  setShowCoverageBoundary: (show: boolean) => void;
  currentZoom: number;
  setCurrentZoom: (zoom: number) => void;
  isDatasetCatalogOpen: boolean;
  setIsDatasetCatalogOpen: (open: boolean) => void;
  activeDataset: DatasetMetadata;
  isLoading: boolean;
  error: string | null;
}

const EnvironmentalContext = createContext<EnvironmentalContextType | undefined>(undefined);

export const EnvironmentalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pollutant, setPollutant] = useState<EnvironmentalPollutant>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('pollutant');
      if (p === 'PM10' || p === 'PM2.5') return p;
    }
    return 'PM2.5';
  });
  const [periods, setPeriods] = useState<EnvironmentalPeriod[]>([]);
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number>(71); // Default: Dec 2022 (index 71)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);

  const [gridData, setGridData] = useState<EnvironmentalGridResponse | null>(null);
  const [selectedCell, setSelectedCell] = useState<GridCellRecord | null>(null);
  const [selectedStation, setSelectedStation] = useState<CanonicalStation | null>(null);
  const [inspectionData, setInspectionData] = useState<LocationInspectionResponse | null>(null);

  const [layerOpacity, setLayerOpacity] = useState<number>(0.65);
  const [showCorridor, setShowCorridor] = useState<boolean>(true);
  const [showStations, setShowStations] = useState<boolean>(true);
  const [showHotspots, setShowHotspots] = useState<boolean>(false);
  const [showCoverageBoundary, setShowCoverageBoundary] = useState<boolean>(true);
  const [currentZoom, setCurrentZoom] = useState<number>(10);
  const [isDatasetCatalogOpen, setIsDatasetCatalogOpen] = useState<boolean>(false);
  const [showDiagnosticGrid, setShowDiagnosticGrid] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const d = new URLSearchParams(window.location.search).get('diagnostic');
      return d === 'true' || d === '1';
    }
    return false;
  });
  const [showCpcbMonitors, setShowCpcbMonitors] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load periods on mount or pollutant change
  useEffect(() => {
    let isMounted = true;
    async function loadPeriods() {
      try {
        const fetched = await environmentalApiClient.fetchPeriods(pollutant);
        if (isMounted) {
          setPeriods(fetched);
          if (fetched.length > 0) {
            let targetIdx = fetched.length - 1;
            if (typeof window !== 'undefined') {
              const pParam = new URLSearchParams(window.location.search).get('period');
              if (pParam) {
                const foundIdx = fetched.findIndex((p) => p.period === pParam);
                if (foundIdx !== -1) targetIdx = foundIdx;
              }
            }
            setSelectedPeriodIndex(targetIdx);
          }
        }
      } catch (err) {
        if (isMounted) setError(String(err));
      }
    }
    loadPeriods();
    return () => {
      isMounted = false;
    };
  }, [pollutant]);

  const selectedPeriod = periods[selectedPeriodIndex] ?? null;

  // Fetch grid data whenever pollutant or selected period changes
  useEffect(() => {
    if (!selectedPeriod) return;
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function loadGrid() {
      try {
        const data = await environmentalApiClient.fetchGrid(
          pollutant,
          selectedPeriod!.year,
          selectedPeriod!.month
        );
        if (isMounted) {
          setGridData(data);
          // If a cell was selected, refresh its reference from the new period's grid
          setSelectedCell((prev) => {
            if (!prev) return null;
            return data.cells.find((c) => c.grid_id === prev.grid_id) ?? null;
          });
        }
      } catch (err) {
        if (isMounted) setError(String(err));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadGrid();
    return () => {
      isMounted = false;
    };
  }, [pollutant, selectedPeriod]);

  // Stepping controls
  const stepForward = useCallback(() => {
    setSelectedPeriodIndex((prev) => {
      if (prev >= periods.length - 1) {
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [periods.length]);

  const stepBackward = useCallback(() => {
    setSelectedPeriodIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && selectedPeriodIndex >= periods.length - 1) {
        // Rewind to beginning if at end
        setSelectedPeriodIndex(0);
      }
      return !prev;
    });
  }, [selectedPeriodIndex, periods.length]);

  // Auto-playback loop
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.round(1500 / playbackSpeed);
    timerRef.current = window.setInterval(() => {
      setSelectedPeriodIndex((prev) => {
        if (prev >= periods.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, periods.length]);

  // Point or Station Inspection
  const inspectCoordinate = useCallback(
    async (lat: number, lon: number, station?: CanonicalStation | null) => {
      if (!selectedPeriod) return;
      try {
        if (station !== undefined) {
          setSelectedStation(station);
        } else {
          // If clicked elsewhere on the map, only select a station if within immediate vicinity (<= 100 meters)
          const matched = CANONICAL_CORRIDOR_STATIONS.find(
            (st) => haversineKm(lat, lon, st.lat, st.lng) <= 0.1
          );
          setSelectedStation(matched ?? null);
        }

        const resp = await environmentalApiClient.fetchInspection(
          lat,
          lon,
          pollutant,
          selectedPeriod.year,
          selectedPeriod.month
        );
        setInspectionData(resp);
        if (gridData) {
          const matchingCell = gridData.cells.find((c) => c.grid_id === resp.grid_id);
          if (matchingCell) setSelectedCell(matchingCell);
        }
      } catch (err) {
        setError(String(err));
      }
    },
    [selectedPeriod, pollutant, gridData]
  );

  const inspectStation = useCallback(
    async (station: CanonicalStation) => {
      setSelectedStation(station);
      await inspectCoordinate(station.lat, station.lng, station);
    },
    [inspectCoordinate]
  );

  const clearInspection = useCallback(() => {
    setSelectedCell(null);
    setSelectedStation(null);
    setInspectionData(null);
  }, []);

  // Auto-inspect coordinate from URL query params (?lat=...&lon=... or ?station=...) on first load
  const hasAutoInspectedRef = useRef(false);
  useEffect(() => {
    if (hasAutoInspectedRef.current || !selectedPeriod || !gridData) return;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const stationParam = params.get('station');
      if (stationParam) {
        const found = CANONICAL_CORRIDOR_STATIONS.find(
          (s) => s.id.toLowerCase() === stationParam.toLowerCase() || s.name.toLowerCase() === stationParam.toLowerCase()
        );
        if (found) {
          hasAutoInspectedRef.current = true;
          inspectStation(found);
          return;
        }
      }
      const latParam = params.get('lat');
      const lonParam = params.get('lon');
      if (latParam && lonParam) {
        hasAutoInspectedRef.current = true;
        inspectCoordinate(parseFloat(latParam), parseFloat(lonParam));
      }
    }
  }, [selectedPeriod, gridData, inspectCoordinate, inspectStation]);

  const value: EnvironmentalContextType = {
    pollutant,
    setPollutant,
    periods,
    selectedPeriodIndex,
    setSelectedPeriodIndex,
    selectedPeriod,
    isPlaying,
    setIsPlaying,
    togglePlay,
    playbackSpeed,
    setPlaybackSpeed,
    stepForward,
    stepBackward,
    gridData,
    selectedCell,
    setSelectedCell,
    selectedStation,
    setSelectedStation,
    inspectionData,
    setInspectionData,
    clearInspection,
    inspectCoordinate,
    inspectStation,
    layerOpacity,
    setLayerOpacity,
    showCorridor,
    setShowCorridor,
    showStations,
    setShowStations,
    showHotspots,
    setShowHotspots,
    showCoverageBoundary,
    setShowCoverageBoundary,
    currentZoom,
    setCurrentZoom,
    isDatasetCatalogOpen,
    setIsDatasetCatalogOpen,
    activeDataset: getActiveDataset(),
    showDiagnosticGrid,
    setShowDiagnosticGrid,
    showCpcbMonitors,
    setShowCpcbMonitors,
    isLoading,
    error,
  };

  return <EnvironmentalContext.Provider value={value}>{children}</EnvironmentalContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useEnvironmental(): EnvironmentalContextType {
  const ctx = useContext(EnvironmentalContext);
  if (!ctx) {
    throw new Error('useEnvironmental must be used within an EnvironmentalProvider');
  }
  return ctx;
}
