import { FunctionImpl, GroupImpl } from '@confect/server';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import refs from './_generated/refs';
import databaseSchema from './_generated/schema';
import { ActionRunner, MutationRunner } from './_generated/services';
import developmentSeederSpec from './developmentSeeder.spec';
import * as DevelopmentSeeder from './modules/developmentSeeder';
import * as WorkOS from './modules/workos';

// -*******************************************************************************-
// Internal
// -*******************************************************************************-

const seedImpl = FunctionImpl.make(
  databaseSchema,
  developmentSeederSpec,
  'seed',
  () =>
    Effect.gen(function* () {
      const actionRunner = yield* ActionRunner;
      const mutationRunner = yield* MutationRunner;
      const workos = yield* WorkOS.WorkOSService;

      yield* Effect.logInfo('Seeding development accounts', {
        accountCount: DevelopmentSeeder.DEVELOPMENT_ACCOUNTS.length,
      });

      yield* Effect.forEach(
        DevelopmentSeeder.DEVELOPMENT_ACCOUNTS,
        DevelopmentSeeder.createDevelopmentAccount,
        { concurrency: 'unbounded', discard: true }
      );

      yield* Effect.logInfo('Development accounts seeded');

      const seededUnit = DevelopmentSeeder.DEVELOPMENT_RESIDENTIAL_UNIT;
      const organization = yield* workos.organizations.createIfNotExists({
        name: seededUnit.name,
        externalId: seededUnit.slug,
      });
      const administrator = yield* mutationRunner(
        refs.internal.developmentSeeder.seedResidentialUnit,
        { externalOrganizationId: organization.id }
      );
      // Grants the Administrador its WorkOS access now, so sign-in can pick the unit.
      yield* actionRunner(
        refs.internal.memberships.syncUnitAccess,
        administrator
      );

      yield* Effect.logInfo('Development Unidad residencial seeded', {
        slug: seededUnit.slug,
      });

      return null;
    }).pipe(Effect.provide(WorkOS.workOSLayer), Effect.orDie)
);

const seedResidentialUnitImpl = FunctionImpl.make(
  databaseSchema,
  developmentSeederSpec,
  'seedResidentialUnit',
  (args) =>
    DevelopmentSeeder.seedDevelopmentResidentialUnit(
      args.externalOrganizationId
    )
);

// -*******************************************************************************-
// API
// -*******************************************************************************-

export default GroupImpl.make(databaseSchema, developmentSeederSpec).pipe(
  Layer.provide(seedImpl),
  Layer.provide(seedResidentialUnitImpl),
  GroupImpl.finalize
);
