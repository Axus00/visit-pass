import { describe, expect, it } from 'vitest';

import type * as VisitPass from '#modules/visit-pass';

import {
  ANONYMIZED_VISITOR_LABEL,
  groupVisitsByDay,
  matchesVisitSearch,
  visitPresence,
} from './visits.utils';

const timeZone = 'America/Bogota';
const today = '2026-09-26';
// 2026-09-26 12:00 in Bogotá (UTC-5).
const noonToday = Date.parse('2026-09-26T17:00:00Z');
const hour = 60 * 60 * 1000;

const visit = (
  overrides: Partial<VisitPass.VisitSummary> = {}
): VisitPass.VisitSummary => ({
  _id: 'visit' as VisitPass.VisitSummary['_id'],
  visitorName: 'Juan Pérez',
  apartmentId: 'apartment' as VisitPass.VisitSummary['apartmentId'],
  apartmentLabel: 'Torre 1 - 101',
  visitType: 'temporary',
  origin: 'pass',
  enteredAt: noonToday,
  anonymized: false,
  voided: false,
  ...overrides,
});

describe('visitPresence', () => {
  it('is Dentro until the Salida is registered', () => {
    expect(visitPresence(visit())).toBe('inside');
    expect(visitPresence(visit({ exitedAt: noonToday + hour }))).toBe('left');
  });

  it('reports a voided Visita as Anulada even without Salida', () => {
    expect(visitPresence(visit({ voided: true }))).toBe('voided');
  });
});

describe('groupVisitsByDay', () => {
  it('groups by the unit calendar day, latest first, labelling Hoy and Ayer', () => {
    const groups = groupVisitsByDay(
      [
        visit({
          _id: 'yesterday' as VisitPass.VisitSummary['_id'],
          enteredAt: noonToday - 24 * hour,
        }),
        visit({
          _id: 'morning' as VisitPass.VisitSummary['_id'],
          enteredAt: noonToday - 3 * hour,
        }),
        // 23:30 on the 24th in Bogotá, already the 25th in UTC.
        visit({
          _id: 'late' as VisitPass.VisitSummary['_id'],
          enteredAt: Date.parse('2026-09-25T04:30:00Z'),
        }),
        visit({ _id: 'noon' as VisitPass.VisitSummary['_id'] }),
      ],
      today,
      timeZone
    );

    expect(groups.map((group) => group.label.split(',')[0])).toEqual([
      'Hoy',
      'Ayer',
      'Jueves',
    ]);
    expect(groups[0]?.visits.map((item) => item._id)).toEqual([
      'noon',
      'morning',
    ]);
    expect(groups[2]?.localDate).toBe('2026-09-24');
  });
});

describe('matchesVisitSearch', () => {
  it('matches the name without accents or case', () => {
    expect(matchesVisitSearch(visit(), 'juan perez')).toBe(true);
    expect(matchesVisitSearch(visit(), 'María')).toBe(false);
  });

  it('matches the plate ignoring spaces and dashes', () => {
    expect(matchesVisitSearch(visit({ plate: 'ABC-123' }), 'abc 12')).toBe(
      true
    );
  });

  it('searches anonymized Visitas by their placeholder only', () => {
    const anonymized = visit({ anonymized: true, visitorName: 'Juan' });

    expect(matchesVisitSearch(anonymized, 'juan')).toBe(false);
    expect(matchesVisitSearch(anonymized, ANONYMIZED_VISITOR_LABEL)).toBe(true);
  });

  it('lets an empty search through', () => {
    expect(matchesVisitSearch(visit(), '  ')).toBe(true);
  });
});
