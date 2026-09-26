import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TIME_ZONE,
  addDays,
  daysBetween,
  toLocalDate,
  weekdayOf,
} from './localDate';

describe('toLocalDate', () => {
  it('keeps the previous Bogotá day until 05:00 UTC', () => {
    expect(
      toLocalDate(Date.parse('2026-09-26T00:00:00Z'), DEFAULT_TIME_ZONE)
    ).toBe('2026-09-25');
    expect(
      toLocalDate(Date.parse('2026-09-26T04:59:59.999Z'), DEFAULT_TIME_ZONE)
    ).toBe('2026-09-25');
  });

  it('starts the Bogotá day at 05:00 UTC', () => {
    expect(
      toLocalDate(Date.parse('2026-09-26T05:00:00Z'), DEFAULT_TIME_ZONE)
    ).toBe('2026-09-26');
  });

  it('reads the day in the given zone', () => {
    expect(toLocalDate(Date.parse('2026-09-26T00:00:00Z'), 'UTC')).toBe(
      '2026-09-26'
    );
  });
});

describe('weekdayOf', () => {
  it('numbers Sunday as 0 and Saturday as 6', () => {
    expect(weekdayOf('2026-09-27')).toBe(0);
    expect(weekdayOf('2026-09-28')).toBe(1);
    expect(weekdayOf('2026-09-26')).toBe(6);
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('handles leap days', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('daysBetween', () => {
  it('counts whole days in either direction', () => {
    expect(daysBetween('2026-09-26', '2026-09-26')).toBe(0);
    expect(daysBetween('2026-09-26', '2026-10-06')).toBe(10);
    expect(daysBetween('2026-10-06', '2026-09-26')).toBe(-10);
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
  });
});
