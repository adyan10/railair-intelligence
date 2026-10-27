// ============================================================
// RailAir Intelligence — Exposure Calculation Library
// Pure, deterministic functions. Easily unit-testable.
// ============================================================
//
// DISCLAIMER: These calculations produce a concentration-time
// exposure proxy (µg·h/m³), NOT an actual inhaled dose, personal
// exposure measurement, or validated health-risk score.
// ============================================================

import type { Station, CorridorSegment, JourneySegmentEstimate, JourneyEstimate, TrainServiceOption } from '../types/railair';

const CALCULATION_NOTE =
  'Exposure proxy = Σ(segment concentration estimate × segment travel time in hours). ' +
  'Units: µg·h/m³. This is a concentration-time proxy only — not an inhaled dose, ' +
  'personal exposure measurement, or validated health-risk score. ' +
  'Segment travel times are scaled to match the selected historical timetable schedule.';

/**
 * Calculates a journey exposure proxy for a set of segments.
 * exposureProxy = concentration × (travelTimeMinutes / 60)
 */
export function calcSegmentExposure(
  concentrationUgM3: number,
  travelTimeMinutes: number
): number {
  return concentrationUgM3 * (travelTimeMinutes / 60);
}

/**
 * Builds a JourneyEstimate from origin → destination using corridor segments.
 * Segments are traversed in order. A duration scaling factor is applied if
 * the scheduled total duration differs from the sum of nominal segment times.
 */
export function buildJourneyEstimate(
  id: string,
  label: string,
  originStation: Station,
  destinationStation: Station,
  segments: CorridorSegment[],
  allStations: Station[],
  scheduledDurationMinutes: number,
  selectedTrain?: TrainServiceOption,
  scheduleUnavailable?: boolean
): JourneyEstimate {
  const stationMap = new Map(allStations.map((s) => [s.id, s]));

  // Find segments on the path from origin to destination
  const relevantSegments = findPathSegments(
    originStation.id,
    destinationStation.id,
    segments
  );

  const naturalDuration = relevantSegments.reduce(
    (sum, seg) => sum + seg.travelTimeMinutes,
    0
  );
  const durationScale = naturalDuration > 0 && scheduledDurationMinutes > 0
    ? scheduledDurationMinutes / naturalDuration
    : (scheduledDurationMinutes === 0 ? 0 : 1);

  const journeySegments: JourneySegmentEstimate[] = relevantSegments.map((seg) => {
    const from = stationMap.get(seg.fromStationId);
    const to = stationMap.get(seg.toStationId);
    if (!from || !to) throw new Error(`Station not found: ${seg.fromStationId} or ${seg.toStationId}`);

    const scaledTime = seg.travelTimeMinutes * durationScale;
    const pm25Proxy = calcSegmentExposure(seg.pm25Estimate, scaledTime);
    const pm10Proxy = calcSegmentExposure(seg.pm10Estimate, scaledTime);

    return {
      segmentId: seg.id,
      fromStation: from,
      toStation: to,
      distanceKm: seg.distanceKm,
      travelTimeMinutes: scaledTime,
      pm25Concentration: seg.pm25Estimate,
      pm10Concentration: seg.pm10Estimate,
      pm25ExposureProxy: pm25Proxy,
      pm10ExposureProxy: pm10Proxy,
    };
  });

  const totalPm25Proxy = journeySegments.reduce((s, seg) => s + seg.pm25ExposureProxy, 0);
  const totalPm10Proxy = journeySegments.reduce((s, seg) => s + seg.pm10ExposureProxy, 0);

  return {
    id,
    label,
    originStationId: originStation.id,
    destinationStationId: destinationStation.id,
    totalDurationMinutes: scheduledDurationMinutes,
    segments: journeySegments,
    totalPm25ExposureProxy: totalPm25Proxy,
    totalPm10ExposureProxy: totalPm10Proxy,
    calculationNote: CALCULATION_NOTE,
    selectedTrain,
    isHistoricalSchedule: Boolean(selectedTrain),
    scheduleUnavailable: scheduleUnavailable ?? (selectedTrain ? false : true),
  };
}

/**
 * Finds corridor segments that connect origin to destination in order.
 * Supports both forward (origin -> destination) and reverse (destination -> origin) traversals.
 * For reverse traversals, returns inverted segments in the direction of travel.
 */
