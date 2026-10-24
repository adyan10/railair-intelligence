import { useEffect, useState, useCallback } from 'react';
import { mockRailairService } from '../services/mockRailairService';
import type { InterventionScenario, ScenarioResult } from '../types/railair';
import { ASSUMPTION_LABELS, ASSUMPTION_DESCRIPTIONS } from '../data/mock';
import { ScenarioChart } from '../components/ScenarioChart';
import { formatConcentration, formatPercent } from '../lib/formatters';
import { FlaskConical, Info, Loader, RotateCcw } from 'lucide-react';

export function InterventionsPage() {
  const [scenarios, setScenarios] = useState<InterventionScenario[]>([]);
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [selectedId, setSelectedId] = useState<string>('baseline');
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [calcLoading, setCalcLoading] = useState(false);

  useEffect(() => {
    mockRailairService.getInterventionScenarios().then(async (sc) => {
      setScenarios(sc);
      // Pre-calculate all baseline results
      const r = await Promise.all(sc.map((s) => mockRailairService.calcScenario(s.id)));
      setResults(r);
      setLoading(false);
    });
  }, []);

  const selected = scenarios.find((s) => s.id === selectedId);

  const handleOverride = useCallback((key: string, value: number) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function calcCustom() {
    if (!selected) return;
    setCalcLoading(true);
    const result = await mockRailairService.calcScenario(selectedId, overrides);
    setResults((prev) => {
      const idx = prev.findIndex((r) => r.scenarioId === selectedId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = result;
        return next;
      }
      return [...prev, result];
    });
    setCalcLoading(false);
  }

  function resetOverrides() {
    setOverrides({});
    // Re-run with default assumptions
    if (selected) {
      mockRailairService.calcScenario(selectedId).then((result) => {
        setResults((prev) => {
          const idx = prev.findIndex((r) => r.scenarioId === selectedId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = result;
            return next;
          }
          return [...prev, result];
        });
      });
    }
  }

  const effectiveAssumptions = selected
    ? { ...selected.assumptions, ...overrides }
    : {};

  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-violet-400" />
          Intervention Scenarios
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Hypothetical scenario modelling for corridor air quality improvements. All outcomes are simulated.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          This scenario model uses <strong>simplified illustrative coefficients</strong> and is not a validated
          emission-dispersion or health model. Outputs are hypothetical projections for demonstration only.
          Do not use for policy decisions.
        </span>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-20 bg-navy-700 rounded-xl" />
          <div className="h-52 bg-navy-700 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Scenario selector */}
          <div className="flex flex-wrap gap-2">
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() => { setSelectedId(sc.id); setOverrides({}); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  selectedId === sc.id
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'bg-navy-700 border-navy-500 text-slate-300 hover:border-violet-600 hover:text-white'
                }`}
              >
                {sc.label}
                {sc.isBaseline && <span className="ml-1.5 text-xs text-slate-400">(reference)</span>}
              </button>
            ))}
          </div>

          {selected && (
            <div className="bg-navy-800 rounded-xl border border-navy-500 p-4">
              <h3 className="text-sm font-semibold text-slate-200 mb-1">{selected.label}</h3>
              <p className="text-xs text-slate-400 mb-4">{selected.description}</p>

              {/* Assumption sliders */}
              <div className="space-y-4">
                {Object.entries(ASSUMPTION_LABELS).map(([key, label]) => {
                  const currentValue = effectiveAssumptions[key] ?? 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-slate-300 font-medium">{label}</label>
                        <span className="text-xs font-mono text-cyan-300">{currentValue}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={currentValue}
                        onChange={(e) => handleOverride(key, Number(e.target.value))}
                        className="w-full accent-violet-500"
                        disabled={selected.isBaseline}
                      />
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                        {ASSUMPTION_DESCRIPTIONS[key]}
                      </p>
                    </div>
                  );
                })}
              </div>

              {!selected.isBaseline && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={calcCustom}
                    disabled={calcLoading}
                    className="btn-primary flex items-center gap-2"
                  >
                    {calcLoading ? <Loader className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                    {calcLoading ? 'Calculating…' : 'Apply & Recalculate'}
                  </button>
                  <button
                    onClick={resetOverrides}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-3 py-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results comparison */}
          <div className="bg-navy-800 rounded-xl border border-navy-500 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200">Scenario PM2.5 Comparison</h3>
              <span className="badge-simulated">SIMULATED / HYPOTHETICAL</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Dashed red line = baseline. Bar colours: grey = baseline, cyan = intervention scenario.
            </p>
            <ScenarioChart results={results} />
          </div>

          {/* Outcome table */}
          <div className="bg-navy-800 rounded-xl border border-navy-500 p-4">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Scenario Outcomes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-navy-500 text-slate-400 text-left">
                    <th className="pb-2 font-medium">Scenario</th>
                    <th className="pb-2 font-medium">Avg PM2.5</th>
                    <th className="pb-2 font-medium">Avg PM10</th>
                    <th className="pb-2 font-medium">vs Baseline</th>
                    <th className="pb-2 font-medium">Hotspot Count</th>
                    <th className="pb-2 font-medium">Coverage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-600">
                  {results.map((r) => (
                    <tr
                      key={r.scenarioId}
                      className={`transition-colors ${
                        r.scenarioId === selectedId ? 'bg-violet-900/20' : 'hover:bg-navy-700/30'
                      }`}
                    >
                      <td className="py-2.5 pr-3 text-slate-200 font-medium">{r.label}</td>
                      <td className="py-2.5 pr-3 font-mono text-cyan-300">{formatConcentration(r.avgPm25, 'µg/m³')}</td>
                      <td className="py-2.5 pr-3 font-mono text-teal-300">{formatConcentration(r.avgPm10, 'µg/m³')}</td>
                      <td className="py-2.5 pr-3">
                        {r.isBaseline ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span className="text-emerald-400 font-mono">
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
              Reduction percentages are relative to the baseline scenario. All values are hypothetical and produced
              by an illustrative model with simplified coefficients.
            </p>
          </div>

          {/* Model transparency box */}
          <div className="bg-navy-900 rounded-xl border border-navy-600 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
              Model Transparency
            </h3>
            <div className="text-xs text-slate-400 space-y-1 leading-relaxed">
              <p>The scenario reduction is calculated as:</p>
              <code className="block bg-navy-700 px-3 py-2 rounded font-mono text-slate-300 text-[11px]">
                reduction = (loco × 0.30) + (vent × 0.50) + (veg × 0.15) + (lez × 0.25)
              </code>
              <p>Capped at 60% total reduction. Coverage improvement: +15% per ventilation point, +10% per LEZ point.
              These coefficients are <strong>illustrative and not validated</strong>.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
