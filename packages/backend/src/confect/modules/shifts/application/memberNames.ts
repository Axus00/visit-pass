import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import type { Id } from '#convex/_generated/dataModel';

import type { MembershipsDoc, UsersDoc } from '../../../_generated/docs';
import { DatabaseReader } from '../../../_generated/services';
import * as UsersApplication from '../../users/application';

/** The Usuario's full name, else the name the Administrador typed, else the email. */
function memberName(membership: MembershipsDoc, user: UsersDoc | undefined) {
  const userName = [user?.firstName, user?.lastName]
    .filter(Predicate.isNotNullish)
    .join(' ')
    .trim();

  if (userName.length > 0) return userName;

  return membership.displayName ?? membership.email;
}

/**
 * Names the Membresías behind Visitas, Turnos and Autorizaciones, loading each
 * Membresía and Usuario once. Unknown ids are left out of the map.
 */
export const loadMemberNames = Effect.fn('Shifts.loadMemberNames')(function* (
  membershipIds: Iterable<Id<'memberships'>>
) {
  const reader = yield* DatabaseReader;

  const memberships = yield* Effect.forEach(
    new Set(membershipIds),
    (membershipId) =>
      reader
        .table('memberships')
        .get(membershipId)
        .pipe(
          Effect.catchTags({
            GetByIdFailure: () => Effect.succeed(null),
            DocumentDecodeError: Effect.die,
          })
        ),
    { concurrency: 'unbounded' }
  ).pipe(Effect.map((loaded) => loaded.filter(Predicate.isNotNull)));

  const users = yield* Effect.forEach(
    new Set(
      memberships
        .map((membership) => membership.userId)
        .filter(Predicate.isNotUndefined)
    ),
    UsersApplication.getOneById,
    { concurrency: 'unbounded' }
  );

  const usersById = new Map(
    users.filter(Predicate.isNotNull).map((user) => [user._id, user])
  );

  return new Map(
    memberships.map((membership) => [
      membership._id,
      memberName(
        membership,
        Predicate.isUndefined(membership.userId)
          ? undefined
          : usersById.get(membership.userId)
      ),
    ])
  );
});
