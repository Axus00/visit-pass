import { describe, expect, it } from 'vitest';

import { ALL_WEEKDAYS, evaluatePassAdmission } from './admission';

// 2026-09-26 is a Saturday (weekday 6).
const today = '2026-09-26';

const admissible = {
  pass: { status: 'active' },
  authorization: {
    status: 'active',
    startDate: today,
    endDate: today,
    weekdays: ALL_WEEKDAYS,
  },
  today,
  apartmentHasActiveResident: true,
  visitorIsInside: false,
} satisfies Parameters<typeof evaluatePassAdmission>[0];

describe('evaluatePassAdmission', () => {
  it('admits an active Pase on its day', () => {
    expect(evaluatePassAdmission(admissible)).toEqual({ admissible: true });
  });

  it('admits a Servicio Pase on an allowed weekday inside its range', () => {
    expect(
      evaluatePassAdmission({
        ...admissible,
        authorization: {
          status: 'active',
          startDate: '2026-09-01',
          endDate: '2026-12-31',
          weekdays: [1, 6],
        },
      })
    ).toEqual({ admissible: true });
  });

  it('rejects a cancelled Autorización', () => {
    expect(
      evaluatePassAdmission({
        ...admissible,
        authorization: { ...admissible.authorization, status: 'cancelled' },
      })
    ).toEqual({ admissible: false, reason: 'cancelled' });
  });

  it('rejects a cancelled Pase', () => {
    expect(
      evaluatePassAdmission({ ...admissible, pass: { status: 'cancelled' } })
    ).toEqual({ admissible: false, reason: 'cancelled' });
  });

  it('rejects a Pase replaced by a regenerated one', () => {
    expect(
      evaluatePassAdmission({ ...admissible, pass: { status: 'replaced' } })
    ).toEqual({ admissible: false, reason: 'replaced' });
  });

  it('reports cancellation before replacement', () => {
    expect(
      evaluatePassAdmission({
        ...admissible,
        pass: { status: 'replaced' },
        authorization: { ...admissible.authorization, status: 'cancelled' },
      })
    ).toEqual({ admissible: false, reason: 'cancelled' });
  });

  it('rejects a used Pase', () => {
    expect(
      evaluatePassAdmission({ ...admissible, pass: { status: 'used' } })
    ).toEqual({ admissible: false, reason: 'alreadyUsed' });
  });

  it('rejects a Pase before its first day', () => {
    expect(
      evaluatePassAdmission({ ...admissible, today: '2026-09-25' })
    ).toEqual({ admissible: false, reason: 'notYetValid' });
  });

  it('rejects a Pase after its last day', () => {
    expect(
      evaluatePassAdmission({ ...admissible, today: '2026-09-27' })
    ).toEqual({ admissible: false, reason: 'expired' });
  });

  it('rejects a Servicio Pase on a weekday it does not allow', () => {
    expect(
      evaluatePassAdmission({
        ...admissible,
        authorization: {
          ...admissible.authorization,
          startDate: '2026-09-01',
          endDate: '2026-12-31',
          weekdays: [1, 2, 3, 4, 5],
        },
      })
    ).toEqual({ admissible: false, reason: 'weekdayNotAllowed' });
  });

  it('rejects when the Apartamento has no active Residente', () => {
    expect(
      evaluatePassAdmission({
        ...admissible,
        apartmentHasActiveResident: false,
      })
    ).toEqual({ admissible: false, reason: 'apartmentWithoutResident' });
  });

  it('rejects a Visitante who is already inside', () => {
    expect(
      evaluatePassAdmission({ ...admissible, visitorIsInside: true })
    ).toEqual({ admissible: false, reason: 'alreadyInside' });
  });

  it('reports cancellation before every other rule', () => {
    expect(
      evaluatePassAdmission({
        pass: { status: 'used' },
        authorization: {
          status: 'cancelled',
          startDate: '2026-10-01',
          endDate: '2026-10-01',
          weekdays: [],
        },
        today,
        apartmentHasActiveResident: false,
        visitorIsInside: true,
      })
    ).toEqual({ admissible: false, reason: 'cancelled' });
  });

  it('reports a used Pase before its dates', () => {
    expect(
      evaluatePassAdmission({
        ...admissible,
        pass: { status: 'used' },
        today: '2026-09-27',
      })
    ).toEqual({ admissible: false, reason: 'alreadyUsed' });
  });
});
