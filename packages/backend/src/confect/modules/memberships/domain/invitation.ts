import * as Predicate from 'effect/Predicate';

import type { MembershipsDoc } from '../../../_generated/docs';
import type { InviteMembershipDto } from './models';

/** A pending Membresía caduca by date; no job flips its status. */
export const isInvitationExpired = (
  membership: Pick<MembershipsDoc, 'invitationExpiresAt'>,
  now: number
): boolean => membership.invitationExpiresAt <= now;

/** A Residente carries an Apartamento and a Tipo de ocupación; every other Rol carries neither. */
export const isValidResidentAssignment = (
  dto: Pick<InviteMembershipDto, 'role' | 'apartmentId' | 'occupancyType'>
): boolean => {
  const hasApartment = Predicate.isNotUndefined(dto.apartmentId);
  const hasOccupancyType = Predicate.isNotUndefined(dto.occupancyType);

  return dto.role === 'resident'
    ? hasApartment && hasOccupancyType
    : !hasApartment && !hasOccupancyType;
};
