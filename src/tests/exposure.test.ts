import { describe, it, expect } from 'vitest';
import {
  calcSegmentExposure,
  findPathSegments,
  buildJourneyEstimate,
  calcScenarioResult,
  type BaselineMetrics,
  type AssumptionSet,
} from '../lib/exposure';
import { STATIONS, CORRIDOR_SEGMENTS } from '../data/mock';

describe('calcSegmentExposure', () => {
  it('calculates concentration-time proxy correctly', () => {
    // 120 µg/m³ for 30 minutes (0.5 hours) = 60 µg·h/m³
    expect(calcSegmentExposure(120, 30)).toBe(60);
  });

  it('handles 0 travel time and 0 concentration', () => {
    expect(calcSegmentExposure(120, 0)).toBe(0);
    expect(calcSegmentExposure(0, 45)).toBe(0);
  });

  it('scales linearly with travel duration', () => {
    const proxy1 = calcSegmentExposure(100, 60);
    const proxy2 = calcSegmentExposure(100, 120);
    expect(proxy2).toBe(proxy1 * 2);
  });
});

describe('findPathSegments', () => {
  it('finds full forward corridor path from MRT to NDLS', () => {
    const segments = findPathSegments('MRT', 'NDLS', CORRIDOR_SEGMENTS);
    expect(segments.length).toBe(6);
    expect(segments[0].fromStationId).toBe('MRT');
    expect(segments[0].toStationId).toBe('MMU');
    expect(segments[segments.length - 1].fromStationId).toBe('DSO');
    expect(segments[segments.length - 1].toStationId).toBe('NDLS');
  });

  it('finds forward partial corridor path from MMU to GZB', () => {
    const segments = findPathSegments('MMU', 'GZB', CORRIDOR_SEGMENTS);
    expect(segments.length).toBe(2);
    expect(segments[0].fromStationId).toBe('MMU');
    expect(segments[0].toStationId).toBe('MNR');
    expect(segments[1].fromStationId).toBe('MNR');
    expect(segments[1].toStationId).toBe('GZB');
  });

  it('finds full reverse corridor path from NDLS to MRT with inverted directions', () => {
    const segments = findPathSegments('NDLS', 'MRT', CORRIDOR_SEGMENTS);
    expect(segments.length).toBe(6);
    // First segment of reverse trip should leave NDLS towards DSO
    expect(segments[0].fromStationId).toBe('NDLS');
    expect(segments[0].toStationId).toBe('DSO');
    expect(segments[0].id).toContain('-rev');

    // Last segment of reverse trip should arrive at MRT from MMU
    expect(segments[segments.length - 1].fromStationId).toBe('MMU');
    expect(segments[segments.length - 1].toStationId).toBe('MRT');

    // Check path geometry inversion
    const originalFirstRevSeg = CORRIDOR_SEGMENTS[CORRIDOR_SEGMENTS.length - 1];
    expect(segments[0].path[0]).toEqual(originalFirstRevSeg.path[originalFirstRevSeg.path.length - 1]);
  });

  it('finds intermediate reverse path from SAH to MMU', () => {
    const segments = findPathSegments('SAH', 'MMU', CORRIDOR_SEGMENTS);
    expect(segments.length).toBe(3);
    expect(segments[0].fromStationId).toBe('SAH');
    expect(segments[0].toStationId).toBe('GZB');
    expect(segments[1].fromStationId).toBe('GZB');
    expect(segments[1].toStationId).toBe('MNR');
    expect(segments[2].fromStationId).toBe('MNR');
    expect(segments[2].toStationId).toBe('MMU');
  });

  it('returns empty array when origin equals destination', () => {
    expect(findPathSegments('MRT', 'MRT', CORRIDOR_SEGMENTS)).toEqual([]);
    expect(findPathSegments('NDLS', 'NDLS', CORRIDOR_SEGMENTS)).toEqual([]);
  });

  it('returns empty array for invalid or disconnected station IDs', () => {
    expect(findPathSegments('NON_EXISTENT', 'NDLS', CORRIDOR_SEGMENTS)).toEqual([]);
    expect(findPathSegments('MRT', 'NON_EXISTENT', CORRIDOR_SEGMENTS)).toEqual([]);
    expect(findPathSegments('', '', CORRIDOR_SEGMENTS)).toEqual([]);
  });
});

