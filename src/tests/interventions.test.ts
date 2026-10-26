import { describe, it, expect } from 'vitest';
import {
  calcScenarioResult,
  type BaselineMetrics,
  type AssumptionSet,
} from '../lib/exposure';
import { INTERVENTION_SCENARIOS } from '../data/mock';
import { mockRailairService } from '../services/mockRailairService';

describe('Interventions Model — Source of Truth & Baseline Invariance', () => {
  const referenceBaseline: BaselineMetrics = {
    avgPm25: 135,
    avgPm10: 233,
    hotspotCount: 3,
    coveragePercent: 28,
  };

  it('preserves immutable baseline regardless of scenario parameter adjustments', () => {
    // Check that baseline calculation with 0 assumptions returns exact baseline
    const zeroAssumptions: AssumptionSet = {
      locomotiveFuelReductionPct: 0,
      stationVentilationImprovementPct: 0,
      vegetationBarrierCoverPct: 0,
      lowEmissionZoneAdoptionPct: 0,
    };

    const resBaseline = calcScenarioResult(zeroAssumptions, referenceBaseline);
    expect(resBaseline.pm25).toBe(135);
    expect(resBaseline.pm10).toBe(233);
    expect(resBaseline.exposureReductionPct).toBe(0);
    expect(resBaseline.coveragePct).toBe(28);

    // Verify reference baseline metrics object is not mutated
    expect(referenceBaseline.avgPm25).toBe(135);
    expect(referenceBaseline.avgPm10).toBe(233);
  });

  it('guarantees complete independence of Scenario A and Scenario B parameters', () => {
    const scA = INTERVENTION_SCENARIOS.find((s) => s.id === 'scenario-a')!;
    const scB = INTERVENTION_SCENARIOS.find((s) => s.id === 'scenario-b')!;

    // Scenario A custom overrides: increase ventilation to 50%
    const customA: AssumptionSet = {
      ...(scA.assumptions as unknown as AssumptionSet),
      stationVentilationImprovementPct: 50,
    };

    // Scenario B default assumptions
    const defaultB: AssumptionSet = scB.assumptions as unknown as AssumptionSet;

    const resA = calcScenarioResult(customA, referenceBaseline);
    const resB = calcScenarioResult(defaultB, referenceBaseline);

    // Modifying Scenario A assumptions must not change Scenario B outcome
    expect(resA.exposureReductionPct).toBeCloseTo(50 * 0.50, 4); // 25%
    expect(resB.exposureReductionPct).toBeCloseTo(
      15 * 0.30 + 25 * 0.50 + 20 * 0.15 + 10 * 0.25, // 4.5 + 12.5 + 3.0 + 2.5 = 22.5%
      4
    );
  });

  it('maps each parameter to its intended coefficient correctly', () => {
    // 1. Locomotive: 40% * 0.30 = 12%
    const locoRes = calcScenarioResult(
      { locomotiveFuelReductionPct: 40, stationVentilationImprovementPct: 0, vegetationBarrierCoverPct: 0, lowEmissionZoneAdoptionPct: 0 },
      referenceBaseline
    );
    expect(locoRes.exposureReductionPct).toBeCloseTo(12, 4);
    expect(locoRes.pm25).toBeCloseTo(135 * 0.88, 4);

    // 2. Ventilation: 40% * 0.50 = 20%
    const ventRes = calcScenarioResult(
      { locomotiveFuelReductionPct: 0, stationVentilationImprovementPct: 40, vegetationBarrierCoverPct: 0, lowEmissionZoneAdoptionPct: 0 },
      referenceBaseline
    );
    expect(ventRes.exposureReductionPct).toBeCloseTo(20, 4);
    expect(ventRes.pm25).toBeCloseTo(135 * 0.80, 4);

    // 3. Vegetation: 40% * 0.15 = 6%
    const vegRes = calcScenarioResult(
      { locomotiveFuelReductionPct: 0, stationVentilationImprovementPct: 0, vegetationBarrierCoverPct: 40, lowEmissionZoneAdoptionPct: 0 },
      referenceBaseline
    );
    expect(vegRes.exposureReductionPct).toBeCloseTo(6, 4);
    expect(vegRes.pm25).toBeCloseTo(135 * 0.94, 4);

    // 4. Low Emission Zone: 40% * 0.25 = 10%
    const lezRes = calcScenarioResult(
      { locomotiveFuelReductionPct: 0, stationVentilationImprovementPct: 0, vegetationBarrierCoverPct: 0, lowEmissionZoneAdoptionPct: 40 },
      referenceBaseline
    );
    expect(lezRes.exposureReductionPct).toBeCloseTo(10, 4);
    expect(lezRes.pm25).toBeCloseTo(135 * 0.90, 4);
  });

  it('guarantees consistency between chart values, displayed concentrations, and percentage reductions', () => {
    const assumptions: AssumptionSet = {
      locomotiveFuelReductionPct: 20,
      stationVentilationImprovementPct: 30,
      vegetationBarrierCoverPct: 10,
      lowEmissionZoneAdoptionPct: 10,
    };
    // Expected reduction: (20*0.30) + (30*0.50) + (10*0.15) + (10*0.25) = 6 + 15 + 1.5 + 2.5 = 25%
    const res = calcScenarioResult(assumptions, referenceBaseline);

    expect(res.exposureReductionPct).toBeCloseTo(25, 4);
    // Calculated concentration must strictly equal baseline * (1 - reductionPct / 100)
    expect(res.pm25).toBeCloseTo(referenceBaseline.avgPm25 * (1 - 0.25), 4);
    expect(res.pm10).toBeCloseTo(referenceBaseline.avgPm10 * (1 - 0.25), 4);
  });

  it('restores documented default assumptions on reset', async () => {
    const scA = INTERVENTION_SCENARIOS.find((s) => s.id === 'scenario-a')!;
    const defaultAssumptions = scA.assumptions;

    // Simulate reset by re-evaluating with documented default assumptions
    const resDefault = await mockRailairService.calcScenario('scenario-a', defaultAssumptions);
    expect(resDefault.exposureProxyReduction).toBeCloseTo(30 * 0.50, 4); // 15%
    expect(resDefault.avgPm25).toBeCloseTo(135 * 0.85, 2);
  });

  it('strictly returns defined baseline when all interventions are zero', () => {
    const allZero: AssumptionSet = {
      locomotiveFuelReductionPct: 0,
      stationVentilationImprovementPct: 0,
      vegetationBarrierCoverPct: 0,
      lowEmissionZoneAdoptionPct: 0,
    };
    const res = calcScenarioResult(allZero, referenceBaseline);
    expect(res.pm25).toBe(referenceBaseline.avgPm25);
    expect(res.pm10).toBe(referenceBaseline.avgPm10);
    expect(res.exposureReductionPct).toBe(0);
    expect(res.coveragePct).toBe(referenceBaseline.coveragePercent);
  });

  it('safely handles zero, negative, NaN, or invalid baseline metrics without crashes', () => {
    const validAssumptions: AssumptionSet = {
      locomotiveFuelReductionPct: 20,
      stationVentilationImprovementPct: 20,
      vegetationBarrierCoverPct: 0,
      lowEmissionZoneAdoptionPct: 0,
    };

    // Zero baseline
    const zeroBase: BaselineMetrics = { avgPm25: 0, avgPm10: 0, hotspotCount: 0, coveragePercent: 0 };
    const resZero = calcScenarioResult(validAssumptions, zeroBase);
    expect(resZero.pm25).toBe(0);
    expect(resZero.pm10).toBe(0);
    expect(Number.isNaN(resZero.pm25)).toBe(false);

    // Negative / non-finite baseline
    const invalidBase = {
      avgPm25: -50,
      avgPm10: NaN,
      hotspotCount: -1,
      coveragePercent: Infinity,
    } as unknown as BaselineMetrics;

    const resInvalid = calcScenarioResult(validAssumptions, invalidBase);
    expect(resInvalid.pm25).toBe(0);
    expect(resInvalid.pm10).toBe(0);
    // baseCoverage guarded to 0, plus 20% ventilation * 15 = +3% coverage
    expect(resInvalid.coveragePct).toBe(3);
  });

  it('enforces maximum 60% reduction cap under extreme assumptions', () => {
    const extremeAssumptions: AssumptionSet = {
      locomotiveFuelReductionPct: 100,
      stationVentilationImprovementPct: 100,
      vegetationBarrierCoverPct: 100,
      lowEmissionZoneAdoptionPct: 100,
    };

    const res = calcScenarioResult(extremeAssumptions, referenceBaseline);
    expect(res.exposureReductionPct).toBe(60);
    expect(res.pm25).toBeCloseTo(referenceBaseline.avgPm25 * 0.40, 4);
    expect(res.pm10).toBeCloseTo(referenceBaseline.avgPm10 * 0.40, 4);
  });
});
