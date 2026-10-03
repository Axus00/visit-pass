import * as Effect from 'effect/Effect';

import type { Id } from '#convex/_generated/dataModel';

import { DatabaseReader } from '../../../_generated/services';

// -*******************************************************************************-
// API
// -*******************************************************************************-

export const getOneById = Effect.fn('ResidentialUnits.getOneById')(function* (
  id: Id<'residentialUnits'>
) {
  const reader = yield* DatabaseReader;

  return yield* reader
    .table('residentialUnits')
    .get(id)
    .pipe(
      Effect.catchTags({
        GetByIdFailure: () => Effect.succeed(null),
        DocumentDecodeError: Effect.die,
      })
    );
});

export const getOneBySlug = Effect.fn('ResidentialUnits.getOneBySlug')(
  function* (slug: string) {
    const reader = yield* DatabaseReader;

    return yield* reader
      .table('residentialUnits')
      .get('by_slug', slug)
      .pipe(
        Effect.catchTags({
          GetByIndexFailure: () => Effect.succeed(null),
          DocumentDecodeError: Effect.die,
        })
      );
  }
);

export const getOneByExternalOrganizationId = Effect.fn(
  'ResidentialUnits.getOneByExternalOrganizationId'
)(function* (externalOrganizationId: string) {
  const reader = yield* DatabaseReader;

  return yield* reader
    .table('residentialUnits')
    .get('by_externalOrganizationId', externalOrganizationId)
    .pipe(
      Effect.catchTags({
        GetByIndexFailure: () => Effect.succeed(null),
        DocumentDecodeError: Effect.die,
      })
    );
});
