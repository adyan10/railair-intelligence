import type { DataQualityItem } from '../types/railair';
import { formatISOTimestamp, confidenceLabel } from '../lib/formatters';

interface Props {
  items: DataQualityItem[];
}

const KIND_COLORS: Record<string, string> = {
  simulated: 'bg-amber-400/20 text-amber-300',
  measured: 'bg-emerald-400/20 text-emerald-300',
  modelled: 'bg-violet-400/20 text-violet-300',
};

export function DataQualityTable({ items }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-navy-500 text-slate-400 text-left">
            <th className="pb-2 font-medium">Source</th>
            <th className="pb-2 font-medium">Kind</th>
            <th className="pb-2 font-medium">Confidence</th>
            <th className="pb-2 font-medium">Coverage</th>
            <th className="pb-2 font-medium text-right">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-600">
          {items.map((item) => (
            <tr key={item.source} className="hover:bg-navy-600/30 transition-colors">
              <td className="py-2 pr-3 text-slate-200">{item.source}</td>
              <td className="py-2 pr-3">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${KIND_COLORS[item.kind] ?? 'bg-slate-500/20 text-slate-300'}`}>
                  {item.kind}
                </span>
              </td>
              <td className="py-2 pr-3 text-slate-300">{confidenceLabel(item.confidence)}</td>
              <td className="py-2 pr-3">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-navy-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${item.coveragePercent}%` }}
                    />
                  </div>
                  <span className="text-slate-400">{item.coveragePercent}%</span>
                </div>
              </td>
              <td className="py-2 text-right text-slate-400">
                {formatISOTimestamp(item.lastUpdated)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
