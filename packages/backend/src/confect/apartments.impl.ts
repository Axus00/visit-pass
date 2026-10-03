import { FunctionImpl, GroupImpl } from '@confect/server';
import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';

import databaseSchema from './_generated/schema';
import { DatabaseWriter } from './_generated/services';
import apartmentsSpec from './apartments.spec';
import RequireUnitMembership from './middleware/RequireUnitMembership.impl';
import * as Apartments from './modules/apartments';
import * as Memberships from './modules/memberships';

// -*******************************************************************************-
// Public
// -*******************************************************************************-

const listImpl = FunctionImpl.make(databaseSchema, apartmentsSpec, 'list', () =>
  Effect.gen(function* () {
    const { residentialUnit } = yield* Memberships.CurrentUnitMembership;

    return yield* Apartments.listByUnit(residentialUnit._id);
  })
);

const createImpl = FunctionImpl.make(
  databaseSchema,
  apartmentsSpec,
  'create',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const { residentialUnit } =
        yield* Memberships.requireRole('administrator');

      const apartmentWithLabel = yield* Apartments.getOneByLabel(
        residentialUnit._id,
        args
      );

      if (Predicate.isNotNull(apartmentWithLabel))
        return yield* new Apartments.DuplicateApartmentError();

      return yield* writer
        .table('apartments')
        .insert({
          residentialUnitId: residentialUnit._id,
          grouping: args.grouping,
          number: args.number,
        })
        .pipe(Effect.catchTag('DocumentEncodeError', Effect.die));
    })
);

const renameImpl = FunctionImpl.make(
  databaseSchema,
  apartmentsSpec,
  'rename',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const { residentialUnit } =
        yield* Memberships.requireRole('administrator');

      const [apartment, apartmentWithLabel] = yield* Effect.all(
        [
          Apartments.getOneInUnit(args.apartmentId, residentialUnit._id),
          Apartments.getOneByLabel(residentialUnit._id, args),
        ],
        { concurrency: 'unbounded' }
      );

      const isLabelTaken =
        Predicate.isNotNull(apartmentWithLabel) &&
        apartmentWithLabel._id !== apartment._id;

      if (isLabelTaken) return yield* new Apartments.DuplicateApartmentError();

      yield* writer
        .table('apartments')
        .patch(apartment._id, { grouping: args.grouping, number: args.number })
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );

      return null;
    })
);

const removeImpl = FunctionImpl.make(
  databaseSchema,
  apartmentsSpec,
  'remove',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const { residentialUnit } =
        yield* Memberships.requireRole('administrator');

      const apartment = yield* Apartments.getOneInUnit(
        args.apartmentId,
        residentialUnit._id
      );
      const memberships = yield* Memberships.listByApartment(apartment._id);

      const isInUse = memberships.some(
        (membership) =>
          membership.status === 'pending' || membership.status === 'active'
      );

      if (isInUse) return yield* new Apartments.ApartmentInUseError();

      if (memberships.length === 0) {
        yield* writer.table('apartments').delete(apartment._id);

        return 'deleted' as const;
      }

      yield* writer
        .table('apartments')
        .patch(apartment._id, {
          deactivatedAt: yield* Clock.currentTimeMillis,
        })
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );

      return 'deactivated' as const;
    })
);

// -*******************************************************************************-
// API
// -*******************************************************************************-

export default GroupImpl.make(databaseSchema, apartmentsSpec).pipe(
  Layer.provide(listImpl),
  Layer.provide(createImpl),
  Layer.provide(renameImpl),
  Layer.provide(removeImpl),
  Layer.provide(RequireUnitMembership),

  GroupImpl.finalize
);
