import type { Hotspot } from '../types/railair';
import { severityColorClass, confidenceLabel, formatConcentration } from '../lib/formatters';
import { MonitorOff, MapPin } from 'lucide-react';

interface Props {
  hotspots: Hotspot[];
  pollutantFilter: string;
  severityFilter: string;
}

export function HotspotTable({ hotspots, pollutantFilter, severityFilter }: Props) {
  const filtered = hotspots.filter((h) => {
    if (pollutantFilter !== 'all' && h.pollutant !== pollutantFilter) return false;
    if (severityFilter !== 'all' && h.severity !== severityFilter) return false;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        No hotspots match the selected filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-500 text-slate-400 text-left text-xs">
            <th className="pb-2 font-medium w-8">Rank</th>
            <th className="pb-2 font-medium">Station</th>
            <th className="pb-2 font-medium">Pollutant</th>
            <th className="pb-2 font-medium">Est. Conc.</th>
            <th className="pb-2 font-medium">Severity</th>
            <th className="pb-2 font-medium">Confidence</th>
            <th className="pb-2 font-medium">Monitoring</th>
            <th className="pb-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-600">
          {filtered.map((h) => (
            <tr key={h.id} className="hover:bg-navy-600/20 transition-colors">
              <td className="py-3 pr-2 text-slate-400 font-mono text-xs">#{h.rank}</td>
              <td className="py-3 pr-3">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="text-slate-200 font-medium">{h.stationName}</span>
                </div>
              </td>
              <td className="py-3 pr-3">
                <span className={h.pollutant === 'PM2.5' ? 'badge-pm25' : 'badge-pm10'}>
                  {h.pollutant}
                </span>
              </td>
              <td className="py-3 pr-3 font-mono text-slate-100">
                {formatConcentration(h.estimatedConcentration, h.unit)}
              </td>
              <td className="py-3 pr-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${severityColorClass(h.severity)}`}>
                  {h.severity}
                </span>
              </td>
              <td className="py-3 pr-3 text-slate-300 text-xs">{confidenceLabel(h.confidence)}</td>
              <td className="py-3 pr-3">
                {h.monitoringGap ? (
                  <div className="flex items-center gap-1 text-amber-400 text-xs">
                    <MonitorOff className="w-3.5 h-3.5" />
                    Gap
                  </div>
                ) : (
                  <span className="text-emerald-400 text-xs">Monitored</span>
                )}
              </td>
              <td className="py-3 text-xs text-slate-400 max-w-xs leading-snug">{h.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
