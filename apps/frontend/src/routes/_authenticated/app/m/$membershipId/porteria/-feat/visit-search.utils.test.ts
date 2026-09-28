import { describe, expect, it } from 'vitest';

import { filterVisitsBySearch } from './visit-search.utils';

const visits = [
  { visitorName: 'José Martínez', plate: 'ABC-123' },
  { visitorName: 'Ana Gómez' },
  { visitorName: 'Carlos Ruiz', plate: 'XYZ 987' },
];

const namesOf = (found: ReadonlyArray<{ visitorName: string }>) =>
  found.map((visit) => visit.visitorName);

describe('filterVisitsBySearch', () => {
  it('keeps every Visita for an empty or blank term', () => {
    expect(filterVisitsBySearch(visits, '')).toBe(visits);
    expect(filterVisitsBySearch(visits, '   ')).toBe(visits);
  });

  it('matches names ignoring case and accents', () => {
    expect(namesOf(filterVisitsBySearch(visits, 'jose'))).toEqual([
      'José Martínez',
    ]);
    expect(namesOf(filterVisitsBySearch(visits, 'GÓMEZ'))).toEqual([
      'Ana Gómez',
    ]);
  });

  it('matches plates ignoring spaces, dashes and case', () => {
    expect(namesOf(filterVisitsBySearch(visits, 'abc123'))).toEqual([
      'José Martínez',
    ]);
    expect(namesOf(filterVisitsBySearch(visits, 'xyz-98'))).toEqual([
      'Carlos Ruiz',
    ]);
  });

  it('finds nothing when neither name nor plate matches', () => {
    expect(filterVisitsBySearch(visits, 'zzz')).toEqual([]);
    expect(filterVisitsBySearch(visits, '---')).toEqual([]);
  });
});
