import * as Predicate from 'effect/Predicate';

import type { ShiftStats } from './models';

/**
 * Counts a Turno's Visitas by origin, by Tipo de visita and still inside.
 * Voided Visitas count for nothing.
 */
export function summarizeShiftVisits(
  registeredVisits: ReadonlyArray<{
    readonly origin: 'pass' | 'manual';
    readonly visitType: 'temporary' | 'event' | 'service';
    readonly exitedAt?: number | undefined;
    readonly voidedAt?: number | undefined;
  }>
): ShiftStats {
  const visits = registeredVisits.filter((visit) =>
    Predicate.isUndefined(visit.voidedAt)
  );
  const count = (predicate: (visit: (typeof visits)[number]) => boolean) =>
    visits.filter(predicate).length;

  return {
    total: visits.length,
    fromPass: count((visit) => visit.origin === 'pass'),
    manual: count((visit) => visit.origin === 'manual'),
    temporary: count((visit) => visit.visitType === 'temporary'),
    event: count((visit) => visit.visitType === 'event'),
    service: count((visit) => visit.visitType === 'service'),
    stillInside: count((visit) => Predicate.isUndefined(visit.exitedAt)),
  };
}
