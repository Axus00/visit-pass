import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import type { Id } from '#convex/_generated/dataModel';

import { DatabaseReader, DatabaseWriter } from '../../../_generated/services';
import * as CommonEmailAddressesDomain from '../../commonEmailAddresses/domain';
import * as ResidentialUnitsDomain from '../../residentialUnits/domain';
import * as UsersApplication from '../../users/application';
import * as UsersDomain from '../../users/domain';
import * as Domain from '../domain';

/** One email or Usuario holds few Membresías, so a small scan finds every duplicate. */
const DUPLICATE_SCAN_LIMIT = 200;

/**
 * Creates a Membresía in `residentialUnitId`. It starts `active` when a
 * Usuario already signed in with that email, else `pending` until they do.
 * Fails with `MembershipAlreadyExistsError` when the email, or its Usuario
 * under any earlier email, already holds the same unit, Rol and Apartamento.
 * Callers must have authorized the caller for the unit first.
 */
export const inviteMember = Effect.fn('Memberships.inviteMember')(function* (
  residentialUnitId: Id<'residentialUnits'>,
  invitation: Domain.InviteMemberDto
) {
  const reader = yield* DatabaseReader;
  const writer = yield* DatabaseWriter;

  const email = CommonEmailAddressesDomain.normalizeEmailAddress(
    invitation.email
  );

  if (!Domain.isPlausibleEmailAddress(email))
    return yield* new Domain.InvalidMembershipError({ reason: 'invalidEmail' });

  const isResident = invitation.role === 'resident';
  const hasApartment = Predicate.isNotUndefined(invitation.apartmentId);
  const hasOccupancyType = Predicate.isNotUndefined(invitation.occupancyType);

  const isResidentWithoutApartment =
    isResident && (!hasApartment || !hasOccupancyType);
  if (isResidentWithoutApartment)
    return yield* new Domain.InvalidMembershipError({
      reason: 'residentNeedsApartment',
    });

  const isNonResidentWithApartment =
    !isResident && (hasApartment || hasOccupancyType);
  if (isNonResidentWithApartment)
    return yield* new Domain.InvalidMembershipError({
      reason: 'onlyResidentsHaveApartment',
    });

  if (Predicate.isNotUndefined(invitation.apartmentId)) {
    const apartment = yield* reader
      .table('apartments')
      .get(invitation.apartmentId)
      .pipe(
        Effect.catchTags({
          GetByIdFailure: () => Effect.succeed(null),
          DocumentDecodeError: Effect.die,
        })
      );

    const isApartmentOfUnit =
      Predicate.isNotNull(apartment) &&
      apartment.residentialUnitId === residentialUnitId;
    if (!isApartmentOfUnit)
      return yield* new ResidentialUnitsDomain.ApartmentNotFoundError();
  }

  const [pendingMemberships, activeMemberships, user] = yield* Effect.all(
    [
      reader
        .table('memberships')
        .index('by_email_and_status', (q) =>
          q.eq('email', email).eq('status', 'pending')
        )
        .take(DUPLICATE_SCAN_LIMIT),
      reader
        .table('memberships')
        .index('by_email_and_status', (q) =>
          q.eq('email', email).eq('status', 'active')
        )
        .take(DUPLICATE_SCAN_LIMIT),
      UsersApplication.getOneByEmail(email).pipe(UsersDomain.isActiveOrNull),
    ],
    { concurrency: 'unbounded' }
  ).pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

  // A Usuario who changed email keeps Membresías stored under the old one.
  const userMemberships = Predicate.isNull(user)
    ? []
    : yield* reader
        .table('memberships')
        .index('by_userId', (q) => q.eq('userId', user._id))
        .take(DUPLICATE_SCAN_LIMIT)
        .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

  const activeUserMemberships = userMemberships.filter(
    (membership) => membership.status === 'active'
  );

  const isDuplicate = [
    ...pendingMemberships,
    ...activeMemberships,
    ...activeUserMemberships,
  ].some(
    (membership) =>
      membership.residentialUnitId === residentialUnitId &&
      membership.role === invitation.role &&
      membership.apartmentId === invitation.apartmentId
  );
  if (isDuplicate)
    return yield* new Domain.MembershipAlreadyExistsError({ email });

  const now = yield* Clock.currentTimeMillis;
  const hasAccount = Predicate.isNotNull(user);

  return yield* writer
    .table('memberships')
    .insert({
      residentialUnitId,
      email,
      displayName: invitation.displayName,
      role: invitation.role,
      apartmentId: invitation.apartmentId,
      occupancyType: invitation.occupancyType,
      status: hasAccount ? 'active' : 'pending',
      userId: user?._id,
      activatedAt: hasAccount ? now : undefined,
    })
    .pipe(Effect.catchTag('DocumentEncodeError', Effect.die));
});
