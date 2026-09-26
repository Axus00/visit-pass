import { describe, expect, it } from 'vitest';

import { derivePublicPassState, formatWeekdays } from './public-pass.utils';

// 2026-09-26 is a Saturday.
const today = '2026-09-26';

const pass = (
  overrides: Partial<Parameters<typeof derivePublicPassState>[0]> = {}
): Parameters<typeof derivePublicPassState>[0] => ({
  status: 'active',
  authorizationStatus: 'active',
  startDate: today,
  endDate: today,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  ...overrides,
});

describe('derivePublicPassState', () => {
  it('is vigente on its day', () => {
    expect(derivePublicPassState(pass(), today)).toEqual({ kind: 'valid' });
  });

  it('is not yet valid before its first day', () => {
    expect(
      derivePublicPassState(
        pass({ startDate: '2026-09-28', endDate: '2026-09-28' }),
        today
      )
    ).toEqual({ kind: 'notYetValid', validFrom: '2026-09-28' });
  });

  it('starts a future Servicio on its first allowed weekday', () => {
    expect(
      derivePublicPassState(
        pass({
          startDate: '2026-09-27',
          endDate: '2026-12-31',
          weekdays: [3],
        }),
        today
      )
    ).toEqual({ kind: 'notYetValid', validFrom: '2026-09-30' });
  });

  it('points a Servicio to its next allowed day on other weekdays', () => {
    expect(
      derivePublicPassState(
        pass({
          startDate: '2026-09-01',
          endDate: '2026-12-31',
          weekdays: [1, 2, 3, 4, 5],
        }),
        today
      )
    ).toEqual({ kind: 'notToday', nextDate: '2026-09-28' });
  });

  it('is expired after its last day, or when no allowed day is left', () => {
    expect(
      derivePublicPassState(
        pass({ startDate: '2026-09-25', endDate: '2026-09-25' }),
        today
      )
    ).toEqual({ kind: 'expired' });
    expect(
      derivePublicPassState(
        pass({ startDate: '2026-09-01', endDate: '2026-09-27', weekdays: [1] }),
        today
      )
    ).toEqual({ kind: 'expired' });
  });

  it('reports cancelled, replaced and used Pases before any date rule', () => {
    const past = { startDate: '2026-01-01', endDate: '2026-01-01' };

    expect(
      derivePublicPassState(
        pass({ ...past, authorizationStatus: 'cancelled' }),
        today
      )
    ).toEqual({ kind: 'cancelled' });
    expect(
      derivePublicPassState(pass({ ...past, status: 'cancelled' }), today)
    ).toEqual({ kind: 'cancelled' });
    expect(
      derivePublicPassState(pass({ ...past, status: 'replaced' }), today)
    ).toEqual({ kind: 'replaced' });
    expect(
      derivePublicPassState(pass({ ...past, status: 'used' }), today)
    ).toEqual({ kind: 'used' });
  });
});

describe('formatWeekdays', () => {
  it('summarizes the Servicio days Monday first', () => {
    expect(formatWeekdays([1, 2, 3, 4, 5, 6])).toBe('Lun a Sáb');
    expect(formatWeekdays([0, 3])).toBe('Mié, Dom');
  });
});
