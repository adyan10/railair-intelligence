import { useEffect, useState, useMemo, useCallback } from 'react';
import { mockRailairService } from '../services/mockRailairService';
import type { InterventionScenario, ScenarioResult } from '../types/railair';
import {
  BASELINE_METRICS,
  BASELINE_SCENARIO,
  INTERVENTION_SCENARIOS,
  ASSUMPTION_LABELS,
  ASSUMPTION_DESCRIPTIONS,
} from '../data/mock';
import { calcScenarioResult, type AssumptionSet } from '../lib/exposure';
import { ScenarioChart } from '../components/ScenarioChart';
import { formatConcentration, formatPercent } from '../lib/formatters';
import { FlaskConical, Info, RotateCcw, ShieldCheck, Sliders } from 'lucide-react';

export function InterventionsPage() {
  const [scenarios, setScenarios] = useState<InterventionScenario[]>(INTERVENTION_SCENARIOS);
  const [selectedId, setSelectedId] = useState<string>('scenario-a');
  const [loading, setLoading] = useState(false);

  // Independent parameter state per scenario
  const [scenarioParams, setScenarioParams] = useState<Record<string, Record<string, number>>>(() => {
    const initial: Record<string, Record<string, number>> = {};
    for (const sc of INTERVENTION_SCENARIOS) {
      initial[sc.id] = { ...sc.assumptions };
    }
    return initial;
  });

  useEffect(() => {
    let active = true;
    mockRailairService.getInterventionScenarios().then((sc) => {
      if (!active) return;
      setScenarios(sc);
      // Ensure scenarioParams has keys for any newly fetched scenarios
      setScenarioParams((prev) => {
        const next = { ...prev };
        for (const s of sc) {
          if (!next[s.id]) {
            next[s.id] = { ...s.assumptions };
          }
        }
        return next;
      });
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const selected = scenarios.find((s) => s.id === selectedId) ?? scenarios[0];

  // Update a single parameter for the current scenario without affecting other scenarios
  const handleParamChange = useCallback((scenarioId: string, paramKey: string, value: number) => {
    setScenarioParams((prev) => ({
      ...prev,
      [scenarioId]: {
        ...(prev[scenarioId] ?? {}),
        [paramKey]: value,
      },
    }));
  }, []);

  // Reset current scenario to its documented default parameters
  const resetScenario = useCallback((scenarioId: string) => {
    const sc = scenarios.find((s) => s.id === scenarioId);
    if (!sc) return;
    setScenarioParams((prev) => ({
      ...prev,
      [scenarioId]: { ...sc.assumptions },
    }));
  }, [scenarios]);

  // Single consistent source of truth: reactive recalculation across all scenarios
  const results: ScenarioResult[] = useMemo(() => {
    return scenarios.map((sc) => {
      // Baseline is strictly immutable: always uses zero intervention assumptions
      const rawAssumptions = sc.isBaseline
        ? BASELINE_SCENARIO.assumptions
        : (scenarioParams[sc.id] ?? sc.assumptions);

      const assumptions: AssumptionSet = {
        locomotiveFuelReductionPct: rawAssumptions.locomotiveFuelReductionPct ?? 0,
        stationVentilationImprovementPct: rawAssumptions.stationVentilationImprovementPct ?? 0,
        vegetationBarrierCoverPct: rawAssumptions.vegetationBarrierCoverPct ?? 0,
        lowEmissionZoneAdoptionPct: rawAssumptions.lowEmissionZoneAdoptionPct ?? 0,
      };

      const calc = calcScenarioResult(assumptions, BASELINE_METRICS);

      return {
        scenarioId: sc.id,
        label: sc.label,
        avgPm25: calc.pm25,
        avgPm10: calc.pm10,
        hotspotCount: Math.round(BASELINE_METRICS.hotspotCount * (1 - calc.exposureReductionPct / 200)),
        coveragePercent: calc.coveragePct,
        exposureProxyReduction: calc.exposureReductionPct,
        isBaseline: sc.isBaseline,
      };
    });
  }, [scenarios, scenarioParams]);

  // Get current active parameters for the selected scenario
  const currentParams = selected?.isBaseline
    ? BASELINE_SCENARIO.assumptions
    : (scenarioParams[selectedId] ?? selected?.assumptions ?? {});

  const currentResult = results.find((r) => r.scenarioId === selectedId);

  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-violet-400" />
          Corridor Intervention Modelling
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Exploratory scenario simulation for corridor air quality interventions. All outcomes are illustrative.
        </p>
      </div>

      {/* Scientific & Model Assumptions Notice */}
      <div className="space-y-2">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Illustrative Model Disclaimer:</strong> This scenario calculation uses simplified effectiveness coefficients for demonstration. It does <strong>not</strong> represent a validated atmospheric dispersion model, calibrated chemistry-transport simulation, or clinical epidemiological health-risk forecast.
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-20 bg-navy-700 rounded-xl" />
          <div className="h-52 bg-navy-700 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Scenario tab selector */}
          <div className="flex flex-wrap gap-2">
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() => setSelectedId(sc.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  selectedId === sc.id
                    ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-950/50'
                    : 'bg-navy-700 border-navy-500 text-slate-300 hover:border-violet-600 hover:text-white'
                }`}
              >
                {sc.label}
                {sc.isBaseline && <span className="ml-1.5 text-xs text-slate-300">(immutable reference)</span>}
              </button>
            ))}
          </div>

          {/* Active scenario configuration */}
          {selected && (
            <div className="bg-navy-800 rounded-xl border border-navy-500 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-600 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-violet-400" />
                    {selected.label}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selected.description}</p>
                </div>
                {selected.isBaseline ? (
                  <span className="flex items-center gap-1.5 text-xs text-slate-300 bg-navy-700 border border-navy-500 px-2.5 py-1 rounded-md">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Baseline is immutable
                  </span>
                ) : (
                  <button
                    onClick={() => resetScenario(selected.id)}
                    className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-navy-700 hover:bg-navy-600 border border-navy-500 transition-colors px-3 py-1.5 rounded-lg"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-violet-400" />
                    Reset to Defaults
                  </button>
                )}
              </div>

              {/* Assumption sliders */}
              <div className="space-y-4">
                {Object.entries(ASSUMPTION_LABELS).map(([key, label]) => {
                  const currentValue = currentParams[key] ?? 0;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-slate-300 font-medium">{label}</label>
                        <span className="text-xs font-mono font-semibold text-cyan-300 bg-navy-900 px-2 py-0.5 rounded border border-navy-600">
                          {currentValue}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={currentValue}
                        onChange={(e) => handleParamChange(selected.id, key, Number(e.target.value))}
                        disabled={selected.isBaseline}
                        className={`w-full accent-violet-500 ${
                          selected.isBaseline ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      />
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {ASSUMPTION_DESCRIPTIONS[key]}
                      </p>
                    </div>
                  );
                })}
              </div>

              {selected.isBaseline && (
                <div className="text-xs text-slate-400 italic bg-navy-900/60 p-2.5 rounded border border-navy-700">
                  Baseline represents current corridor reference metrics (PM2.5: {BASELINE_METRICS.avgPm25} µg/m³, PM10: {BASELINE_METRICS.avgPm10} µg/m³). Sliders are fixed at 0% to prevent baseline drift.
                </div>
              )}

              {/* Live scenario summary badge */}
              {currentResult && !selected.isBaseline && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-navy-700 text-xs">
                  <div className="text-slate-300">
                    Live Modelled PM2.5:{' '}
                    <strong className="text-cyan-300 font-mono text-sm ml-1">
                      {formatConcentration(currentResult.avgPm25, 'µg/m³')}
                    </strong>
                  </div>
                  <div className="text-slate-300">
                    Estimated Reduction vs Baseline:{' '}
                    <strong className="text-emerald-400 font-mono text-sm ml-1">
                      −{formatPercent(currentResult.exposureProxyReduction)}
                    </strong>
                  </div>
                  <div className="text-slate-400 text-[11px] italic">
                    Recalculates reactively on every slider adjustment.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results comparison chart */}
          <div className="bg-navy-800 rounded-xl border border-navy-500 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200">Scenario PM2.5 Concentration Comparison</h3>
              <span className="badge-simulated">ILLUSTRATIVE PROJECTION</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Dashed red line = immutable baseline ({BASELINE_METRICS.avgPm25} µg/m³). Grey bar = baseline, Cyan bars = intervention scenarios.
            </p>
            <ScenarioChart results={results} />
          </div>

          {/* Outcome table */}
          <div className="bg-navy-800 rounded-xl border border-navy-500 p-4">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Scenario Outcomes Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-navy-500 text-slate-400 text-left">
                    <th className="pb-2 font-medium">Scenario</th>
                    <th className="pb-2 font-medium">Avg PM2.5</th>
                    <th className="pb-2 font-medium">Avg PM10</th>
                    <th className="pb-2 font-medium">Reduction vs Baseline</th>
                    <th className="pb-2 font-medium">Hotspots Remaining</th>
                    <th className="pb-2 font-medium">Monitoring Coverage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-600">
                  {results.map((r) => (
                    <tr
                      key={r.scenarioId}
                      className={`transition-colors ${
                        r.scenarioId === selectedId ? 'bg-violet-900/30' : 'hover:bg-navy-700/30'
                      }`}
                    >
                      <td className="py-2.5 pr-3 text-slate-200 font-medium">
                        {r.label}
                        {r.scenarioId === selectedId && (
                          <span className="ml-2 text-[10px] text-violet-400 font-semibold uppercase">
                            (Active)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-cyan-300 font-semibold">
                        {formatConcentration(r.avgPm25, 'µg/m³')}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-teal-300">
                        {formatConcentration(r.avgPm10, 'µg/m³')}
                      </td>
                      <td className="py-2.5 pr-3">
                        {r.isBaseline ? (
                          <span className="text-slate-400">— Reference</span>
                        ) : (
                          <span className="text-emerald-400 font-mono font-semibold">
                            −{formatPercent(r.exposureProxyReduction)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-slate-300">{r.hotspotCount}</td>
                      <td className="py-2.5 font-mono text-slate-300">{formatPercent(r.coveragePercent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3 italic">
              All metrics derive from the same calculation model. Reductions reflect hypothetical scenario assumptions and must not be interpreted as guaranteed policy outcomes.
            </p>
          </div>

          {/* Model transparency and equation box */}
          <div className="bg-navy-900 rounded-xl border border-navy-600 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Mathematical Model Specification &amp; Assumptions
            </h3>
            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                The total hypothetical PM concentration reduction factor $R \in [0, 0.60]$ is computed as a weighted linear combination of intervention adoption percentages:
              </p>
              <code className="block bg-navy-800 border border-navy-700 px-3 py-2.5 rounded font-mono text-slate-200 text-xs">
                R = min(0.60, (loco × 0.30) + (vent × 0.50) + (veg × 0.15) + (lez × 0.25))
              </code>
              <p>
                Where:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li><strong className="text-slate-200">loco (0.30)</strong>: Fractional effectiveness of diesel locomotive efficiency on ambient rail PM proxy.</li>
                <li><strong className="text-slate-200">vent (0.50)</strong>: Fractional effectiveness of enhanced platform/concourse ventilation on microenvironment PM.</li>
                <li><strong className="text-slate-200">veg (0.15)</strong>: Fractional effectiveness of green trackside barriers on particulate interception and dispersion.</li>
                <li><strong className="text-slate-200">lez (0.25)</strong>: Fractional effectiveness of station perimeter low-emission vehicle zones on local traffic background.</li>
                <li><strong className="text-slate-200">60% ceiling</strong>: Enforces the scientific reality that local transport measures cannot eliminate regional background and transboundary air pollution.</li>
                <li><strong className="text-slate-200">Zero intervention rule</strong>: When all four controls are 0%, the model strictly returns 100% of the baseline metrics ($R = 0$).</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
