// ============================================================
// RailAir Intelligence — Historical Railway Timetable Service
// ============================================================
// Provides stop-level train schedule lookups and segment duration
// calculations for the 7 canonical corridor stations based on
// verified historical Indian Railways timetables (2017 & 2015).
//
// DISCLAIMER: Historical prototype schedule only. Not a live
// or guaranteed train operating timetable.
// ============================================================

import type { TrainServiceOption } from '../types/railair';
import corridorTimetableRaw from '../data/mock/corridorTimetable.json';

export interface RawTimetableStop {
  stopSeq: number;
  stationCode: string;
  stationId: string;
  stationName: string;
  arrival: string;
  departure: string;
  distanceKm: number;
  arrivalDay: number;
  departureDay: number;
  trainName: string;
  snapshot: string;
  qualityFlag: string;
}

export interface RawCorridorTrain {
  trainNo: string;
  trainName: string;
  originStationName: string;
  destinationStationName: string;
  snapshot: string;
  qualityFlag: string;
  stops: RawTimetableStop[];
}

const corridorTimetable = corridorTimetableRaw as RawCorridorTrain[];

/**
 * Mapping between internal RailAir station IDs and official Indian Railways station codes.
 * Validated against claude-rail-timings/stations.csv and train_stops.csv.
 */
export const CORRIDOR_STATION_MAP: Record<string, { code: string; name: string }> = {
  MRT: { code: 'MTC', name: 'Meerut City Junction' },
  MMU: { code: 'MDNR', name: 'Modinagar' },
  MNR: { code: 'MUD', name: 'Muradnagar' },
  GZB: { code: 'GZB', name: 'Ghaziabad Junction' },
  SAH: { code: 'SBB', name: 'Sahibabad Junction' },
  DSO: { code: 'DSA', name: 'Delhi Shahdara Junction' },
  NDLS: { code: 'NDLS', name: 'New Delhi Railway Station' },
};

export const REVERSE_STATION_MAP: Record<string, string> = Object.entries(
  CORRIDOR_STATION_MAP
).reduce((acc, [internalId, info]) => {
  acc[info.code] = internalId;
  return acc;
}, {} as Record<string, string>);

/**
 * Parses 'HH:MM' string into minutes from midnight (0..1439).
 */
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr || !timeStr.includes(':')) return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/**
 * Calculates scheduled duration between departure at origin and arrival at destination,
 * handling multi-day journeys and midnight crossings.
 */
export function calculateScheduledDuration(
  depTime: string,
  arrTime: string,
  depDay: number = 1,
  arrDay: number = 1
): number | null {
  const tDep = parseTimeToMinutes(depTime);
  const tArr = parseTimeToMinutes(arrTime);
  if (tDep === null || tArr === null) return null;

  const totalDep = (depDay - 1) * 1440 + tDep;
  const totalArr = (arrDay - 1) * 1440 + tArr;
  let dur = totalArr - totalDep;

  // Handle midnight crossing where arrival time is lower than departure time on same recorded day
  if (dur <= 0 && arrDay === depDay && tArr < tDep) {
    dur += 1440;
  }

  // Reject invalid, negative, or implausibly long durations (> 12 hours for 83 km corridor)
  if (dur <= 0 || dur > 720) return null;
  return dur;
}

/**
 * Returns all eligible train services traversing from origin to destination in order.
 */
export function getEligibleTrains(
  originStationId: string,
  destinationStationId: string
): TrainServiceOption[] {
  if (!originStationId || !destinationStationId || originStationId === destinationStationId) {
    return [];
  }

  const results: TrainServiceOption[] = [];

  for (const train of corridorTimetable) {
    // Exclude unreliable records with flagged sequence conflicts
    if (train.qualityFlag && train.qualityFlag.includes('seq_conflict')) {
      continue;
    }

    const stops = train.stops;
    const originStopIndex = stops.findIndex((s) => s.stationId === originStationId);
    const destStopIndex = stops.findIndex((s) => s.stationId === destinationStationId);

    // Both stations must be present and origin must come BEFORE destination (correct direction)
    if (originStopIndex === -1 || destStopIndex === -1 || originStopIndex >= destStopIndex) {
      continue;
    }

    const originStop = stops[originStopIndex];
    const destStop = stops[destStopIndex];

    // Origin departure: prefer departure time, fallback to arrival if origin of train
    const depTime = originStop.departure || originStop.arrival;
    // Destination arrival: prefer arrival time, fallback to departure if terminus of train
    const arrTime = destStop.arrival || destStop.departure;

    if (!depTime || !arrTime) continue;

    const depDay = originStop.departureDay || originStop.arrivalDay || 1;
    const arrDay = destStop.arrivalDay || destStop.departureDay || 1;

    const duration = calculateScheduledDuration(depTime, arrTime, depDay, arrDay);
    if (duration === null) continue;

    // Collect intermediate stops between origin and destination
    const intermediateStops = stops
      .slice(originStopIndex + 1, destStopIndex)
      .map((s) => s.stationName);

    const crossesMidnight =
      arrDay > depDay || (parseTimeToMinutes(arrTime)! < parseTimeToMinutes(depTime)!);

    results.push({
      trainNo: train.trainNo,
      trainName: train.trainName,
      originStationName: train.originStationName,
      destinationStationName: train.destinationStationName,
      departureTime: depTime,
      arrivalTime: arrTime,
      departureDay: depDay,
      arrivalDay: arrDay,
      durationMinutes: duration,
      snapshot: train.snapshot,
      qualityFlag: train.qualityFlag,
      intermediateStops,
      stopsCount: destStopIndex - originStopIndex + 1,
      crossesMidnight,
    });
  }

  // Sort by scheduled departure time
  results.sort((a, b) => {
    const minA = parseTimeToMinutes(a.departureTime) ?? 0;
    const minB = parseTimeToMinutes(b.departureTime) ?? 0;
    return minA - minB;
  });

  return results;
}

/**
 * Retrieves a specific train option by train number for a station pair.
 */
export function getTrainByNumber(
  trainNo: string,
  originStationId: string,
  destinationStationId: string
): TrainServiceOption | null {
  const options = getEligibleTrains(originStationId, destinationStationId);
  return options.find((t) => t.trainNo === trainNo) ?? (options.length > 0 ? options[0] : null);
}

/**
 * Checks if a verified direct schedule exists between two stations.
 */
export function hasDirectSchedule(
  originStationId: string,
  destinationStationId: string
): boolean {
  return getEligibleTrains(originStationId, destinationStationId).length > 0;
}
