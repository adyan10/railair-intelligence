import type { DataQualityItem } from '../types/railair';
import { formatISOTimestamp, confidenceLabel } from '../lib/formatters';

interface Props {
  items: DataQualityItem[];
}

const KIND_COLORS: Record<string, string> = {
  simulated: 'bg-amber-50 text-amber-800 border border-amber-200',
  measured: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  modelled: 'bg-purple-50 text-purple-800 border border-purple-200',
};

export function DataQualityTable({ items }: Props) {
  return (
    <div className="overflow-x-auto border border-[#DCE3EA] rounded-lg">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="bg-slate-50 border-b border-[#DCE3EA] text-slate-500 text-left text-[11px]">
            <th className="py-2.5 px-3 font-semibold">Provenance Source</th>
            <th className="py-2.5 px-3 font-semibold">Modality</th>
            <th className="py-2.5 px-3 font-semibold">Confidence</th>
            <th className="py-2.5 px-3 font-semibold">Coverage</th>
            <th className="py-2.5 px-3 font-semibold text-right">Last Synchronized</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#DCE3EA] bg-white">
          {items.map((item) => (
            <tr key={item.source} className="hover:bg-slate-50 transition-colors">
              <td className="py-2.5 px-3 text-slate-800 font-medium">{item.source}</td>
              <td className="py-2.5 px-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${KIND_COLORS[item.kind] ?? 'bg-slate-100 text-slate-700'}`}>
                  {item.kind}
                </span>
              </td>
              <td className="py-2.5 px-3 text-slate-600">{confidenceLabel(item.confidence)}</td>
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-[#17365D] rounded-full"
                      style={{ width: `${item.coveragePercent}%` }}
                    />
                  </div>
                  <span className="text-slate-600 text-[11px]">{item.coveragePercent}%</span>
                </div>
              </td>
              <td className="py-2.5 px-3 text-right text-slate-500 text-[11px]">
                {formatISOTimestamp(item.lastUpdated)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
