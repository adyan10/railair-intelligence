import { describe, it, expect } from 'vitest';
import {
  CORRIDOR_STATION_MAP,
  REVERSE_STATION_MAP,
  parseTimeToMinutes,
  calculateScheduledDuration,
  getEligibleTrains,
  getTrainByNumber,
  hasDirectSchedule,
} from '../services/timetableService';
import { mockRailairService } from '../services/mockRailairService';

describe('Station ID to Official Code Mapping', () => {
  it('maps all 7 canonical corridor stations to official Indian Railways codes', () => {
    expect(CORRIDOR_STATION_MAP['MRT']).toEqual({ code: 'MTC', name: 'Meerut City Junction' });
    expect(CORRIDOR_STATION_MAP['MMU']).toEqual({ code: 'MDNR', name: 'Modinagar' });
    expect(CORRIDOR_STATION_MAP['MNR']).toEqual({ code: 'MUD', name: 'Muradnagar' });
    expect(CORRIDOR_STATION_MAP['GZB']).toEqual({ code: 'GZB', name: 'Ghaziabad Junction' });
    expect(CORRIDOR_STATION_MAP['SAH']).toEqual({ code: 'SBB', name: 'Sahibabad Junction' });
    expect(CORRIDOR_STATION_MAP['DSO']).toEqual({ code: 'DSA', name: 'Delhi Shahdara Junction' });
    expect(CORRIDOR_STATION_MAP['NDLS']).toEqual({ code: 'NDLS', name: 'New Delhi Railway Station' });
  });

  it('correctly maps official IR codes back to internal RailAir IDs', () => {
    expect(REVERSE_STATION_MAP['MTC']).toBe('MRT');
    expect(REVERSE_STATION_MAP['MDNR']).toBe('MMU');
    expect(REVERSE_STATION_MAP['MUD']).toBe('MNR');
    expect(REVERSE_STATION_MAP['GZB']).toBe('GZB');
    expect(REVERSE_STATION_MAP['SBB']).toBe('SAH');
    expect(REVERSE_STATION_MAP['DSA']).toBe('DSO');
    expect(REVERSE_STATION_MAP['NDLS']).toBe('NDLS');
  });
});

describe('parseTimeToMinutes', () => {
  it('converts valid HH:MM into minutes from midnight', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('07:05')).toBe(425);
    expect(parseTimeToMinutes('13:30')).toBe(810);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
  });

  it('rejects invalid or malformed times gracefully', () => {
    expect(parseTimeToMinutes('')).toBeNull();
    expect(parseTimeToMinutes('25:00')).toBeNull();
    expect(parseTimeToMinutes('12:65')).toBeNull();
    expect(parseTimeToMinutes('invalid')).toBeNull();
    expect(parseTimeToMinutes(undefined)).toBeNull();
  });
});

describe('calculateScheduledDuration', () => {
  it('calculates daytime segment durations correctly', () => {
    // 07:05 to 08:40 = 95 minutes
    expect(calculateScheduledDuration('07:05', '08:40', 1, 1)).toBe(95);
    // 14:10 to 15:00 = 50 minutes
    expect(calculateScheduledDuration('14:10', '15:00', 1, 1)).toBe(50);
  });

  it('handles multi-day midnight crossings when arrivalDay > departureDay', () => {
    // Departs 21:28 on Day 1, arrives 00:30 on Day 2 -> (1440 - 1288) + 30 = 182 minutes
    expect(calculateScheduledDuration('21:28', '00:30', 1, 2)).toBe(182);
  });

  it('handles midnight crossing on same recorded day when arrival time is lower than departure time', () => {
    // Departs 23:50, arrives 01:08 -> 78 minutes
    expect(calculateScheduledDuration('23:50', '01:08', 1, 1)).toBe(78);
  });

  it('rejects negative or zero durations', () => {
    expect(calculateScheduledDuration('10:00', '10:00', 1, 1)).toBeNull();
  });

  it('rejects implausibly long durations (> 12 hours for corridor)', () => {
    expect(calculateScheduledDuration('06:00', '22:00', 1, 1)).toBeNull();
  });
});

