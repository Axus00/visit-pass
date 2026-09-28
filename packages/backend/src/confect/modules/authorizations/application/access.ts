import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import type { Id } from '#convex/_generated/dataModel';

import * as MembershipsApplication from '../../memberships/application';
import * as MembershipsDomain from '../../memberships/domain';

/**
 * Resolves the caller's Residente Membresía and its Apartamento, the only
 * Apartamento whose Autorizaciones, Pases and Visitas it may read or change.
 */
export const requireResidentApartment = Effect.fn(
  'Authorizations.requireResidentApartment'
)(function* (membershipId: Id<'memberships'>) {
  const { membership } = yield* MembershipsApplication.requireMembership(
    membershipId,
    ['resident']
  );

  const apartmentId = membership.apartmentId;
  if (Predicate.isUndefined(apartmentId))
    return yield* new MembershipsDomain.AccessDeniedError();

  return { membership, apartmentId };
});
