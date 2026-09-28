import { describe, it } from '@effect/vitest';
import * as EffectVitestUtils from '@effect/vitest/utils';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import refs from './_generated/refs';
import * as DevelopmentSeeder from './modules/developmentSeeder';
import * as TestFixtures from './test.fixtures';
import * as TestConfect from './test.setup';

/** Sample data counts do not depend on the day the overview asks about. */
const ANY_DAY = Date.parse('2026-01-01T12:00:00Z');

describe('developmentSeeder', () => {
  it.effect(
    'seeds the sample units once and gives every account its Membresías',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;

        yield* confect.run(
          Effect.forEach(
            DevelopmentSeeder.DEVELOPMENT_ACCOUNTS,
            (account) => TestFixtures.insertUser(account.email, account.email),
            { discard: true }
          ).pipe(Effect.orDie)
        );

        yield* confect.mutation(
          refs.internal.developmentSeeder.seedSampleData,
          {}
        );
        // Setup reseeds on every run.
        yield* confect.mutation(
          refs.internal.developmentSeeder.seedSampleData,
          {}
        );

        const accessOf = (email: string) =>
          confect
            .withIdentity(TestFixtures.identityOf(email))
            .query(refs.public.memberships.listMine, {});

        const [agent, human, residente, portero, administrador] =
          yield* Effect.all(
            [
              accessOf('agent@example.org'),
              accessOf('human@example.org'),
              accessOf('residente@example.org'),
              accessOf('portero@example.org'),
              accessOf('administrador@example.org'),
            ],
            { concurrency: 'unbounded' }
          );

        const describeAccess = (access: typeof agent): ReadonlyArray<string> =>
          access.memberships
            .map(
              ({ residentialUnitName, role, apartmentLabel }) =>
                `${residentialUnitName} | ${role} | ${apartmentLabel ?? '-'}`
            )
            .toSorted();

        const almendros = DevelopmentSeeder.ALMENDROS.name;
        const mirador = DevelopmentSeeder.MIRADOR.name;

        EffectVitestUtils.assertTrue(agent.isSuperadmin);
        EffectVitestUtils.deepStrictEqual(describeAccess(agent), [
          `${almendros} | administrator | -`,
          `${almendros} | porter | -`,
          `${almendros} | resident | Torre 1 · 101`,
        ]);
        EffectVitestUtils.deepStrictEqual(describeAccess(human), [
          `${almendros} | resident | Torre 2 · 202`,
          `${mirador} | administrator | -`,
          `${mirador} | porter | -`,
        ]);
        EffectVitestUtils.deepStrictEqual(describeAccess(residente), [
          `${almendros} | resident | Torre 1 · 101`,
        ]);
        EffectVitestUtils.deepStrictEqual(describeAccess(portero), [
          `${almendros} | porter | -`,
        ]);
        EffectVitestUtils.strictEqual(administrador.isSuperadmin, false);

        const [administratorMembership] = administrador.memberships;
        EffectVitestUtils.assertTrue(
          Predicate.isNotUndefined(administratorMembership)
        );

        const administratorClient = confect.withIdentity(
          TestFixtures.identityOf('administrador@example.org')
        );
        const [overview, members] = yield* Effect.all(
          [
            administratorClient.query(
              refs.public.residentialUnits.getOverview,
              {
                membershipId: administratorMembership.membershipId,
                now: ANY_DAY,
              }
            ),
            administratorClient.query(refs.public.memberships.listForUnit, {
              membershipId: administratorMembership.membershipId,
            }),
          ],
          { concurrency: 'unbounded' }
        );

        EffectVitestUtils.strictEqual(overview.apartmentCount, 40);
        EffectVitestUtils.strictEqual(overview.visitorsInside, 2);
        EffectVitestUtils.strictEqual(overview.pendingMembershipCount, 2);
        // Idempotent: the second run added no Membresía.
        EffectVitestUtils.strictEqual(members.length, 9);
      }).pipe(Effect.provide(TestConfect.layer))
  );
});