describe('getEligibleTrains and Timetable Service', () => {
  it('finds scheduled train services from Meerut City (MRT) to New Delhi (NDLS)', () => {
    const trains = getEligibleTrains('MRT', 'NDLS');
    expect(trains.length).toBeGreaterThanOrEqual(8);

    for (const train of trains) {
      expect(train.trainNo).toBeTruthy();
      expect(train.durationMinutes).toBeGreaterThan(0);
      expect(train.departureTime).toMatch(/^\d{2}:\d{2}$/);
      expect(train.arrivalTime).toMatch(/^\d{2}:\d{2}$/);
      expect(train.snapshot).toBeTruthy();
    }
  });

  it('finds reverse train services from New Delhi (NDLS) to Meerut City (MRT)', () => {
    const trains = getEligibleTrains('NDLS', 'MRT');
    expect(trains.length).toBeGreaterThanOrEqual(8);
  });

  it('sorts eligible train services chronologically by departure time', () => {
    const trains = getEligibleTrains('MRT', 'NDLS');
    for (let i = 1; i < trains.length; i++) {
      const prevMin = parseTimeToMinutes(trains[i - 1].departureTime)!;
      const currMin = parseTimeToMinutes(trains[i].departureTime)!;
      expect(currMin).toBeGreaterThanOrEqual(prevMin);
    }
  });

  it('retrieves specific train by train number with getTrainByNumber', () => {
    const trains = getEligibleTrains('MRT', 'NDLS');
    const firstTrainNo = trains[0].trainNo;
    const train = getTrainByNumber(firstTrainNo, 'MRT', 'NDLS');
    expect(train).not.toBeNull();
    expect(train?.trainNo).toBe(firstTrainNo);
  });

  it('reports direct schedule availability via hasDirectSchedule', () => {
    expect(hasDirectSchedule('MRT', 'NDLS')).toBe(true);
    expect(hasDirectSchedule('GZB', 'NDLS')).toBe(true);
    expect(hasDirectSchedule('MMU', 'MRT')).toBe(true);
    expect(hasDirectSchedule('MRT', 'MRT')).toBe(false);
    expect(hasDirectSchedule('UNKNOWN', 'NDLS')).toBe(false);
  });

  it('returns empty array when origin equals destination', () => {
    expect(getEligibleTrains('MRT', 'MRT')).toEqual([]);
    expect(getEligibleTrains('NDLS', 'NDLS')).toEqual([]);
  });

  it('returns empty array for invalid station identifiers', () => {
    expect(getEligibleTrains('XYZ', 'NDLS')).toEqual([]);
    expect(getEligibleTrains('MRT', 'INVALID')).toEqual([]);
  });
});

describe('Journey Planner Exposure Integration with Timetables', () => {
  it('uses selected train timetable duration to drive exposure calculations without arbitrary slider', async () => {
    const options = await mockRailairService.getTimetableOptions('MRT', 'NDLS');
    expect(options.length).toBeGreaterThan(0);

    const train = options[0];
    const estimate = await mockRailairService.getJourneyEstimate('MRT', 'NDLS', train.trainNo);

    expect(estimate.selectedTrain).toBeDefined();
    expect(estimate.selectedTrain?.trainNo).toBe(train.trainNo);
    expect(estimate.totalDurationMinutes).toBe(train.durationMinutes);
    expect(estimate.isHistoricalSchedule).toBe(true);
    expect(estimate.scheduleUnavailable).toBe(false);

    // Sum of scaled segment travel times must match total scheduled duration
    const totalSegmentMinutes = estimate.segments.reduce((acc, s) => acc + s.travelTimeMinutes, 0);
    expect(totalSegmentMinutes).toBeCloseTo(train.durationMinutes, 2);

    // Exposure proxy must be non-zero and match formula: sum(conc * hours)
    const expectedPm25 = estimate.segments.reduce(
      (sum, s) => sum + s.pm25Concentration * (s.travelTimeMinutes / 60),
      0
    );
    expect(estimate.totalPm25ExposureProxy).toBeCloseTo(expectedPm25, 4);
  });

  it('recalculates exposure consistently when a different train is selected', async () => {
    const options = await mockRailairService.getTimetableOptions('MRT', 'NDLS');
    if (options.length >= 2) {
      const trainA = options[0];
      const trainB = options[options.length - 1]; // Pick another service

      const estimateA = await mockRailairService.getJourneyEstimate('MRT', 'NDLS', trainA.trainNo);
      const estimateB = await mockRailairService.getJourneyEstimate('MRT', 'NDLS', trainB.trainNo);

      expect(estimateA.totalDurationMinutes).toBe(trainA.durationMinutes);
      expect(estimateB.totalDurationMinutes).toBe(trainB.durationMinutes);

      if (trainA.durationMinutes !== trainB.durationMinutes) {
        expect(estimateA.totalPm25ExposureProxy).not.toBe(estimateB.totalPm25ExposureProxy);
      }
    }
  });

  it('handles missing timetable data gracefully without arbitrary fallback', async () => {
    // If querying identical stations where no train can run
    const estimate = await mockRailairService.getJourneyEstimate('MRT', 'MRT');
    expect(estimate.scheduleUnavailable).toBe(true);
    expect(estimate.totalDurationMinutes).toBe(0);
    expect(estimate.totalPm25ExposureProxy).toBe(0);
    expect(estimate.segments.length).toBe(0);
  });
});