export function findPathSegments(
  originId: string,
  destinationId: string,
  segments: CorridorSegment[]
): CorridorSegment[] {
  if (!originId || !destinationId || originId === destinationId) {
    return [];
  }

  // 1. Try forward traversal (origin -> destination)
  const forwardChain: CorridorSegment[] = [];
  let currentId = originId;
  const segsByFrom = new Map(segments.map((s) => [s.fromStationId, s]));
  const visitedForward = new Set<string>();

  while (currentId !== destinationId) {
    if (visitedForward.has(currentId)) break; // cycle guard
    visitedForward.add(currentId);
    const next = segsByFrom.get(currentId);
    if (!next) break;
    forwardChain.push(next);
    currentId = next.toStationId;
  }

  if (currentId === destinationId && forwardChain.length > 0) {
    return forwardChain;
  }

  // 2. Try reverse traversal (destination -> origin along the standard corridor)
  const reverseChain: CorridorSegment[] = [];
  currentId = destinationId;
  const visitedReverse = new Set<string>();

  while (currentId !== originId) {
    if (visitedReverse.has(currentId)) break; // cycle guard
    visitedReverse.add(currentId);
    const next = segsByFrom.get(currentId);
    if (!next) break;
    reverseChain.push(next);
    currentId = next.toStationId;
  }

  if (currentId === originId && reverseChain.length > 0) {
    // Reverse the segment sequence and invert each segment's direction
    return reverseChain.reverse().map((seg) => ({
      ...seg,
      id: `${seg.id}-rev`,
      fromStationId: seg.toStationId,
      toStationId: seg.fromStationId,
      path: [...seg.path].reverse(),
    }));
  }

  return [];
}

// ── Scenario / Intervention Calculations ────────────────────────────────────

export interface BaselineMetrics {
  avgPm25: number;
  avgPm10: number;
  hotspotCount: number;
  coveragePercent: number;
}

export interface AssumptionSet {
  locomotiveFuelReductionPct: number;
  stationVentilationImprovementPct: number;
  vegetationBarrierCoverPct: number;
  lowEmissionZoneAdoptionPct: number;
}

/**
 * Deterministic, transparent scenario model.
 *
 * IMPORTANT: This model uses simplified illustrative coefficients.
 * It does NOT represent a validated emission-dispersion model,
 * established epidemiological relationships, or peer-reviewed methodology.
 * All outputs are hypothetical scenario projections for demonstration only.
 *
 * Coefficients (illustrative):
 *   locomotiveFuelReductionPct → 0.30 effectiveness on PM2.5 emissions proxy
 *   stationVentilationImprovementPct → 0.50 effectiveness on station PM proxy
 *   vegetationBarrierCoverPct → 0.15 effectiveness on trackside dispersion
 *   lowEmissionZoneAdoptionPct → 0.25 effectiveness on local station perimeter
 */
export function calcScenarioResult(
  assumptions: AssumptionSet,
  baseline: BaselineMetrics
): { pm25: number; pm10: number; exposureReductionPct: number; coveragePct: number } {
  // Safe baseline handling: guards against null, negative, NaN, non-finite
  const basePm25 =
    !baseline || typeof baseline.avgPm25 !== 'number' || !isFinite(baseline.avgPm25) || baseline.avgPm25 < 0
      ? 0
      : baseline.avgPm25;
  const basePm10 =
    !baseline || typeof baseline.avgPm10 !== 'number' || !isFinite(baseline.avgPm10) || baseline.avgPm10 < 0
      ? 0
      : baseline.avgPm10;
  const baseCoverage =
    !baseline || typeof baseline.coveragePercent !== 'number' || !isFinite(baseline.coveragePercent) || baseline.coveragePercent < 0
      ? 0
      : baseline.coveragePercent;

  const LOCO_EFF = 0.30;
  const VENT_EFF = 0.50;
  const VEG_EFF = 0.15;
  const LEZ_EFF = 0.25;

  const loco = Math.max(0, Math.min(100, assumptions?.locomotiveFuelReductionPct ?? 0));
  const vent = Math.max(0, Math.min(100, assumptions?.stationVentilationImprovementPct ?? 0));
  const veg = Math.max(0, Math.min(100, assumptions?.vegetationBarrierCoverPct ?? 0));
  const lez = Math.max(0, Math.min(100, assumptions?.lowEmissionZoneAdoptionPct ?? 0));

  // Zero-intervention consistency rule: all zero assumptions must return exact baseline values
  if (loco === 0 && vent === 0 && veg === 0 && lez === 0) {
    return {
      pm25: basePm25,
      pm10: basePm10,
      exposureReductionPct: 0,
      coveragePct: baseCoverage,
    };
  }

  // Each intervention reduces a fraction of concentration by its effectiveness coefficient
  const totalReductionFactor =
    (loco / 100) * LOCO_EFF +
    (vent / 100) * VENT_EFF +
    (veg / 100) * VEG_EFF +
    (lez / 100) * LEZ_EFF;

  // Cap reduction at 60% (cannot eliminate ambient pollution via these hypothetical measures)
  const cappedFactor = Math.min(Math.max(0, totalReductionFactor), 0.60);

  const pm25 = basePm25 * (1 - cappedFactor);
  const pm10 = basePm10 * (1 - cappedFactor);
  const exposureReductionPct = cappedFactor * 100;

  // Coverage improves with monitoring-related interventions (percentage points)
  const coverageImprovementPct =
    (vent / 100) * 15 +
    (lez / 100) * 10;
  const coveragePct = Math.min(baseCoverage + coverageImprovementPct, 95);

  return { pm25, pm10, exposureReductionPct, coveragePct };
}

