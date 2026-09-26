import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import type { Id } from '#convex/_generated/dataModel';

import { DatabaseReader } from '../../../_generated/services';
import * as AuthenticationDomain from '../../authentication/domain';
import * as UsersApplication from '../../users/application';
import * as Domain from '../domain';

/**
 * The data-isolation boundary: resolves the caller's own active Membresía with
 * one of `roles`, or fails with `AccessDeniedError`. Every function scoped to
 * a Unidad residencial goes through it and then reads only rows of
 * `membership.residentialUnitId`.
 */
export const requireMembership = Effect.fn('Memberships.requireMembership')(
  function* (
    membershipId: Id<'memberships'>,
    roles: ReadonlyArray<Domain.Role>
  ) {
    const identity = yield* AuthenticationDomain.CurrentUserIdentity;
    const reader = yield* DatabaseReader;

    // Declared apart: inside the `Effect.all` array the catch would widen the
    // error channel to `any`.
    const membershipOrNull = reader
      .table('memberships')
      .get(membershipId)
      .pipe(
        Effect.catchTags({
          GetByIdFailure: () => Effect.succeed(null),
          DocumentDecodeError: Effect.die,
        })
      );

    const [user, membership] = yield* Effect.all(
      [
        UsersApplication.getOneByIdentityTokenIdentifier(
          identity.tokenIdentifier
        ),
        membershipOrNull,
      ],
      { concurrency: 'unbounded' }
    );

    const isAllowed =
      Predicate.isNotNull(user) &&
      Predicate.isUndefined(user.deletedAt) &&
      Predicate.isNotNull(membership) &&
      membership.userId === user._id &&
      membership.status === 'active' &&
      roles.includes(membership.role);

    if (!isAllowed) return yield* new Domain.AccessDeniedError();

    return { user, membership };
  }
);