describe('buildJourneyEstimate', () => {
  const mrt = STATIONS.find((s) => s.id === 'MRT')!;
  const ndls = STATIONS.find((s) => s.id === 'NDLS')!;
  const mmu = STATIONS.find((s) => s.id === 'MMU')!;

  it('builds forward journey estimate accurately', () => {
    const estimate = buildJourneyEstimate(
      'journey-test-fwd',
      'Meerut → New Delhi',
      mrt,
      ndls,
      CORRIDOR_SEGMENTS,
      STATIONS,
      108
    );

    expect(estimate.originStationId).toBe('MRT');
    expect(estimate.destinationStationId).toBe('NDLS');
    expect(estimate.totalDurationMinutes).toBe(108);
    expect(estimate.segments.length).toBe(6);
    expect(estimate.totalPm25ExposureProxy).toBeGreaterThan(0);
    expect(estimate.totalPm10ExposureProxy).toBeGreaterThan(estimate.totalPm25ExposureProxy);
    expect(estimate.segments[0].fromStation.id).toBe('MRT');
    expect(estimate.segments[5].toStation.id).toBe('NDLS');
  });

  it('builds reverse journey estimate accurately with correct station directionality', () => {
    const estimate = buildJourneyEstimate(
      'journey-test-rev',
      'New Delhi → Meerut',
      ndls,
      mrt,
      CORRIDOR_SEGMENTS,
      STATIONS,
      108
    );

    expect(estimate.originStationId).toBe('NDLS');
    expect(estimate.destinationStationId).toBe('MRT');
    expect(estimate.totalDurationMinutes).toBe(108);
    expect(estimate.segments.length).toBe(6);
    expect(estimate.totalPm25ExposureProxy).toBeGreaterThan(0);

    // Verify first and last station in reverse travel
    expect(estimate.segments[0].fromStation.id).toBe('NDLS');
    expect(estimate.segments[0].toStation.id).toBe('DSO');
    expect(estimate.segments[5].fromStation.id).toBe('MMU');
    expect(estimate.segments[5].toStation.id).toBe('MRT');
  });

  it('scales exposure proxy proportionally to scheduled travel duration', () => {
    const normal = buildJourneyEstimate(
      'normal',
      'MRT -> MMU',
      mrt,
      mmu,
      CORRIDOR_SEGMENTS,
      STATIONS,
      28
    );
    const doubled = buildJourneyEstimate(
      'doubled',
      'MRT -> MMU',
      mrt,
      mmu,
      CORRIDOR_SEGMENTS,
      STATIONS,
      56
    );

    expect(doubled.totalPm25ExposureProxy).toBeCloseTo(normal.totalPm25ExposureProxy * 2, 5);
  });

  it('correctly associates selectedTrain option and historical flags', () => {
    const mockTrainOption = {
      trainNo: '12018',
      trainName: 'DEHRADUN SHTBDI',
      originStationName: 'Dehradun',
      destinationStationName: 'New Delhi',
      departureTime: '07:05',
      arrivalTime: '08:40',
      departureDay: 1,
      arrivalDay: 1,
      durationMinutes: 95,
      snapshot: '2017-12-22',
      qualityFlag: 'verified',
      intermediateStops: ['Ghaziabad'],
      stopsCount: 3,
      crossesMidnight: false,
    };

    const estimate = buildJourneyEstimate(
      'journey-test',
      'MRT -> NDLS',
      mrt,
      ndls,
      CORRIDOR_SEGMENTS,
      STATIONS,
      95,
      mockTrainOption
    );

    expect(estimate.selectedTrain).toBe(mockTrainOption);
    expect(estimate.isHistoricalSchedule).toBe(true);
    expect(estimate.scheduleUnavailable).toBe(false);
    expect(estimate.totalDurationMinutes).toBe(95);
  });
});

describe('calcScenarioResult', () => {
  const baseline: BaselineMetrics = {
    avgPm25: 135,
    avgPm10: 233,
    hotspotCount: 5,
    coveragePercent: 28,
  };

  it('calculates 0% reduction when all assumptions are zero', () => {
    const zeroAssumptions: AssumptionSet = {
      locomotiveFuelReductionPct: 0,
      stationVentilationImprovementPct: 0,
      vegetationBarrierCoverPct: 0,
      lowEmissionZoneAdoptionPct: 0,
    };
    const res = calcScenarioResult(zeroAssumptions, baseline);
    expect(res.exposureReductionPct).toBe(0);
    expect(res.pm25).toBe(135);
    expect(res.pm10).toBe(233);
    expect(res.coveragePct).toBe(28);
  });

  it('applies intervention coefficients correctly', () => {
    // 50% loco reduction -> 50% * 0.30 = 15% reduction
    const assumptions: AssumptionSet = {
      locomotiveFuelReductionPct: 50,
      stationVentilationImprovementPct: 0,
      vegetationBarrierCoverPct: 0,
      lowEmissionZoneAdoptionPct: 0,
    };
    const res = calcScenarioResult(assumptions, baseline);
    expect(res.exposureReductionPct).toBeCloseTo(15, 2);
    expect(res.pm25).toBeCloseTo(135 * (1 - 0.15), 2);
  });

  it('enforces maximum 60% reduction cap', () => {
    // 100% on all measures: (0.3 + 0.5 + 0.15 + 0.25) = 1.2 -> capped at 0.60
    const maxAssumptions: AssumptionSet = {
      locomotiveFuelReductionPct: 100,
      stationVentilationImprovementPct: 100,
      vegetationBarrierCoverPct: 100,
      lowEmissionZoneAdoptionPct: 100,
    };
    const res = calcScenarioResult(maxAssumptions, baseline);
    expect(res.exposureReductionPct).toBe(60);
    expect(res.pm25).toBeCloseTo(135 * 0.40, 2);
    expect(res.coveragePct).toBeLessThanOrEqual(95);
  });
});
