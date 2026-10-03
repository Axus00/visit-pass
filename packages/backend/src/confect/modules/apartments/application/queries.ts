import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import type { Id } from '#convex/_generated/dataModel';

import { DatabaseReader } from '../../../_generated/services';
import * as Domain from '../domain';

// -*******************************************************************************-
// API
// -*******************************************************************************-

export const getOneById = Effect.fn('Apartments.getOneById')(function* (
  id: Id<'apartments'>
) {
  const reader = yield* DatabaseReader;

  return yield* reader
    .table('apartments')
    .get(id)
    .pipe(
      Effect.catchTags({
        GetByIdFailure: () => Effect.succeed(null),
        DocumentDecodeError: Effect.die,
      })
    );
});

/** Fails as not found for an Apartamento of any other Unidad residencial. */
export const getOneInUnit = Effect.fn('Apartments.getOneInUnit')(function* (
  id: Id<'apartments'>,
  residentialUnitId: Id<'residentialUnits'>
) {
  const apartment = yield* getOneById(id);

  const isMissingOrForeign =
    Predicate.isNull(apartment) ||
    apartment.residentialUnitId !== residentialUnitId;

  if (isMissingOrForeign) return yield* new Domain.ApartmentNotFoundError();

  return apartment;
});

export const listByUnit = Effect.fn('Apartments.listByUnit')(function* (
  residentialUnitId: Id<'residentialUnits'>
) {
  const reader = yield* DatabaseReader;

  return yield* reader
    .table('apartments')
    .index('by_residentialUnitId_and_grouping_and_number', (q) =>
      q.eq('residentialUnitId', residentialUnitId)
    )
    .collect()
    .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));
});

export const getOneByLabel = Effect.fn('Apartments.getOneByLabel')(function* (
  residentialUnitId: Id<'residentialUnits'>,
  label: Domain.ApartmentLabel
) {
  const reader = yield* DatabaseReader;

  return yield* reader
    .table('apartments')
    .get(
      'by_residentialUnitId_and_grouping_and_number',
      residentialUnitId,
      label.grouping,
      label.number
    )
    .pipe(
      Effect.catchTags({
        GetByIndexFailure: () => Effect.succeed(null),
        DocumentDecodeError: Effect.die,
      })
    );
});
