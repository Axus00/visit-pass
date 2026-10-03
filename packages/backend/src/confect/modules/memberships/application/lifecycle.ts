import * as Clock from 'effect/Clock';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import type { Id } from '#convex/_generated/dataModel';

import type { MembershipsDoc } from '../../../_generated/docs';
import refs from '../../../_generated/refs';
import { DatabaseWriter, Scheduler } from '../../../_generated/services';
import * as ApartmentsApplication from '../../apartments/application';
import * as ApartmentsDomain from '../../apartments/domain';
import * as CommonEmailAddressesDomain from '../../commonEmailAddresses/domain';
import * as ResidentialUnitsApplication from '../../residentialUnits/application';
import * as UsersApplication from '../../users/application';
import * as UsersDomain from '../../users/domain';
import * as Domain from '../domain';
import {
  listActiveByUser,
  listByUnitAndEmail,
  listPendingByEmail,
} from './queries';

// -*******************************************************************************-
// API
// -*******************************************************************************-

/**
 * Reconciles WorkOS after the local Membresías of a Usuario in a unit changed.
 * `releasedExternalInvitationId` names a WorkOS invitation to revoke first, so
 * the answer to an Invitación and the access it leads to never race.
 */
export const scheduleUnitAccessSync = Effect.fn(
  'Memberships.scheduleUnitAccessSync'
)(function* (args: {
  userId: Id<'users'>;
  residentialUnitId: Id<'residentialUnits'>;
  releasedExternalInvitationId?: string | undefined;
}) {
  const scheduler = yield* Scheduler;

  yield* scheduler.runAfter(
    Duration.zero,
    refs.internal.memberships.syncUnitAccess,
    args
  );
});

/** Kills the WorkOS link of an Invitación nobody with an account can answer. */
export const scheduleExternalInvitationRelease = Effect.fn(
  'Memberships.scheduleExternalInvitationRelease'
)(function* (externalInvitationId: string | undefined) {
  const scheduler = yield* Scheduler;

  if (Predicate.isUndefined(externalInvitationId)) return;

  yield* scheduler.runAfter(
    Duration.zero,
    refs.internal.memberships.releaseExternalInvitation,
    { externalInvitationId }
  );
});

/**
 * Gathers what WorkOS should hold for one Usuario in one Unidad residencial.
 * Answers null when either is gone, which leaves nothing to reconcile.
 */
export const loadUnitAccessTarget = Effect.fn(
  'Memberships.loadUnitAccessTarget'
)(function* (args: {
  userId: Id<'users'>;
  residentialUnitId: Id<'residentialUnits'>;
}) {
  const [user, residentialUnit] = yield* Effect.all(
    [
      UsersApplication.getOneById(args.userId).pipe(UsersDomain.isActiveOrNull),
      ResidentialUnitsApplication.getOneById(args.residentialUnitId),
    ],
    { concurrency: 'unbounded' }
  );

  const isUserOrUnitGone =
    Predicate.isNull(user) || Predicate.isNull(residentialUnit);
  if (isUserOrUnitGone) return null;

  const [active, pending] = yield* Effect.all(
    [listActiveByUser(user._id), listPendingByEmail(user.email)],
    { concurrency: 'unbounded' }
  );
  const isInUnit = (membership: MembershipsDoc) =>
    membership.residentialUnitId === residentialUnit._id;

  return {
    externalUserId: user.externalId,
    externalOrganizationId: residentialUnit.externalOrganizationId,
    roles: [...new Set(active.filter(isInUnit).map(({ role }) => role))],
    hasPendingInvitation: pending.some(isInUnit),
  } satisfies Domain.UnitAccessTarget;
});

export const scheduleInvitationDelivery = Effect.fn(
  'Memberships.scheduleInvitationDelivery'
)(function* (membershipId: Id<'memberships'>) {
  const scheduler = yield* Scheduler;

  yield* scheduler.runAfter(
    Duration.zero,
    refs.internal.memberships.startInvitationDelivery,
    { membershipId }
  );
});

/**
 * Creates a Membresía pendiente and sends its Invitación. `invitedByMembershipId`
 * is absent when the platform invites a unit's Administrador.
 */
export const inviteMembership = Effect.fn('Memberships.inviteMembership')(
  function* (args: {
    residentialUnitId: Id<'residentialUnits'>;
    dto: Domain.InviteMembershipDto;
    invitedByMembershipId?: Id<'memberships'>;
  }) {
    const writer = yield* DatabaseWriter;
    const { residentialUnitId, dto } = args;

    if (!Domain.isValidResidentAssignment(dto))
      return yield* new Domain.InvalidResidentAssignmentError();

    if (Predicate.isNotUndefined(dto.apartmentId)) {
      const apartment = yield* ApartmentsApplication.getOneInUnit(
        dto.apartmentId,
        residentialUnitId
      );

      if (Predicate.isNotUndefined(apartment.deactivatedAt))
        return yield* new ApartmentsDomain.ApartmentNotFoundError();
    }

    const email = CommonEmailAddressesDomain.normalizeEmailAddress(dto.email);
    const sameEmail = yield* listByUnitAndEmail(residentialUnitId, email);
    const isDuplicate = sameEmail.some(
      (membership) =>
        (membership.status === 'pending' || membership.status === 'active') &&
        membership.role === dto.role &&
        membership.apartmentId === dto.apartmentId
    );

    if (isDuplicate) return yield* new Domain.DuplicateMembershipError();

    const now = yield* Clock.currentTimeMillis;

    const membershipId = yield* writer
      .table('memberships')
      .insert({
        residentialUnitId,
        role: dto.role,
        apartmentId: dto.apartmentId,
        occupancyType: dto.occupancyType,
        name: dto.name,
        email,
        status: 'pending',
        invitedAt: now,
        invitedByMembershipId: args.invitedByMembershipId,
        invitationExpiresAt:
          now + Duration.toMillis(Domain.INVITATION_VALIDITY),
        invitationDelivery: 'sending',
      })
      .pipe(Effect.catchTag('DocumentEncodeError', Effect.die));

    yield* scheduleInvitationDelivery(membershipId);

    return membershipId;
  }
);

/**
 * Ends an active Membresía for good and lets WorkOS follow. The row stays for
 * the unit's history; inviting the person again creates another one. Every
 * revocation passes through here, so this is where the Autorizaciones of an
 * Apartamento left without Residentes are cancelled and a Portero's open Turno
 * is closed once those modules exist.
 */
export const revokeMembership = Effect.fn('Memberships.revokeMembership')(
  function* (args: {
    membership: MembershipsDoc;
    revokedByMembershipId?: Id<'memberships'>;
  }) {
    const writer = yield* DatabaseWriter;
    const { membership } = args;

    const now = yield* Clock.currentTimeMillis;

    yield* writer
      .table('memberships')
      .patch(membership._id, {
        status: 'revoked',
        revokedAt: now,
        revokedByMembershipId: args.revokedByMembershipId,
      })
      .pipe(
        Effect.catchTag(
          ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
          Effect.die
        )
      );

    if (Predicate.isUndefined(membership.userId)) return;

    yield* scheduleUnitAccessSync({
      userId: membership.userId,
      residentialUnitId: membership.residentialUnitId,
    });
  }
);
