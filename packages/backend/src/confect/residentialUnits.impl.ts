import { FunctionImpl, GroupImpl } from '@confect/server';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';

import refs from './_generated/refs';
import databaseSchema from './_generated/schema';
import {
  DatabaseWriter,
  MutationRunner,
  QueryRunner,
} from './_generated/services';
import RequireUnitMembership from './middleware/RequireUnitMembership.impl';
import * as CommonErrors from './modules/commonErrors';
import * as Memberships from './modules/memberships';
import * as ResidentialUnits from './modules/residentialUnits';
import * as WorkOS from './modules/workos';
import residentialUnitsSpec from './residentialUnits.spec';

// -*******************************************************************************-
// Public
// -*******************************************************************************-

const updateGroupingWordImpl = FunctionImpl.make(
  databaseSchema,
  residentialUnitsSpec,
  'updateGroupingWord',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const { residentialUnit } =
        yield* Memberships.requireRole('administrator');

      yield* writer
        .table('residentialUnits')
        .patch(residentialUnit._id, { groupingWord: args.groupingWord })
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );

      return null;
    })
);

// -*******************************************************************************-
// Internal
// -*******************************************************************************-

const createImpl = FunctionImpl.make(
  databaseSchema,
  residentialUnitsSpec,
  'create',
  (args) =>
    Effect.gen(function* () {
      const queryRunner = yield* QueryRunner;
      const mutationRunner = yield* MutationRunner;

      const unitWithSlug = yield* queryRunner(
        refs.internal.residentialUnits.getOneBySlug,
        { slug: args.slug }
      ).pipe(Effect.catchTag('SchemaError', Effect.die));

      if (Predicate.isNotNull(unitWithSlug))
        return yield* new ResidentialUnits.SlugTakenError({ slug: args.slug });

      // The slug doubles as the Organization's external id, so a retry after a
      // failed insert reuses the Organization instead of creating a second one.
      const organization = yield* Effect.gen(function* () {
        const workos = yield* WorkOS.WorkOSService;

        return yield* workos.organizations.createIfNotExists({
          name: args.name,
          externalId: args.slug,
        });
      }).pipe(
        Effect.provide(WorkOS.workOSLayer),
        CommonErrors.orExternalProviderError(
          'Could not create the WorkOS Organization'
        )
      );

      return yield* mutationRunner(
        refs.internal.residentialUnits.insertWithFirstAdministrator,
        { ...args, externalOrganizationId: organization.id }
      ).pipe(Effect.catchTag('SchemaError', Effect.die));
    })
);

const getOneBySlugImpl = FunctionImpl.make(
  databaseSchema,
  residentialUnitsSpec,
  'getOneBySlug',
  (args) => ResidentialUnits.getOneBySlug(args.slug)
);

const insertWithFirstAdministratorImpl = FunctionImpl.make(
  databaseSchema,
  residentialUnitsSpec,
  'insertWithFirstAdministrator',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const unitWithSlug = yield* ResidentialUnits.getOneBySlug(args.slug);

      if (Predicate.isNotNull(unitWithSlug))
        return yield* new ResidentialUnits.SlugTakenError({ slug: args.slug });

      const residentialUnitId = yield* writer
        .table('residentialUnits')
        .insert({
          name: args.name,
          slug: args.slug,
          groupingWord: args.groupingWord,
          externalOrganizationId: args.externalOrganizationId,
        })
        .pipe(Effect.catchTag('DocumentEncodeError', Effect.die));

      // A brand-new unit has no Apartamento or Membresía an Administrador could clash with.
      yield* Memberships.inviteMembership({
        residentialUnitId,
        dto: { ...args.firstAdministrator, role: 'administrator' },
      }).pipe(Effect.orDie);

      return residentialUnitId;
    })
);

// -*******************************************************************************-
// API
// -*******************************************************************************-

export default GroupImpl.make(databaseSchema, residentialUnitsSpec).pipe(
  Layer.provide(updateGroupingWordImpl),
  Layer.provide(createImpl),
  Layer.provide(getOneBySlugImpl),
  Layer.provide(insertWithFirstAdministratorImpl),
  Layer.provide(RequireUnitMembership),

  GroupImpl.finalize
);
