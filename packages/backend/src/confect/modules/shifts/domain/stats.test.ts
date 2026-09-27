import { describe, expect, it } from 'vitest';

import { summarizeShiftVisits } from './stats';

describe('summarizeShiftVisits', () => {
  it('counts by origin, by Tipo de visita and still inside, skipping voided Visitas', () => {
    expect(
      summarizeShiftVisits([
        { origin: 'pass', visitType: 'temporary' },
        { origin: 'pass', visitType: 'event', exitedAt: 2 },
        { origin: 'manual', visitType: 'service' },
        { origin: 'manual', visitType: 'temporary', exitedAt: 3 },
        { origin: 'pass', visitType: 'service', voidedAt: 4 },
        { origin: 'manual', visitType: 'event', exitedAt: 5, voidedAt: 6 },
      ])
    ).toEqual({
      total: 4,
      fromPass: 2,
      manual: 2,
      temporary: 2,
      event: 1,
      service: 1,
      stillInside: 2,
    });
  });

  it('counts nothing for a Turno without Visitas', () => {
    expect(summarizeShiftVisits([])).toEqual({
      total: 0,
      fromPass: 0,
      manual: 0,
      temporary: 0,
      event: 0,
      service: 0,
      stillInside: 0,
    });
  });
});
