import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import type { Id } from '#convex/_generated/dataModel';

import { DatabaseReader } from '../../../_generated/services';
import * as CommonEmailAddressesDomain from '../../commonEmailAddresses/domain';
import * as Domain from '../domain';

// -*******************************************************************************-
// API
// -*******************************************************************************-

export const getOneById = Effect.fn('Memberships.getOneById')(function* (
  id: Id<'memberships'>
) {
  const reader = yield* DatabaseReader;

  return yield* reader
    .table('memberships')
    .get(id)
    .pipe(
      Effect.catchTags({
        GetByIdFailure: () => Effect.succeed(null),
        DocumentDecodeError: Effect.die,
      })
    );
});

/** Fails as not found for a Membresía of any other Unidad residencial. */
export const getOneInUnit = Effect.fn('Memberships.getOneInUnit')(function* (
  id: Id<'memberships'>,
  residentialUnitId: Id<'residentialUnits'>
) {
  const membership = yield* getOneById(id);

  const isMissingOrForeign =
    Predicate.isNull(membership) ||
    membership.residentialUnitId !== residentialUnitId;

  if (isMissingOrForeign) return yield* new Domain.MembershipNotFoundError();

  return membership;
});

export const listByUnit = Effect.fn('Memberships.listByUnit')(function* (
  residentialUnitId: Id<'residentialUnits'>
) {
  const reader = yield* DatabaseReader;

  return yield* reader
    .table('memberships')
    .index('by_residentialUnitId_and_status', (q) =>
      q.eq('residentialUnitId', residentialUnitId)
    )
    .collect()
    .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));
});

export const listByUnitAndEmail = Effect.fn('Memberships.listByUnitAndEmail')(
  function* (residentialUnitId: Id<'residentialUnits'>, email: string) {
    const reader = yield* DatabaseReader;

    return yield* reader
      .table('memberships')
      .index('by_residentialUnitId_and_email', (q) =>
        q
          .eq('residentialUnitId', residentialUnitId)
          .eq('email', CommonEmailAddressesDomain.normalizeEmailAddress(email))
      )
      .collect()
      .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));
  }
);

export const listActiveByUser = Effect.fn('Memberships.listActiveByUser')(
  function* (userId: Id<'users'>) {
    const reader = yield* DatabaseReader;

    return yield* reader
      .table('memberships')
      .index('by_userId_and_status', (q) =>
        q.eq('userId', userId).eq('status', 'active')
      )
      .collect()
      .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));
  }
);

export const listPendingByEmail = Effect.fn('Memberships.listPendingByEmail')(
  function* (email: string) {
    const reader = yield* DatabaseReader;

    return yield* reader
      .table('memberships')
      .index('by_email_and_status', (q) =>
        q
          .eq('email', CommonEmailAddressesDomain.normalizeEmailAddress(email))
          .eq('status', 'pending')
      )
      .collect()
      .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));
  }
);

export const listByApartment = Effect.fn('Memberships.listByApartment')(
  function* (apartmentId: Id<'apartments'>) {
    const reader = yield* DatabaseReader;

    return yield* reader
      .table('memberships')
      .index('by_apartmentId', (q) => q.eq('apartmentId', apartmentId))
      .collect()
      .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));
  }
);

export const getOneByExternalInvitationId = Effect.fn(
  'Memberships.getOneByExternalInvitationId'
)(function* (externalInvitationId: string) {
  const reader = yield* DatabaseReader;

  return yield* reader
    .table('memberships')
    .get('by_externalInvitationId', externalInvitationId)
    .pipe(
      Effect.catchTags({
        GetByIndexFailure: () => Effect.succeed(null),
        DocumentDecodeError: Effect.die,
      })
    );
});
