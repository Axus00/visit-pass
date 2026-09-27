import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';

import type { UsersDoc } from '../../../_generated/docs';
import { DatabaseReader, DatabaseWriter } from '../../../_generated/services';

/** Enough for the pending invitations one email can accumulate. */
const PENDING_PER_EMAIL_LIMIT = 100;

/**
 * Activates every Membresía pendiente invited under `user.email` and links it
 * to `user`. Idempotent: answers how many it activated, 0 once none remain.
 * Runs on sign-in and whenever the WorkOS webhook syncs the Usuario.
 */
export const activatePendingForUser = Effect.fn(
  'Memberships.activatePendingForUser'
)(function* (user: Pick<UsersDoc, '_id' | 'email'>) {
  const reader = yield* DatabaseReader;
  const writer = yield* DatabaseWriter;

  const pendingMemberships = yield* reader
    .table('memberships')
    .index('by_email_and_status', (q) =>
      q.eq('email', user.email).eq('status', 'pending')
    )
    .take(PENDING_PER_EMAIL_LIMIT)
    .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

  const now = yield* Clock.currentTimeMillis;

  yield* Effect.forEach(
    pendingMemberships,
    (membership) =>
      writer
        .table('memberships')
        .patch(membership._id, {
          status: 'active',
          userId: user._id,
          activatedAt: now,
        })
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        ),
    { concurrency: 'unbounded', discard: true }
  );

  return pendingMemberships.length;
});
