import { FunctionImpl, GroupImpl } from '@confect/server';
import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';

import databaseSchema from './_generated/schema';
import { DatabaseReader, DatabaseWriter } from './_generated/services';
import membershipsSpec from './memberships.spec';
import RequireUserIdentity from './middleware/RequireUserIdentity.impl';
import * as Authentication from './modules/authentication';
import * as Memberships from './modules/memberships';
import * as ResidentialUnits from './modules/residentialUnits';
import * as Users from './modules/users';

/** A Usuario belongs to a handful of units; this bounds a runaway account. */
const MEMBERSHIPS_PER_USER_LIMIT = 100;

/**
 * Read per Rol, newest first, so a crowded Rol never pushes another out; the
 * same bound the unit dashboard counts with.
 */
const MEMBERSHIPS_PER_ROLE_LIMIT = 2000;

const APARTMENTS_PER_UNIT_LIMIT = 2000;

/** What a caller has before the WorkOS webhook syncs their Usuario. */
const NO_ACCESS: Memberships.MyAccess = {
  memberships: [],
  isSuperadmin: false,
};

// -*******************************************************************************-
// Public
// -*******************************************************************************-

/** Answers no Membresías until the WorkOS webhook has synced the caller. */
const listMineImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'listMine',
  () =>
    Effect.gen(function* () {
      const identity = yield* Authentication.CurrentUserIdentity;
      const reader = yield* DatabaseReader;

      const user = yield* Users.getOneByIdentityTokenIdentifier(
        identity.tokenIdentifier
      ).pipe(Users.isActiveOrNull);

      if (Predicate.isNull(user)) return NO_ACCESS;

      const [memberships, isSuperadmin] = yield* Effect.all(
        [
          reader
            .table('memberships')
            .index('by_userId', (q) => q.eq('userId', user._id))
            .take(MEMBERSHIPS_PER_USER_LIMIT),
          ResidentialUnits.isSuperadminEmail(user.email),
        ],
        { concurrency: 'unbounded' }
      ).pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

      const summaries = yield* Effect.forEach(
        memberships.filter((membership) => membership.status === 'active'),
        (membership) =>
          Effect.gen(function* () {
            const unit = yield* reader
              .table('residentialUnits')
              .get(membership.residentialUnitId)
              .pipe(
                Effect.catchTags({
                  GetByIdFailure: Effect.die,
                  DocumentDecodeError: Effect.die,
                })
              );

            const apartment = Predicate.isUndefined(membership.apartmentId)
              ? null
              : yield* reader
                  .table('apartments')
                  .get(membership.apartmentId)
                  .pipe(
                    Effect.catchTags({
                      GetByIdFailure: Effect.die,
                      DocumentDecodeError: Effect.die,
                    })
                  );

            return {
              membershipId: membership._id,
              role: membership.role,
              residentialUnitId: unit._id,
              residentialUnitName: unit.name,
              residentialUnitTimeZone: unit.timeZone,
              apartmentId: membership.apartmentId,
              apartmentLabel: Predicate.isNull(apartment)
                ? undefined
                : ResidentialUnits.formatApartmentLabel(apartment),
              occupancyType: membership.occupancyType,
            };
          }),
        { concurrency: 'unbounded' }
      );

      return { memberships: summaries, isSuperadmin };
    })
);

/**
 * Answers 0 until the WorkOS webhook has synced the caller; that sync
 * activates the Membresías pendientes itself.
 */
const activatePendingImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'activatePending',
  () =>
    Effect.gen(function* () {
      const identity = yield* Authentication.CurrentUserIdentity;

      const user = yield* Users.getOneByIdentityTokenIdentifier(
        identity.tokenIdentifier
      ).pipe(Users.isActiveOrNull);

      if (Predicate.isNull(user)) return 0;

      return yield* Memberships.activatePendingForUser(user);
    })
);

const listForUnitImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'listForUnit',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['administrator']
      );

      const membershipsWithRole = (role: Memberships.Role) =>
        reader
          .table('memberships')
          .index(
            'by_residentialUnitId_and_role',
            (q) =>
              q
                .eq('residentialUnitId', membership.residentialUnitId)
                .eq('role', role),
            'desc'
          )
          .take(MEMBERSHIPS_PER_ROLE_LIMIT);

      const [administrators, porters, residents, apartments] =
        yield* Effect.all(
          [
            membershipsWithRole('administrator'),
            membershipsWithRole('porter'),
            membershipsWithRole('resident'),
            reader
              .table('apartments')
              .index('by_residentialUnitId_and_tower_and_number', (q) =>
                q.eq('residentialUnitId', membership.residentialUnitId)
              )
              .take(APARTMENTS_PER_UNIT_LIMIT),
          ],
          { concurrency: 'unbounded' }
        ).pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

      const apartmentLabels = new Map(
        apartments.map((apartment) => [
          apartment._id,
          ResidentialUnits.formatApartmentLabel(apartment),
        ])
      );

      return yield* Effect.forEach(
        [...administrators, ...porters, ...residents],
        (member) =>
          Effect.gen(function* () {
            const user = Predicate.isUndefined(member.userId)
              ? null
              : yield* Users.getOneById(member.userId);

            // The signed-in Usuario's name, else the name the Administrador typed.
            const userName = Predicate.isNull(user)
              ? ''
              : [user.firstName, user.lastName]
                  .filter(Predicate.isNotNull)
                  .join(' ')
                  .trim();

            return {
              _id: member._id,
              _creationTime: member._creationTime,
              email: member.email,
              name: userName.length > 0 ? userName : member.displayName,
              role: member.role,
              status: member.status,
              apartmentId: member.apartmentId,
              apartmentLabel: Predicate.isUndefined(member.apartmentId)
                ? undefined
                : apartmentLabels.get(member.apartmentId),
              occupancyType: member.occupancyType,
              activatedAt: member.activatedAt,
            };
          }),
        { concurrency: 'unbounded' }
      );
    })
);

const inviteImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'invite',
  ({ membershipId, ...invitation }) =>
    Effect.gen(function* () {
      const { membership } = yield* Memberships.requireMembership(
        membershipId,
        ['administrator']
      );

      return yield* Memberships.inviteMember(
        membership.residentialUnitId,
        invitation
      );
    })
);

/** Revoking twice is a no-op, so a double click never fails. */
const revokeImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'revoke',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const writer = yield* DatabaseWriter;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['administrator']
      );

      const target = yield* reader
        .table('memberships')
        .get(args.targetMembershipId)
        .pipe(
          Effect.catchTags({
            GetByIdFailure: () => Effect.succeed(null),
            DocumentDecodeError: Effect.die,
          })
        );

      const isTargetInUnit =
        Predicate.isNotNull(target) &&
        target.residentialUnitId === membership.residentialUnitId;
      if (!isTargetInUnit)
        return yield* new Memberships.MembershipNotFoundError();

      if (target._id === membership._id)
        return yield* new Memberships.CannotRevokeOwnMembershipError();

      if (target.status === 'revoked') return null;

      const now = yield* Clock.currentTimeMillis;

      yield* writer
        .table('memberships')
        .patch(target._id, { status: 'revoked', revokedAt: now })
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );

      return null;
    })
);

// -*******************************************************************************-
// API
// -*******************************************************************************-

export default GroupImpl.make(databaseSchema, membershipsSpec).pipe(
  Layer.provide(listMineImpl),
  Layer.provide(activatePendingImpl),
  Layer.provide(listForUnitImpl),
  Layer.provide(inviteImpl),
  Layer.provide(revokeImpl),
  Layer.provide(RequireUserIdentity),
  GroupImpl.finalize
);
