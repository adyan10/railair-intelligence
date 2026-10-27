// ============================================================
// RailAir Intelligence ? Formatting Utilities
// ============================================================

import type { ConfidenceLevel } from '../types/railair';

export function formatConcentration(value: number, unit = 'µg/m³'): string {
  return `${value.toFixed(0)} ${unit}`;
}

export function formatExposureProxy(value: number, unit = 'µg·h/m³'): string {
  return `${value.toFixed(1)} ${unit}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatKm(value: number): string {
  return `${value.toFixed(0)} km`;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatISOTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    });
  } catch {
    return iso;
  }
}

export function formatRelativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'just now';
  } catch {
    return '?';
  }
}

export function confidenceLabel(level: ConfidenceLevel): string {
  const map: Record<ConfidenceLevel, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    'very-low': 'Very Low',
  };
  return map[level] ?? level;
}

export function confidenceColorClass(level: ConfidenceLevel): string {
  const map: Record<ConfidenceLevel, string> = {
    high: 'text-emerald-600 bg-emerald-50',
    medium: 'text-amber-600 bg-amber-50',
    low: 'text-orange-600 bg-orange-50',
    'very-low': 'text-red-600 bg-red-50',
  };
  return map[level] ?? 'text-gray-500 bg-gray-50';
}

export function severityColorClass(severity: string): string {
  const map: Record<string, string> = {
    critical: 'text-red-700 bg-red-100',
    high: 'text-orange-700 bg-orange-100',
    moderate: 'text-amber-700 bg-amber-100',
    low: 'text-emerald-700 bg-emerald-100',
  };
  return map[severity] ?? 'text-gray-500 bg-gray-100';
}

export function severityDotClass(severity: string): string {
  const map: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    moderate: 'bg-amber-500',
    low: 'bg-emerald-500',
  };
  return map[severity] ?? 'bg-gray-400';
}

export function pm25SeverityColor(value: number): string {
  if (value > 150) return '#ef4444';
  if (value > 100) return '#f97316';
  if (value > 60) return '#f59e0b';
  if (value > 30) return '#84cc16';
  return '#22c55e';
}
