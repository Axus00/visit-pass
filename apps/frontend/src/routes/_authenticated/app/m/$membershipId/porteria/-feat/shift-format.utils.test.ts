import { describe, expect, it } from 'vitest';

import * as VisitPass from '#modules/visit-pass';

import { describeShiftWindow, shiftElapsedMillis } from './shift-format.utils';

const TIME_ZONE = 'America/Bogota';
/** 26 sep 2026 06:00 in Bogotá (UTC-5). */
const SIX_AM = Date.UTC(2026, 8, 26, 11, 0);
const HOUR = 3_600_000;

/** Locale formatting varies by ICU build, so expectations reuse the formatters. */
const at = (epochMillis: number) =>
  VisitPass.formatDateTime(epochMillis, TIME_ZONE);
const time = (epochMillis: number) =>
  VisitPass.formatTime(epochMillis, TIME_ZONE);

describe('describeShiftWindow', () => {
  it('uses the real start and end of a closed Turno', () => {
    const window = describeShiftWindow(
      { startedAt: SIX_AM, endedAt: SIX_AM + 8 * HOUR },
      TIME_ZONE
    );

    expect(window).toBe(`${at(SIX_AM)} – ${time(SIX_AM + 8 * HOUR)}`);
  });

  it('marks an open Turno as running, even when it was planned', () => {
    const window = describeShiftWindow(
      { startedAt: SIX_AM, plannedStart: SIX_AM, plannedEnd: SIX_AM + HOUR },
      TIME_ZONE
    );

    expect(window).toBe(`${at(SIX_AM)} – en curso`);
  });

  it('falls back to the planned schedule before the Turno starts', () => {
    const window = describeShiftWindow(
      { plannedStart: SIX_AM + 2 * HOUR, plannedEnd: SIX_AM + 10 * HOUR },
      TIME_ZONE
    );

    expect(window).toBe(
      `${at(SIX_AM + 2 * HOUR)} – ${time(SIX_AM + 10 * HOUR)}`
    );
    expect(describeShiftWindow({}, TIME_ZONE)).toBe('Sin horario');
  });
});

describe('shiftElapsedMillis', () => {
  it('measures to now while open and to the end once closed', () => {
    expect(shiftElapsedMillis({ startedAt: SIX_AM }, SIX_AM + HOUR)).toBe(HOUR);
    expect(
      shiftElapsedMillis(
        { startedAt: SIX_AM, endedAt: SIX_AM + 2 * HOUR },
        SIX_AM + 9 * HOUR
      )
    ).toBe(2 * HOUR);
  });

  it('is zero for a Turno that has not started', () => {
    expect(shiftElapsedMillis({ plannedStart: SIX_AM }, SIX_AM + HOUR)).toBe(0);
  });
});
