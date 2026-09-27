import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';

import type { UsersDoc } from '../../../_generated/docs';
import { DatabaseReader, DatabaseWriter } from '../../../_generated/services';

/** Enough for the pending invitations one email can accumulate. */
const PENDING_PER_EMAIL_LIMIT = 100;

/** A Usuario belongs to a handful of units; this bounds a runaway account. */
const MEMBERSHIPS_PER_USER_LIMIT = 100;

/**
 * Activates every Membresía pendiente invited under `user.email` and links it
 * to `user`. A pending row that repeats a Membresía the Usuario already holds
 * active (same unit, Rol and Apartamento, e.g. stored under an email they
 * changed away from) is revoked instead, so it never activates twice.
 * Idempotent: answers how many it activated, 0 once none remain.
 * Runs on sign-in and whenever the WorkOS webhook syncs the Usuario.
 */
export const activatePendingForUser = Effect.fn(
  'Memberships.activatePendingForUser'
)(function* (user: Pick<UsersDoc, '_id' | 'email'>) {
  const reader = yield* DatabaseReader;
  const writer = yield* DatabaseWriter;

  const [pendingMemberships, userMemberships] = yield* Effect.all(
    [
      reader
        .table('memberships')
        .index('by_email_and_status', (q) =>
          q.eq('email', user.email).eq('status', 'pending')
        )
        .take(PENDING_PER_EMAIL_LIMIT),
      reader
        .table('memberships')
        .index('by_userId', (q) => q.eq('userId', user._id))
        .take(MEMBERSHIPS_PER_USER_LIMIT),
    ],
    { concurrency: 'unbounded' }
  ).pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

  const activeUserMemberships = userMemberships.filter(
    (membership) => membership.status === 'active'
  );

  const now = yield* Clock.currentTimeMillis;

  const activatedCounts = yield* Effect.forEach(
    pendingMemberships,
    (membership) => {
      const isDuplicate = activeUserMemberships.some(
        (active) =>
          active.residentialUnitId === membership.residentialUnitId &&
          active.role === membership.role &&
          active.apartmentId === membership.apartmentId
      );

      return writer
        .table('memberships')
        .patch(
          membership._id,
          isDuplicate
            ? { status: 'revoked', revokedAt: now }
            : { status: 'active', userId: user._id, activatedAt: now }
        )
        .pipe(
          Effect.as(isDuplicate ? 0 : 1),
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );
    },
    { concurrency: 'unbounded' }
  );

  return activatedCounts.reduce((total, count) => total + count, 0);
});

/**
 * Rewrites `email` on every Membresía linked to `user` that still carries an
 * earlier address, so the Administrador sees the current one and the old
 * address is free to invite again. Idempotent: answers how many it rewrote.
 * Runs whenever the WorkOS webhook syncs the Usuario.
 */
export const syncEmailForUser = Effect.fn('Memberships.syncEmailForUser')(
  function* (user: Pick<UsersDoc, '_id' | 'email'>) {
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;

    const userMemberships = yield* reader
      .table('memberships')
      .index('by_userId', (q) => q.eq('userId', user._id))
      .take(MEMBERSHIPS_PER_USER_LIMIT)
      .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

    const staleMemberships = userMemberships.filter(
      (membership) => membership.email !== user.email
    );

    yield* Effect.forEach(
      staleMemberships,
      (membership) =>
        writer
          .table('memberships')
          .patch(membership._id, { email: user.email })
          .pipe(
            Effect.catchTag(
              ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
              Effect.die
            )
          ),
      { concurrency: 'unbounded', discard: true }
    );

    return staleMemberships.length;
  }
);
