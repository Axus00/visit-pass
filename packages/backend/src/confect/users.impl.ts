import { FunctionImpl, GroupImpl } from '@confect/server';
import * as Clock from 'effect/Clock';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';

import refs from './_generated/refs';
import databaseSchema from './_generated/schema';
import {
  DatabaseReader,
  DatabaseWriter,
  Scheduler,
} from './_generated/services';
import RequireUserIdentity from './middleware/RequireUserIdentity.impl';
import * as Authentication from './modules/authentication';
import * as Memberships from './modules/memberships';
import * as Users from './modules/users';
import * as WorkOS from './modules/workos';
import usersSpec from './users.spec';

/** A Usuario belongs to a handful of units; this bounds a runaway account. */
const MEMBERSHIPS_PER_USER_LIMIT = 100;

// -*******************************************************************************-
// Public
// -*******************************************************************************-

/** Answers null until the WorkOS webhook has synced the signed-in person. */
const meImpl = FunctionImpl.make(databaseSchema, usersSpec, 'me', () =>
  Effect.gen(function* () {
    const identity = yield* Authentication.CurrentUserIdentity;

    return yield* Users.getOneByIdentityTokenIdentifier(
      identity.tokenIdentifier
    ).pipe(Users.isActiveOrNull);
  })
);

// -*******************************************************************************-
// Internal
// -*******************************************************************************-

const getOneByIdentityTokenIdentifierImpl = FunctionImpl.make(
  databaseSchema,
  usersSpec,
  'getOneByIdentityTokenIdentifier',
  (args) => Users.getOneByIdentityTokenIdentifier(args.identityTokenIdentifier)
);

const getOneByExternalIdImpl = FunctionImpl.make(
  databaseSchema,
  usersSpec,
  'getOneByExternalId',
  (args) => Users.getOneByExternalId(args.externalId)
);

/**
 * Also activates the synced email's Membresías pendientes, so an invitation
 * works even when the person signed in before this webhook arrived, and moves
 * the Usuario's Membresías onto a changed email.
 */
const upsertFromWorkOSImpl = FunctionImpl.make(
  databaseSchema,
  usersSpec,
  'upsertFromWorkOS',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const writer = yield* DatabaseWriter;
      const scheduler = yield* Scheduler;

      const [userByExternalId, userByEmail] = yield* Effect.all(
        [
          Users.getOneByExternalId(args.workosUser.id),
          Users.getOneByEmail(args.workosUser.email),
        ],
        { concurrency: 'unbounded' }
      );

      const matchedUserIds = [
        ...new Set(
          [userByExternalId, userByEmail]
            .filter(Predicate.isNotNull)
            .map(({ _id }) => _id)
        ),
      ];
      if (matchedUserIds.length > 1) {
        return yield* new Users.IdentityConflictError({
          externalUserId: args.workosUser.id,
          email: args.workosUser.email,
        });
      }

      const createUserDto = yield* WorkOS.toUserDoc(args.workosUser).pipe(
        Effect.catchTag('SchemaError', (err) =>
          Effect.gen(function* () {
            yield* scheduler.runAfter(
              Duration.seconds(0),
              refs.internal.users.notifyInvalidWorkOSUserSchema,
              {
                message: 'WorkOS user schema is invalid',
                serializedError: err.message,
              }
            );
            return yield* Effect.die(err);
          })
        )
      );

      const targetUser = userByExternalId ?? userByEmail;

      if (Predicate.isNull(targetUser)) {
        const createdUserId = yield* writer
          .table('users')
          .insert(createUserDto)
          .pipe(Effect.catchTag('DocumentEncodeError', Effect.die));

        const createdUser = yield* Users.getOneById(createdUserId).pipe(
          Effect.andThen((user) => Effect.fromNullishOr(user)),
          Effect.catchTag('NoSuchElementError', Effect.die)
        );

        yield* Memberships.activatePendingForUser(createdUser);

        return createdUser;
      }

      yield* writer
        .table('users')
        .patch(targetUser._id, { ...createUserDto, deletedAt: undefined })
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );

      const reactivatedUser = yield* Users.getOneById(targetUser._id).pipe(
        Effect.andThen((user) => Effect.fromNullishOr(user)),
        Effect.catchTag('NoSuchElementError', Effect.die)
      );

      yield* Effect.all(
        [
          // Moves the Membresías still under an earlier email onto the current
          // one, so the Administrador sees it and the old address is free to
          // invite again. A revoked row keeps the email it left with, so a
          // unit never follows a departed person's new address.
          Effect.gen(function* () {
            const userMemberships = yield* reader
              .table('memberships')
              .index('by_userId', (q) => q.eq('userId', reactivatedUser._id))
              .take(MEMBERSHIPS_PER_USER_LIMIT)
              .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

            yield* Effect.forEach(
              userMemberships.filter(
                (membership) =>
                  membership.status !== 'revoked' &&
                  membership.email !== reactivatedUser.email
              ),
              (membership) =>
                writer
                  .table('memberships')
                  .patch(membership._id, { email: reactivatedUser.email })
                  .pipe(
                    Effect.catchTag(
                      [
                        'GetByIdFailure',
                        'DocumentDecodeError',
                        'DocumentEncodeError',
                      ],
                      Effect.die
                    )
                  ),
              { concurrency: 'unbounded', discard: true }
            );
          }),
          Memberships.activatePendingForUser(reactivatedUser),
        ],
        { concurrency: 'unbounded' }
      );

      return reactivatedUser;
    })
);

const softDeleteByExternalIdImpl = FunctionImpl.make(
  databaseSchema,
  usersSpec,
  'softDeleteByExternalId',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const user = yield* Users.getOneByExternalId(args.externalId).pipe(
        Users.isActiveOrNull
      );
      if (Predicate.isNull(user)) return false as const;

      const now = yield* Clock.currentTimeMillis;

      yield* writer
        .table('users')
        .patch(user._id, { deletedAt: now })
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );

      return user._id;
    })
);

const notifyInvalidWorkOSUserSchemaImpl = FunctionImpl.make(
  databaseSchema,
  usersSpec,
  'notifyInvalidWorkOSUserSchema',
  (args) =>
    Effect.logError(
      `[notifyInvalidWorkOSUserSchema] ${args.message}`,
      args.serializedError
    ).pipe(Effect.as(null))
);

// -*******************************************************************************-
// API
// -*******************************************************************************-

export default GroupImpl.make(databaseSchema, usersSpec).pipe(
  Layer.provide(meImpl),
  Layer.provide(getOneByIdentityTokenIdentifierImpl),
  Layer.provide(getOneByExternalIdImpl),
  Layer.provide(upsertFromWorkOSImpl),
  Layer.provide(softDeleteByExternalIdImpl),
  Layer.provide(notifyInvalidWorkOSUserSchemaImpl),
  Layer.provide(RequireUserIdentity),

  GroupImpl.finalize
);
