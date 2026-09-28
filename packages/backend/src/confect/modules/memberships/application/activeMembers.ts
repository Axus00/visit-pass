import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import type { MembershipsDoc } from '../../../_generated/docs';
import * as UsersApplication from '../../users/application';
import * as UsersDomain from '../../users/domain';

/**
 * Keeps the active Membresías whose linked Usuario still exists and is not
 * deleted, in their original order: the members that count for the unit.
 * Use it wherever active Residentes or Porteros are counted or relied upon.
 */
export const filterActiveMembers = Effect.fn('Memberships.filterActiveMembers')(
  function* <M extends Pick<MembershipsDoc, 'status' | 'userId'>>(
    memberships: ReadonlyArray<M>
  ) {
    const keptMemberships = yield* Effect.forEach(
      memberships,
      (membership) => {
        const { userId } = membership;
        const isLinkedActiveMembership =
          membership.status === 'active' && Predicate.isNotUndefined(userId);
        if (!isLinkedActiveMembership) return Effect.succeed([]);

        return UsersApplication.getOneById(userId).pipe(
          UsersDomain.isActiveOrNull,
          Effect.map((user) => (Predicate.isNull(user) ? [] : [membership]))
        );
      },
      { concurrency: 'unbounded' }
    );

    return keptMemberships.flat();
  }
);
