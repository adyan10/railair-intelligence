import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

export function SimBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-6 py-2 bg-amber-50/90 border-b border-amber-200 text-amber-900 text-xs font-mono">
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-700" />
      <span>
        <strong className="font-semibold">SIMULATED DATA NOTICE:</strong>{' '}
        All pollution values, exposure estimates, and hotspot rankings represent synthetic baseline models for interface prototyping. No empirical sensor feeds are connected.
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-auto text-amber-700 hover:text-amber-950 transition-colors flex-shrink-0"
        aria-label="Dismiss banner"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
