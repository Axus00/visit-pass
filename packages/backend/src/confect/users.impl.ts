import { FunctionImpl, GroupImpl } from '@confect/server';
import * as Clock from 'effect/Clock';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';

import refs from './_generated/refs';
import databaseSchema from './_generated/schema';
import { DatabaseWriter, Scheduler } from './_generated/services';
import RequireUserIdentity from './middleware/RequireUserIdentity.impl';
import * as Authentication from './modules/authentication';
import * as Memberships from './modules/memberships';
import * as Users from './modules/users';
import * as WorkOS from './modules/workos';
import usersSpec from './users.spec';

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

const upsertFromWorkOSImpl = FunctionImpl.make(
  databaseSchema,
  usersSpec,
  'upsertFromWorkOS',
  (args) =>
    Effect.gen(function* () {
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

      // A deleted User keeps no external id or email, so neither lookup finds
      // it: the same person signing up again becomes a new User (ADR 0010).
      const targetUser = userByExternalId ?? userByEmail;

      const userId = Predicate.isNull(targetUser)
        ? yield* writer
            .table('users')
            .insert(createUserDto)
            .pipe(Effect.catchTag('DocumentEncodeError', Effect.die))
        : yield* writer
            .table('users')
            .replace(targetUser._id, createUserDto)
            .pipe(
              Effect.catchTag('DocumentEncodeError', Effect.die),
              Effect.as(targetUser._id)
            );

      return yield* Users.getOneById(userId).pipe(
        Users.isActiveOrNull,
        Effect.andThen((user) => Effect.fromNullishOr(user)),
        Effect.catchTag('NoSuchElementError', Effect.die)
      );
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
      if (!user) return false as const;

      // Replacing the row drops the name, email and WorkOS identifiers at once.
      yield* writer
        .table('users')
        .replace(user._id, { deletedAt: yield* Clock.currentTimeMillis })
        .pipe(Effect.catchTag('DocumentEncodeError', Effect.die));

      // A deleted identity keeps no access: every Membresía it held is revoked.
      const memberships = yield* Memberships.listActiveByUser(user._id);
      yield* Effect.forEach(
        memberships,
        (membership) => Memberships.revokeMembership({ membership }),
        { discard: true }
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
