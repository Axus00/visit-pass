import { describe, expect, it } from 'vitest';

import type * as VisitPass from '#modules/visit-pass';

import {
  EMPTY_VISIT_FILTERS,
  filterVisits,
  visitStatusOf,
} from './visit-filters.utils';

function visit(
  overrides: Omit<Partial<VisitPass.VisitSummary>, '_id'> & {
    readonly _id: string;
  }
): VisitPass.VisitSummary {
  return {
    visitorName: 'Visitante',
    apartmentId: 'apartment' as VisitPass.VisitSummary['apartmentId'],
    apartmentLabel: 'Torre 1 · 101',
    visitType: 'temporary',
    origin: 'pass',
    enteredAt: 0,
    anonymized: false,
    voided: false,
    ...overrides,
    _id: overrides._id as VisitPass.VisitSummary['_id'],
  };
}

const mendez = visit({
  _id: 'mendez',
  visitorName: 'Roberto Méndez',
  visitorDocument: '45.221.902',
  plate: 'ABC-123',
  apartmentLabel: 'Torre 2 · 1204',
});
const castillo = visit({
  _id: 'castillo',
  visitorName: 'Ana Castillo',
  visitType: 'service',
  origin: 'manual',
  exitedAt: 10,
});
const voided = visit({
  _id: 'voided',
  visitorName: 'Registro por error',
  voided: true,
  voidReason: 'Duplicada',
});

const visits = [mendez, castillo, voided];

function ids(filtered: ReadonlyArray<VisitPass.VisitSummary>) {
  return filtered.map((candidate) => candidate._id);
}

describe('visitStatusOf', () => {
  it('reads inside, exited and voided', () => {
    expect(visitStatusOf(mendez)).toBe('inside');
    expect(visitStatusOf(castillo)).toBe('exited');
    expect(visitStatusOf({ ...castillo, voided: true })).toBe('voided');
  });
});

describe('filterVisits', () => {
  it('keeps everything with empty filters', () => {
    expect(ids(filterVisits(visits, EMPTY_VISIT_FILTERS))).toEqual([
      'mendez',
      'castillo',
      'voided',
    ]);
  });

  it('leaves voided Visitas out of the inside and exited filters', () => {
    expect(
      ids(filterVisits(visits, { ...EMPTY_VISIT_FILTERS, status: 'inside' }))
    ).toEqual(['mendez']);
    expect(
      ids(filterVisits(visits, { ...EMPTY_VISIT_FILTERS, status: 'exited' }))
    ).toEqual(['castillo']);
    expect(
      ids(filterVisits(visits, { ...EMPTY_VISIT_FILTERS, status: 'voided' }))
    ).toEqual(['voided']);
  });

  it('filters by Tipo de visita and origin together', () => {
    expect(
      ids(
        filterVisits(visits, {
          ...EMPTY_VISIT_FILTERS,
          visitType: 'service',
          origin: 'manual',
        })
      )
    ).toEqual(['castillo']);
    expect(
      ids(
        filterVisits(visits, {
          ...EMPTY_VISIT_FILTERS,
          visitType: 'service',
          origin: 'pass',
        })
      )
    ).toEqual([]);
  });

  it('searches names ignoring case and accents', () => {
    expect(
      ids(filterVisits(visits, { ...EMPTY_VISIT_FILTERS, search: 'MENDEZ' }))
    ).toEqual(['mendez']);
  });

  it('searches documents and plates ignoring dots, dashes and spaces', () => {
    expect(
      ids(filterVisits(visits, { ...EMPTY_VISIT_FILTERS, search: '45221902' }))
    ).toEqual(['mendez']);
    expect(
      ids(filterVisits(visits, { ...EMPTY_VISIT_FILTERS, search: 'abc 123' }))
    ).toEqual(['mendez']);
  });

  it('searches the Apartamento label', () => {
    expect(
      ids(filterVisits(visits, { ...EMPTY_VISIT_FILTERS, search: '1204' }))
    ).toEqual(['mendez']);
  });
});
