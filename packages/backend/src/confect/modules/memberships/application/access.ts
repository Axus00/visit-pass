import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import * as Domain from '../domain';

// -*******************************************************************************-
// API
// -*******************************************************************************-

/**
 * Narrows the caller to one Rol in the active Unidad residencial and answers
 * the Membresía that grants it. Call it first in any handler behind
 * `RequireUnitMembership` that only one Rol may run.
 */
export const requireRole = Effect.fn('Memberships.requireRole')(function* (
  role: Domain.Role
) {
  const current = yield* Domain.CurrentUnitMembership;

  const membership = current.memberships.find(
    (candidate) => candidate.role === role
  );

  if (Predicate.isUndefined(membership))
    return yield* new Domain.RoleRequiredError({ role });

  return { ...current, membership };
});
