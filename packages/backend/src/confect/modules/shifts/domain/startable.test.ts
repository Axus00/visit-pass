import { describe, expect, it } from 'vitest';

import { findPlannedShiftToStart, listStartableShifts } from './startable';

const HOUR = 60 * 60 * 1000;
const now = Date.UTC(2026, 8, 26, 23, 10);

const planned = (startOffsetHours: number, durationHours: number) => ({
  status: 'scheduled' as const,
  plannedStart: now + startOffsetHours * HOUR,
  plannedEnd: now + (startOffsetHours + durationHours) * HOUR,
});

describe('listStartableShifts', () => {
  it('keeps upcoming and recently overdue planned Turnos, soonest first', () => {
    const overdue = planned(-12.2, 12);
    const upcoming = planned(10.8, 12);
    const tooOld = planned(-30, 12);

    expect(listStartableShifts([upcoming, tooOld, overdue], now)).toEqual([
      overdue,
      upcoming,
    ]);
  });

  it('ignores Turnos that are not scheduled', () => {
    const open = { ...planned(-1, 8), status: 'open' as const };

    expect(listStartableShifts([open], now)).toEqual([]);
  });
});

describe('findPlannedShiftToStart', () => {
  it('starts an overdue planned Turno instead of an unplanned one', () => {
    const overdue = planned(-12.2, 12);

    expect(findPlannedShiftToStart([overdue], now)).toBe(overdue);
  });

  it('prefers the current planned Turno over an overdue one', () => {
    const overdue = planned(-12.2, 12);
    const current = planned(-0.2, 12);

    expect(findPlannedShiftToStart([overdue, current], now)).toBe(current);
  });

  it('starts a planned Turno up to an hour early, not earlier', () => {
    const inHalfAnHour = planned(0.5, 8);
    const inThreeHours = planned(3, 8);

    expect(findPlannedShiftToStart([inHalfAnHour], now)).toBe(inHalfAnHour);
    expect(findPlannedShiftToStart([inThreeHours], now)).toBeUndefined();
  });
});
