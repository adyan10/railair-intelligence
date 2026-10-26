import React from 'react';
import { X, Database, ShieldCheck, ExternalLink, Globe, Calendar, Layers, Activity } from 'lucide-react';
import { getAllDatasets } from '../../services/datasetMetadata';
import type { DatasetMetadata } from '../../types/environmental';

interface DatasetCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatasetCatalogModal: React.FC<DatasetCatalogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const datasets = getAllDatasets();

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Environmental Dataset Catalog & Provenance
              </h2>
              <p className="text-xs text-slate-400">
                Audited geospatial datasets in RailAir Intelligence · Verified non-extrapolated coverage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close catalog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dataset List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {datasets.map((ds: DatasetMetadata) => {
            const isActive = ds.is_active;

            return (
              <div
                key={ds.dataset_id}
                className={`p-5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-sky-950/20 border-sky-500/50 ring-1 ring-sky-500/30 shadow-lg'
                    : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-white">{ds.title}</span>
                      {isActive && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 uppercase tracking-wider">
                          Active Model
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      <span>{ds.publisher}</span>
                      <span>•</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {ds.license}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border whitespace-nowrap ${
                      ds.measurement_type === 'modelled_estimate'
                        ? 'bg-purple-950/40 text-purple-300 border-purple-700/50'
                        : ds.measurement_type === 'ground_observation'
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50'
                        : 'bg-amber-950/40 text-amber-300 border-amber-700/50'
                    }`}
                  >
                    {ds.measurement_label}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-3 leading-relaxed">{ds.methodology}</p>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-700/50 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400">Coverage Extent</div>
                      <div className="font-medium truncate">{ds.spatial_coverage.name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400">Nominal Resolution</div>
                      <div className="font-medium">
                        {typeof ds.spatial_coverage.resolution_km === 'number'
                          ? `${ds.spatial_coverage.resolution_km} km grid`
                          : ds.spatial_coverage.resolution_km}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400">Temporal Span</div>
                      <div className="font-medium">
                        {ds.temporal_coverage.start === ds.temporal_coverage.end
                          ? ds.temporal_coverage.start
                          : `${ds.temporal_coverage.start} to ${ds.temporal_coverage.end}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Activity className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400">Variables & Units</div>
                      <div className="font-medium truncate">
                        {ds.variables.join(', ')} ({ds.units})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Provenance Footer */}
                <div className="mt-3 pt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-800">
                  <span className="italic">{ds.provenance_notes}</span>
                  <a
                    href={ds.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <span>Source Record</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <span>
            Scientific Integrity: Visual spatial interpolation is a display rendering technique and does not represent
            measured sensor detail finer than 10 km.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
