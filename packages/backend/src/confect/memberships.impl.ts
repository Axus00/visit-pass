import { FunctionImpl, GroupImpl } from '@confect/server';
import * as Clock from 'effect/Clock';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';
import * as Schedule from 'effect/Schedule';

import { env } from '#convex/_generated/server';

import refs from './_generated/refs';
import databaseSchema from './_generated/schema';
import { Auth, DatabaseWriter, QueryRunner } from './_generated/services';
import {
  handleInvitationDeliveryComplete,
  invitationDeliveryWorkflow,
  sendInvitationEmail,
  startInvitationDelivery,
} from './memberships';
import membershipsSpec from './memberships.spec';
import RequireUnitMembership from './middleware/RequireUnitMembership.impl';
import RequireUserIdentity from './middleware/RequireUserIdentity.impl';
import * as Apartments from './modules/apartments';
import * as Authentication from './modules/authentication';
import * as CommonErrors from './modules/commonErrors';
import * as Memberships from './modules/memberships';
import * as ResidentialUnits from './modules/residentialUnits';
import * as Users from './modules/users';
import * as WorkOS from './modules/workos';

/** WorkOS calls fail transiently often enough to try again before giving up. */
const externalRetry = {
  times: 2,
  schedule: Schedule.exponential(Duration.millis(500)),
};

// -*******************************************************************************-
// Public: any signed-in Usuario
// -*******************************************************************************-

const myAccessImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'myAccess',
  () =>
    Effect.gen(function* () {
      const identity = yield* Authentication.CurrentUserIdentity;

      const user = yield* Users.getOneByIdentityTokenIdentifier(
        identity.tokenIdentifier
      ).pipe(Users.isActiveOrNull);

      if (Predicate.isNull(user)) return null;

      const [active, pending] = yield* Effect.all(
        [
          Memberships.listActiveByUser(user._id),
          Memberships.listPendingByEmail(user.email),
        ],
        { concurrency: 'unbounded' }
      );

      const memberships = [...active, ...pending];
      const unitIds = [
        ...new Set(
          memberships.map(({ residentialUnitId }) => residentialUnitId)
        ),
      ];
      const apartmentIds = [
        ...new Set(
          memberships
            .map(({ apartmentId }) => apartmentId)
            .filter(Predicate.isNotUndefined)
        ),
      ];

      const [units, apartments] = yield* Effect.all(
        [
          Effect.forEach(unitIds, ResidentialUnits.getOneById, {
            concurrency: 'unbounded',
          }),
          Effect.forEach(apartmentIds, Apartments.getOneById, {
            concurrency: 'unbounded',
          }),
        ],
        { concurrency: 'unbounded' }
      );

      const presentUnits = units.filter(Predicate.isNotNull);
      const toApartmentLabel = (
        apartmentId: (typeof memberships)[number]['apartmentId']
      ) => {
        const apartment = apartments.find(
          (candidate) => candidate?._id === apartmentId
        );

        return Predicate.isNullish(apartment)
          ? null
          : { grouping: apartment.grouping, number: apartment.number };
      };

      return {
        email: user.email,
        units: presentUnits
          .map((residentialUnit) => ({
            residentialUnit,
            memberships: active
              .filter(
                (membership) =>
                  membership.residentialUnitId === residentialUnit._id
              )
              .map((membership) => ({
                _id: membership._id,
                role: membership.role,
                apartment: toApartmentLabel(membership.apartmentId),
              })),
          }))
          .filter((unit) => unit.memberships.length > 0),
        pendingInvitations: pending.flatMap((membership) => {
          const residentialUnit = presentUnits.find(
            (unit) => unit._id === membership.residentialUnitId
          );

          return Predicate.isUndefined(residentialUnit)
            ? []
            : [
                {
                  _id: membership._id,
                  role: membership.role,
                  apartment: toApartmentLabel(membership.apartmentId),
                  residentialUnit: {
                    name: residentialUnit.name,
                    groupingWord: residentialUnit.groupingWord,
                  },
                  invitationExpiresAt: membership.invitationExpiresAt,
                },
              ];
        }),
      };
    })
);

const acceptImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'accept',
  (args) =>
    Effect.gen(function* () {
      const identity = yield* Authentication.CurrentUserIdentity;
      const writer = yield* DatabaseWriter;

      const [user, membership] = yield* Effect.all(
        [
          Users.getOneByIdentityTokenIdentifier(identity.tokenIdentifier).pipe(
            Users.isActiveOrNull
          ),
          Memberships.getOneById(args.membershipId),
        ],
        { concurrency: 'unbounded' }
      );

      // The session's email must be the invited one; anything else looks absent.
      const canAnswer =
        Predicate.isNotNull(user) &&
        Predicate.isNotNull(membership) &&
        membership.status === 'pending' &&
        membership.email === user.email;

      if (!canAnswer) return yield* new Memberships.InvitationNotFoundError();

      if (!user.emailVerified)
        return yield* new Memberships.EmailNotVerifiedError();

      const now = yield* Clock.currentTimeMillis;

      if (Memberships.isInvitationExpired(membership, now))
        return yield* new Memberships.InvitationExpiredError();

      yield* writer
        .table('memberships')
        .patch(membership._id, {
          status: 'active',
          userId: user._id,
          acceptedAt: now,
          externalInvitationId: undefined,
        })
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );

      yield* Memberships.scheduleUnitAccessSync({
        userId: user._id,
        residentialUnitId: membership.residentialUnitId,
        releasedExternalInvitationId: membership.externalInvitationId,
      });

      return null;
    })
);

const rejectImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'reject',
  (args) =>
    Effect.gen(function* () {
      const identity = yield* Authentication.CurrentUserIdentity;
      const writer = yield* DatabaseWriter;

      const [user, membership] = yield* Effect.all(
        [
          Users.getOneByIdentityTokenIdentifier(identity.tokenIdentifier).pipe(
            Users.isActiveOrNull
          ),
          Memberships.getOneById(args.membershipId),
        ],
        { concurrency: 'unbounded' }
      );

      const canAnswer =
        Predicate.isNotNull(user) &&
        Predicate.isNotNull(membership) &&
        membership.status === 'pending' &&
        membership.email === user.email;

      if (!canAnswer) return yield* new Memberships.InvitationNotFoundError();

      yield* writer
        .table('memberships')
        .patch(membership._id, {
          status: 'rejected',
          rejectedAt: yield* Clock.currentTimeMillis,
          externalInvitationId: undefined,
        })
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );

      yield* Memberships.scheduleUnitAccessSync({
        userId: user._id,
        residentialUnitId: membership.residentialUnitId,
        releasedExternalInvitationId: membership.externalInvitationId,
      });

      return null;
    })
);

const ensureUnitAccessImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'ensureUnitAccess',
  (args) =>
    Effect.gen(function* () {
      const auth = yield* Auth;
      const queryRunner = yield* QueryRunner;

      const identity = yield* auth.getUserIdentity.pipe(
        Effect.mapError(() => new Authentication.NoUserIdentityFoundError())
      );

      const user = yield* queryRunner(
        refs.internal.users.getOneByIdentityTokenIdentifier,
        { identityTokenIdentifier: identity.tokenIdentifier }
      ).pipe(Effect.catchTag('SchemaError', Effect.die));

      if (Predicate.isNull(user))
        return yield* new Memberships.MembershipRequiredError();

      const target = yield* queryRunner(
        refs.internal.memberships.getUnitAccessTarget,
        { userId: user._id, residentialUnitId: args.residentialUnitId }
      ).pipe(Effect.catchTag('SchemaError', Effect.die));

      const hasActiveMembership =
        Predicate.isNotNull(target) && target.roles.length > 0;

      if (!hasActiveMembership)
        return yield* new Memberships.MembershipRequiredError();

      yield* Memberships.reconcileUnitAccess(target).pipe(
        Effect.retry(externalRetry),
        Effect.provide(WorkOS.workOSLayer),
        CommonErrors.orExternalProviderError('Could not sync WorkOS access')
      );

      return target.externalOrganizationId;
    })
);

// -*******************************************************************************-
// Public: the Administrador of the active Unidad residencial
// -*******************************************************************************-

const listImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'list',
  () =>
    Effect.gen(function* () {
      const { residentialUnit } =
        yield* Memberships.requireRole('administrator');

      const [memberships, apartments] = yield* Effect.all(
        [
          Memberships.listByUnit(residentialUnit._id),
          Apartments.listByUnit(residentialUnit._id),
        ],
        { concurrency: 'unbounded' }
      );
      const apartmentsById = new Map(
        apartments.map((apartment) => [apartment._id, apartment] as const)
      );

      return memberships.map((membership) => {
        const apartment = Predicate.isUndefined(membership.apartmentId)
          ? undefined
          : apartmentsById.get(membership.apartmentId);

        return {
          _id: membership._id,
          role: membership.role,
          occupancyType: membership.occupancyType,
          name: membership.name,
          email: membership.email,
          status: membership.status,
          invitedAt: membership.invitedAt,
          invitationExpiresAt: membership.invitationExpiresAt,
          invitationDelivery: membership.invitationDelivery,
          acceptedAt: membership.acceptedAt,
          revokedAt: membership.revokedAt,
          apartment: Predicate.isUndefined(apartment)
            ? null
            : { grouping: apartment.grouping, number: apartment.number },
        };
      });
    })
);

const inviteImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'invite',
  (args) =>
    Effect.gen(function* () {
      const { residentialUnit, membership } =
        yield* Memberships.requireRole('administrator');

      return yield* Memberships.inviteMembership({
        residentialUnitId: residentialUnit._id,
        dto: args,
        invitedByMembershipId: membership._id,
      });
    })
);

const resendInvitationImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'resendInvitation',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const { residentialUnit } =
        yield* Memberships.requireRole('administrator');

      const target = yield* Memberships.getOneInUnit(
        args.membershipId,
        residentialUnit._id
      );

      if (target.status !== 'pending')
        return yield* new Memberships.MembershipNotFoundError();

      const now = yield* Clock.currentTimeMillis;

      // WorkOS never extends a link's life, so only an expired one is renewed.
      const invitationExpiresAt = Memberships.isInvitationExpired(target, now)
        ? now + Duration.toMillis(Memberships.INVITATION_VALIDITY)
        : target.invitationExpiresAt;

      yield* writer
        .table('memberships')
        .patch(target._id, {
          invitationExpiresAt,
          invitationDelivery: 'sending',
        })
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );

      yield* Memberships.scheduleInvitationDelivery(target._id);

      return null;
    })
);

const withdrawInvitationImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'withdrawInvitation',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const { residentialUnit } =
        yield* Memberships.requireRole('administrator');

      const target = yield* Memberships.getOneInUnit(
        args.membershipId,
        residentialUnit._id
      );

      if (target.status !== 'pending')
        return yield* new Memberships.MembershipNotFoundError();

      yield* writer
        .table('memberships')
        .patch(target._id, {
          status: 'withdrawn',
          withdrawnAt: yield* Clock.currentTimeMillis,
          externalInvitationId: undefined,
        })
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );

      const invitedUser = yield* Users.getOneByEmail(target.email).pipe(
        Users.isActiveOrNull
      );

      // Someone who followed the WorkOS link may already hold access to drop.
      if (Predicate.isNull(invitedUser)) {
        yield* Memberships.scheduleExternalInvitationRelease(
          target.externalInvitationId
        );
        return null;
      }

      yield* Memberships.scheduleUnitAccessSync({
        userId: invitedUser._id,
        residentialUnitId: residentialUnit._id,
        releasedExternalInvitationId: target.externalInvitationId,
      });

      return null;
    })
);

const revokeImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'revoke',
  (args) =>
    Effect.gen(function* () {
      const { residentialUnit, membership } =
        yield* Memberships.requireRole('administrator');

      const target = yield* Memberships.getOneInUnit(
        args.membershipId,
        residentialUnit._id
      );

      if (target.status !== 'active')
        return yield* new Memberships.MembershipNotFoundError();

      if (target._id === membership._id)
        return yield* new Memberships.CannotRevokeOwnMembershipError();

      yield* Memberships.revokeMembership({
        membership: target,
        revokedByMembershipId: membership._id,
      });

      return null;
    })
);

const updateOccupancyTypeImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'updateOccupancyType',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const { residentialUnit } =
        yield* Memberships.requireRole('administrator');

      const target = yield* Memberships.getOneInUnit(
        args.membershipId,
        residentialUnit._id
      );

      const isEditableResident =
        target.role === 'resident' &&
        (target.status === 'pending' || target.status === 'active');

      if (!isEditableResident)
        return yield* new Memberships.MembershipNotFoundError();

      yield* writer
        .table('memberships')
        .patch(target._id, { occupancyType: args.occupancyType })
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
// Internal: WorkOS access
// -*******************************************************************************-

const getUnitAccessTargetImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'getUnitAccessTarget',
  (args) => Memberships.loadUnitAccessTarget(args)
);

const syncUnitAccessImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'syncUnitAccess',
  (args) =>
    Effect.gen(function* () {
      const queryRunner = yield* QueryRunner;

      const target = yield* queryRunner(
        refs.internal.memberships.getUnitAccessTarget,
        { userId: args.userId, residentialUnitId: args.residentialUnitId }
      ).pipe(Effect.catchTag('SchemaError', Effect.die));

      yield* Effect.gen(function* () {
        const workos = yield* WorkOS.WorkOSService;

        if (Predicate.isNotUndefined(args.releasedExternalInvitationId))
          yield* workos.invitations.revoke({
            externalInvitationId: args.releasedExternalInvitationId,
          });

        if (Predicate.isNotNull(target))
          yield* Memberships.reconcileUnitAccess(target);
      }).pipe(
        Effect.retry(externalRetry),
        Effect.provide(WorkOS.workOSLayer),
        CommonErrors.orExternalProviderError('Could not sync WorkOS access')
      );

      return null;
    })
);

const handleExternalMembershipChangeImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'handleExternalMembershipChange',
  (args) =>
    Effect.gen(function* () {
      const [user, residentialUnit] = yield* Effect.all(
        [
          Users.getOneByExternalId(args.externalUserId).pipe(
            Users.isActiveOrNull
          ),
          ResidentialUnits.getOneByExternalOrganizationId(
            args.externalOrganizationId
          ),
        ],
        { concurrency: 'unbounded' }
      );

      const isUnknownPair =
        Predicate.isNull(user) || Predicate.isNull(residentialUnit);
      if (isUnknownPair) return null;

      const target = yield* Memberships.loadUnitAccessTarget({
        userId: user._id,
        residentialUnitId: residentialUnit._id,
      });
      if (Predicate.isNull(target)) return null;

      // Only access is put back. Role drift is left alone: authorization never
      // reads the claim, and rewriting roles from their own event would loop.
      const shouldHaveAccess = target.roles.length > 0;
      const hasDrifted = shouldHaveAccess
        ? !args.hasAccess
        : args.hasAccess && !target.hasPendingInvitation;

      if (!hasDrifted) return null;

      yield* Memberships.scheduleUnitAccessSync({
        userId: user._id,
        residentialUnitId: residentialUnit._id,
      });

      return null;
    })
);

// -*******************************************************************************-
// Internal: Invitación delivery
// -*******************************************************************************-

const getInvitationDeliveryTargetImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'getInvitationDeliveryTarget',
  (args) =>
    Effect.gen(function* () {
      const membership = yield* Memberships.getOneById(args.membershipId);

      const isPending =
        Predicate.isNotNull(membership) && membership.status === 'pending';
      if (!isPending) return null;

      const residentialUnit = yield* ResidentialUnits.getOneById(
        membership.residentialUnitId
      );
      if (Predicate.isNull(residentialUnit)) return null;

      return {
        email: membership.email,
        externalOrganizationId: residentialUnit.externalOrganizationId,
        externalInvitationId: membership.externalInvitationId ?? null,
      };
    })
);

const prepareExternalInvitationImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'prepareExternalInvitation',
  (args) =>
    Effect.gen(function* () {
      const queryRunner = yield* QueryRunner;

      const target = yield* queryRunner(
        refs.internal.memberships.getInvitationDeliveryTarget,
        { membershipId: args.membershipId }
      ).pipe(Effect.catchTag('SchemaError', Effect.die));

      if (Predicate.isNull(target)) return null;

      const invitation = yield* Effect.gen(function* () {
        const workos = yield* WorkOS.WorkOSService;

        const existing = Predicate.isNull(target.externalInvitationId)
          ? null
          : yield* workos.invitations.getOne({
              externalInvitationId: target.externalInvitationId,
            });

        const isReusable =
          Predicate.isNotNull(existing) && existing.state === 'pending';
        if (isReusable) return existing;

        return yield* workos.invitations.send({
          email: target.email,
          externalOrganizationId: target.externalOrganizationId,
          expiresInDays: Memberships.INVITATION_VALIDITY_DAYS,
        });
      }).pipe(
        Effect.retry(externalRetry),
        Effect.provide(WorkOS.workOSLayer),
        CommonErrors.orExternalProviderError(
          'Could not prepare the WorkOS invitation'
        )
      );

      return Predicate.isNull(invitation)
        ? null
        : {
            externalInvitationId: invitation.id,
            acceptInvitationUrl: invitation.acceptInvitationUrl,
          };
    })
);

const recordExternalInvitationImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'recordExternalInvitation',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const membership = yield* Memberships.getOneById(args.membershipId);

      const isPending =
        Predicate.isNotNull(membership) && membership.status === 'pending';
      if (!isPending) return null;

      const [residentialUnit, apartment] = yield* Effect.all(
        [
          ResidentialUnits.getOneById(membership.residentialUnitId),
          Predicate.isUndefined(membership.apartmentId)
            ? Effect.succeed(null)
            : Apartments.getOneById(membership.apartmentId),
        ],
        { concurrency: 'unbounded' }
      );
      if (Predicate.isNull(residentialUnit)) return null;

      yield* writer
        .table('memberships')
        .patch(membership._id, {
          externalInvitationId: args.externalInvitation?.externalInvitationId,
        })
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );

      const appUrl = env.APP_URL;

      if (Predicate.isUndefined(appUrl)) {
        yield* Effect.logWarning(
          '[recordExternalInvitation] APP_URL is unset; the Invitación was not emailed'
        );
        return null;
      }

      return Memberships.renderInvitationEmail({
        to: membership.email,
        name: membership.name,
        unitName: residentialUnit.name,
        groupingWord: residentialUnit.groupingWord,
        role: membership.role,
        apartment: Predicate.isNull(apartment)
          ? null
          : { grouping: apartment.grouping, number: apartment.number },
        acceptUrl:
          args.externalInvitation?.acceptInvitationUrl ?? `${appUrl}/app`,
        privacyPolicyUrl: `${appUrl}/privacidad/${residentialUnit.slug}`,
      });
    })
);

const terminalizeInvitationDeliveryImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'terminalizeInvitationDelivery',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const membership = yield* Memberships.getOneById(args.membershipId);

      const isPending =
        Predicate.isNotNull(membership) && membership.status === 'pending';
      if (!isPending) return null;

      yield* writer
        .table('memberships')
        .patch(membership._id, { invitationDelivery: args.outcome })
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );

      return null;
    })
);

const releaseExternalInvitationImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'releaseExternalInvitation',
  (args) =>
    Effect.gen(function* () {
      const workos = yield* WorkOS.WorkOSService;

      yield* workos.invitations.revoke({
        externalInvitationId: args.externalInvitationId,
      });

      return null;
    }).pipe(
      Effect.retry(externalRetry),
      Effect.provide(WorkOS.workOSLayer),
      CommonErrors.orExternalProviderError(
        'Could not revoke the WorkOS invitation'
      )
    )
);

const detachExternalInvitationImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'detachExternalInvitation',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const membership = yield* Memberships.getOneByExternalInvitationId(
        args.externalInvitationId
      );
      if (Predicate.isNull(membership)) return null;

      yield* writer
        .table('memberships')
        .patch(membership._id, { externalInvitationId: undefined })
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );

      return null;
    })
);

const invitationDeliveryWorkflowImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'invitationDeliveryWorkflow',
  invitationDeliveryWorkflow
);

const startInvitationDeliveryImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'startInvitationDelivery',
  startInvitationDelivery
);

const handleInvitationDeliveryCompleteImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'handleInvitationDeliveryComplete',
  handleInvitationDeliveryComplete
);

const sendInvitationEmailImpl = FunctionImpl.make(
  databaseSchema,
  membershipsSpec,
  'sendInvitationEmail',
  sendInvitationEmail
);

// -*******************************************************************************-
// API
// -*******************************************************************************-

export default GroupImpl.make(databaseSchema, membershipsSpec)
  .pipe(
    Layer.provide(myAccessImpl),
    Layer.provide(acceptImpl),
    Layer.provide(rejectImpl),
    Layer.provide(ensureUnitAccessImpl),
    Layer.provide(listImpl),
    Layer.provide(inviteImpl),
    Layer.provide(resendInvitationImpl),
    Layer.provide(withdrawInvitationImpl),
    Layer.provide(revokeImpl),
    Layer.provide(updateOccupancyTypeImpl)
  )
  .pipe(
    Layer.provide(getUnitAccessTargetImpl),
    Layer.provide(syncUnitAccessImpl),
    Layer.provide(handleExternalMembershipChangeImpl),
    Layer.provide(getInvitationDeliveryTargetImpl),
    Layer.provide(prepareExternalInvitationImpl),
    Layer.provide(recordExternalInvitationImpl),
    Layer.provide(terminalizeInvitationDeliveryImpl),
    Layer.provide(releaseExternalInvitationImpl),
    Layer.provide(detachExternalInvitationImpl),
    Layer.provide(invitationDeliveryWorkflowImpl),
    Layer.provide(startInvitationDeliveryImpl),
    Layer.provide(handleInvitationDeliveryCompleteImpl),
    Layer.provide(sendInvitationEmailImpl),
    Layer.provide(RequireUserIdentity),
    Layer.provide(RequireUnitMembership),

    GroupImpl.finalize
  );
