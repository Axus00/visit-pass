import { describe, expect, it } from 'vitest';

import { toShiftWindow, zonedDateTimeToEpoch } from './zoned-time.utils';

describe('zonedDateTimeToEpoch', () => {
  it('reads Bogotá wall-clock times five hours behind UTC', () => {
    expect(
      zonedDateTimeToEpoch({
        localDate: '2026-09-26',
        localTime: '06:00',
        timeZone: 'America/Bogota',
      })
    ).toBe(Date.parse('2026-09-26T11:00:00Z'));

    expect(
      zonedDateTimeToEpoch({
        localDate: '2026-12-31',
        localTime: '22:30',
        timeZone: 'America/Bogota',
      })
    ).toBe(Date.parse('2027-01-01T03:30:00Z'));
  });

  it('reads UTC as-is', () => {
    expect(
      zonedDateTimeToEpoch({
        localDate: '2026-02-28',
        localTime: '00:00',
        timeZone: 'UTC',
      })
    ).toBe(Date.parse('2026-02-28T00:00:00Z'));
  });

  it('follows daylight saving on both sides of the change', () => {
    expect(
      zonedDateTimeToEpoch({
        localDate: '2026-01-15',
        localTime: '09:00',
        timeZone: 'Europe/Madrid',
      })
    ).toBe(Date.parse('2026-01-15T08:00:00Z'));

    expect(
      zonedDateTimeToEpoch({
        localDate: '2026-07-15',
        localTime: '09:00',
        timeZone: 'Europe/Madrid',
      })
    ).toBe(Date.parse('2026-07-15T07:00:00Z'));
  });

  it('moves a time skipped by spring-forward ahead by the gap', () => {
    expect(
      zonedDateTimeToEpoch({
        localDate: '2026-03-08',
        localTime: '02:30',
        timeZone: 'America/New_York',
      })
    ).toBe(Date.parse('2026-03-08T07:30:00Z'));

    expect(
      zonedDateTimeToEpoch({
        localDate: '2026-03-29',
        localTime: '02:30',
        timeZone: 'Europe/Madrid',
      })
    ).toBe(Date.parse('2026-03-29T01:30:00Z'));
  });

  it('picks the earlier instant for a time repeated by fall-back', () => {
    expect(
      zonedDateTimeToEpoch({
        localDate: '2026-11-01',
        localTime: '01:30',
        timeZone: 'America/New_York',
      })
    ).toBe(Date.parse('2026-11-01T05:30:00Z'));
  });
});

describe('toShiftWindow', () => {
  it('keeps a day shift on the chosen date', () => {
    expect(
      toShiftWindow({
        date: '2026-09-26',
        startTime: '06:00',
        endTime: '18:00',
        timeZone: 'America/Bogota',
      })
    ).toEqual({
      plannedStart: Date.parse('2026-09-26T11:00:00Z'),
      plannedEnd: Date.parse('2026-09-26T23:00:00Z'),
      endsNextDay: false,
    });
  });

  it('ends a night shift on the next day', () => {
    expect(
      toShiftWindow({
        date: '2026-09-30',
        startTime: '18:00',
        endTime: '06:00',
        timeZone: 'America/Bogota',
      })
    ).toEqual({
      plannedStart: Date.parse('2026-09-30T23:00:00Z'),
      plannedEnd: Date.parse('2026-10-01T11:00:00Z'),
      endsNextDay: true,
    });
  });

  it('treats an end equal to the start as a 24-hour Turno', () => {
    const window = toShiftWindow({
      date: '2026-09-26',
      startTime: '07:00',
      endTime: '07:00',
      timeZone: 'America/Bogota',
    });

    expect(window.plannedEnd - window.plannedStart).toBe(24 * 60 * 60 * 1000);
  });
});
