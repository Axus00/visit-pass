import * as Predicate from 'effect/Predicate';

import type * as VisitPass from '#modules/visit-pass';

/** Where a Visita stands: still inside, already out, or voided by mistake. */
export type VisitStatus = 'inside' | 'exited' | 'voided';

export type VisitFilters = {
  readonly search: string;
  readonly status: VisitStatus | 'all';
  readonly visitType: VisitPass.VisitType | 'all';
  readonly origin: VisitPass.VisitOrigin | 'all';
};

export const EMPTY_VISIT_FILTERS: VisitFilters = {
  search: '',
  status: 'all',
  visitType: 'all',
  origin: 'all',
};

/** A voided Visita counts as neither inside nor exited. */
export function visitStatusOf(
  visit: Pick<VisitPass.VisitSummary, 'voided' | 'exitedAt'>
): VisitStatus {
  if (visit.voided) return 'voided';

  return Predicate.isUndefined(visit.exitedAt) ? 'inside' : 'exited';
}

/** Lowercase without accents, so `méndez` finds `Mendez`. */
function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Keeps the Visitas matching every filter. The search looks at the Visitante's
 * name, document and plate and the Apartamento, ignoring case, accents and the
 * spaces or dashes people type in plates and documents.
 */
export function filterVisits<Visit extends VisitPass.VisitSummary>(
  visits: ReadonlyArray<Visit>,
  filters: VisitFilters
): ReadonlyArray<Visit> {
  const query = normalize(filters.search);
  const compactQuery = query.replace(/[\s.-]/g, '');

  return visits.filter((visit) => {
    const matchesStatus =
      filters.status === 'all' || visitStatusOf(visit) === filters.status;
    const matchesType =
      filters.visitType === 'all' || visit.visitType === filters.visitType;
    const matchesOrigin =
      filters.origin === 'all' || visit.origin === filters.origin;

    const matchesEveryFilter = matchesStatus && matchesType && matchesOrigin;

    if (!matchesEveryFilter) return false;
    if (query.length === 0) return true;

    const haystack = normalize(
      [
        visit.visitorName,
        visit.visitorDocument ?? '',
        visit.plate ?? '',
        visit.apartmentLabel,
      ].join(' ')
    );
    const compactHaystack = haystack.replace(/[\s.-]/g, '');

    return haystack.includes(query) || compactHaystack.includes(compactQuery);
  });
}
