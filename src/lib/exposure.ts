// ============================================================
// RailAir Intelligence ? Exposure Calculation Library
// Pure, deterministic functions. Easily unit-testable.
// ============================================================
//
// DISCLAIMER: These calculations produce a concentration-time
// exposure proxy (?g?h/m?), NOT an actual inhaled dose, personal
// exposure measurement, or validated health-risk score.
// ============================================================

import type { Station, CorridorSegment, JourneySegmentEstimate, JourneyEstimate } from '../types/railair';

const CALCULATION_NOTE =
  'Exposure proxy = ?(segment concentration estimate ? segment travel time in hours). ' +
  'Units: ?g?h/m?. This is a concentration-time proxy only ? not an inhaled dose, ' +
  'personal exposure measurement, or validated health-risk score. ' +
  'All inputs are simulated and carry low confidence.';

/**
 * Calculates a journey exposure proxy for a set of segments.
 * exposureProxy = concentration ? (travelTimeMinutes / 60)
 */
export function calcSegmentExposure(
  concentrationUgM3: number,
  travelTimeMinutes: number
): number {
  return concentrationUgM3 * (travelTimeMinutes / 60);
}

/**
 * Builds a JourneyEstimate from origin ? destination using corridor segments.
 * Segments are traversed in order. A duration scaling factor is applied if
 * the user-specified total duration differs from the sum of segment times.
 */
export function buildJourneyEstimate(
  id: string,
  label: string,
  originStation: Station,
  destinationStation: Station,
  segments: CorridorSegment[],
  allStations: Station[],
  userDurationMinutes: number
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
  const durationScale = naturalDuration > 0 ? userDurationMinutes / naturalDuration : 1;

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
    totalDurationMinutes: userDurationMinutes,
    segments: journeySegments,
    totalPm25ExposureProxy: totalPm25Proxy,
    totalPm10ExposureProxy: totalPm10Proxy,
    calculationNote: CALCULATION_NOTE,
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

// ?? Scenario / Intervention Calculations ????????????????????????????????????

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
 *   locomotiveFuelReductionPct ? 0.3 effectiveness on PM2.5
 *   stationVentilationImprovementPct ? 0.5 effectiveness on station PM
 *   vegetationBarrierCoverPct ? 0.15 effectiveness
 *   lowEmissionZoneAdoptionPct ? 0.25 effectiveness
 */
export function calcScenarioResult(
  assumptions: AssumptionSet,
  baseline: BaselineMetrics
): { pm25: number; pm10: number; exposureReductionPct: number; coveragePct: number } {
  const LOCO_EFF = 0.30;
  const VENT_EFF = 0.50;
  const VEG_EFF = 0.15;
  const LEZ_EFF = 0.25;

  // Each intervention reduces a fraction of concentration by its effectiveness coefficient
  const totalReductionFactor =
    (assumptions.locomotiveFuelReductionPct / 100) * LOCO_EFF +
    (assumptions.stationVentilationImprovementPct / 100) * VENT_EFF +
    (assumptions.vegetationBarrierCoverPct / 100) * VEG_EFF +
    (assumptions.lowEmissionZoneAdoptionPct / 100) * LEZ_EFF;

  // Cap reduction at 60% (cannot eliminate pollution via these hypothetical measures)
  const cappedFactor = Math.min(totalReductionFactor, 0.60);

  const pm25 = baseline.avgPm25 * (1 - cappedFactor);
  const pm10 = baseline.avgPm10 * (1 - cappedFactor);
  const exposureReductionPct = cappedFactor * 100;

  // Coverage improves with monitoring-related interventions
  const coverageImprovementPct =
    (assumptions.stationVentilationImprovementPct / 100) * 15 +
    (assumptions.lowEmissionZoneAdoptionPct / 100) * 10;
  const coveragePct = Math.min(baseline.coveragePercent + coverageImprovementPct * 100, 95);

  return { pm25, pm10, exposureReductionPct, coveragePct };
}
