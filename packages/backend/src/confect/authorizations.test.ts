import { describe, it } from '@effect/vitest';
import * as EffectVitestUtils from '@effect/vitest/utils';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import refs from './_generated/refs';
import * as Authorizations from './modules/authorizations';
import * as Memberships from './modules/memberships';
import * as PorteriaFixtures from './porteria.fixtures';
import * as TestConfect from './test.setup';

const authorizations = refs.public.authorizations;

describe('authorizations', () => {
  it.effect(
    'creates a Temporal with one Pase that the whole Apartamento sees',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* PorteriaFixtures.seedPorteria;
        const residentA = yield* PorteriaFixtures.as('residentA');
        const coResidentA = yield* PorteriaFixtures.as('coResidentA');
        const residentA102 = yield* PorteriaFixtures.as('residentA102');

        const created = yield* residentA.mutation(authorizations.create, {
          membershipId: world.residentA,
          type: 'temporary',
          startDate: PorteriaFixtures.localDateFromToday(0),
          visitors: [{ name: 'Ana Visitante', document: '1234567890' }],
        });

        EffectVitestUtils.strictEqual(created.passes.length, 1);
        const [pass] = created.passes;
        EffectVitestUtils.assertTrue(Predicate.isNotUndefined(pass));
        EffectVitestUtils.assertTrue(/^[A-Za-z0-9_-]{22}$/.test(pass.token));
        EffectVitestUtils.strictEqual(pass.status, 'active');

        const listed = yield* coResidentA.query(
          authorizations.listForApartment,
          { membershipId: world.coResidentA }
        );
        EffectVitestUtils.strictEqual(listed.length, 1);
        EffectVitestUtils.strictEqual(
          listed[0]?.createdByName,
          'residentA Test'
        );
        EffectVitestUtils.strictEqual(listed[0]?.passes[0]?.token, pass.token);

        const otherApartment = yield* residentA102.query(
          authorizations.listForApartment,
          { membershipId: world.residentA102 }
        );
        EffectVitestUtils.strictEqual(otherApartment.length, 0);

        const publicPass = yield* confect.query(authorizations.getPublicPass, {
          token: pass.token,
        });
        EffectVitestUtils.assertTrue(Predicate.isNotNull(publicPass));
        EffectVitestUtils.strictEqual(publicPass.visitorName, 'Ana Visitante');
        EffectVitestUtils.strictEqual(
          publicPass.residentialUnitName,
          'Unidad A'
        );
        EffectVitestUtils.strictEqual(
          publicPass.apartmentLabel,
          'Torre 1 · 101'
        );
        EffectVitestUtils.strictEqual(
          publicPass.residentialUnitTimeZone,
          'America/Bogota'
        );
        EffectVitestUtils.assertFalse(
          Object.values(publicPass).includes('1234567890')
        );

        const unknown = yield* confect.query(authorizations.getPublicPass, {
          token: 'unknown-token',
        });
        EffectVitestUtils.strictEqual(unknown, null);
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('gives each Evento guest their own Pase', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const residentA = yield* PorteriaFixtures.as('residentA');

      const created = yield* residentA.mutation(authorizations.create, {
        membershipId: world.residentA,
        type: 'event',
        startDate: PorteriaFixtures.localDateFromToday(1),
        eventName: 'Cumpleaños',
        visitors: [{ name: 'Ana' }, { name: 'Luis' }, { name: 'Marta' }],
      });

      EffectVitestUtils.deepStrictEqual(
        created.passes.map((pass) => pass.visitorName),
        ['Ana', 'Luis', 'Marta']
      );
      EffectVitestUtils.strictEqual(
        new Set(created.passes.map((pass) => pass.token)).size,
        3
      );

      const [listed] = yield* residentA.query(authorizations.listForApartment, {
        membershipId: world.residentA,
      });
      EffectVitestUtils.strictEqual(listed?.eventName, 'Cumpleaños');
      EffectVitestUtils.strictEqual(listed?.passes.length, 3);
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('rejects invalid Autorizaciones with their reason', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const residentA = yield* PorteriaFixtures.as('residentA');

      const startsYesterday = yield* Effect.result(
        residentA.mutation(authorizations.create, {
          membershipId: world.residentA,
          type: 'temporary',
          startDate: PorteriaFixtures.localDateFromToday(-1),
          visitors: [{ name: 'Ana' }],
        })
      );
      EffectVitestUtils.assertFailure(
        startsYesterday,
        new Authorizations.InvalidAuthorizationError({
          reason: 'startsInThePast',
        })
      );

      const serviceWithoutWeekdays = yield* Effect.result(
        residentA.mutation(authorizations.create, {
          membershipId: world.residentA,
          type: 'service',
          startDate: PorteriaFixtures.localDateFromToday(0),
          endDate: PorteriaFixtures.localDateFromToday(30),
          visitors: [{ name: 'Jardinero' }],
        })
      );
      EffectVitestUtils.assertFailure(
        serviceWithoutWeekdays,
        new Authorizations.InvalidAuthorizationError({
          reason: 'missingWeekdays',
        })
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'cancels the Autorización and its Pases for any Residente of the Apartamento',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* PorteriaFixtures.seedPorteria;
        const residentA = yield* PorteriaFixtures.as('residentA');
        const coResidentA = yield* PorteriaFixtures.as('coResidentA');
        const residentA102 = yield* PorteriaFixtures.as('residentA102');

        const created = yield* residentA.mutation(authorizations.create, {
          membershipId: world.residentA,
          type: 'event',
          startDate: PorteriaFixtures.localDateFromToday(0),
          visitors: [{ name: 'Ana' }, { name: 'Luis' }],
        });

        const otherApartmentCancel = yield* Effect.result(
          residentA102.mutation(authorizations.cancel, {
            membershipId: world.residentA102,
            authorizationId: created.authorizationId,
          })
        );
        EffectVitestUtils.assertFailure(
          otherApartmentCancel,
          new Authorizations.AuthorizationNotFoundError()
        );

        yield* coResidentA.mutation(authorizations.cancel, {
          membershipId: world.coResidentA,
          authorizationId: created.authorizationId,
        });
        // Idempotent.
        yield* residentA.mutation(authorizations.cancel, {
          membershipId: world.residentA,
          authorizationId: created.authorizationId,
        });

        const [listed] = yield* residentA.query(
          authorizations.listForApartment,
          { membershipId: world.residentA }
        );
        EffectVitestUtils.strictEqual(listed?.status, 'cancelled');
        EffectVitestUtils.deepStrictEqual(
          listed?.passes.map((pass) => pass.status),
          ['cancelled', 'cancelled']
        );

        const publicPass = yield* confect.query(authorizations.getPublicPass, {
          token: created.passes[0]?.token ?? '',
        });
        EffectVitestUtils.strictEqual(
          publicPass?.authorizationStatus,
          'cancelled'
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('replaces a regenerated Pase so the old link is rejected', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* PorteriaFixtures.seedPorteria;
      const residentA = yield* PorteriaFixtures.as('residentA');
      const residentA102 = yield* PorteriaFixtures.as('residentA102');

      const created = yield* residentA.mutation(authorizations.create, {
        membershipId: world.residentA,
        type: 'temporary',
        startDate: PorteriaFixtures.localDateFromToday(0),
        visitors: [{ name: 'Ana' }],
      });
      const [pass] = created.passes;
      EffectVitestUtils.assertTrue(Predicate.isNotUndefined(pass));

      const otherApartment = yield* Effect.result(
        residentA102.mutation(authorizations.regeneratePass, {
          membershipId: world.residentA102,
          passId: pass._id,
        })
      );
      EffectVitestUtils.assertFailure(
        otherApartment,
        new Authorizations.PassNotFoundError()
      );

      const regenerated = yield* residentA.mutation(
        authorizations.regeneratePass,
        { membershipId: world.residentA, passId: pass._id }
      );
      EffectVitestUtils.assertTrue(regenerated.token !== pass.token);

      const [oldLink, newLink] = yield* Effect.all([
        confect.query(authorizations.getPublicPass, { token: pass.token }),
        confect.query(authorizations.getPublicPass, {
          token: regenerated.token,
        }),
      ]);
      EffectVitestUtils.strictEqual(oldLink?.status, 'replaced');
      EffectVitestUtils.strictEqual(newLink?.status, 'active');
      EffectVitestUtils.strictEqual(newLink?.visitorName, 'Ana');

      const [listed] = yield* residentA.query(authorizations.listForApartment, {
        membershipId: world.residentA,
      });
      EffectVitestUtils.deepStrictEqual(
        listed?.passes.map((listedPass) => listedPass.status).toSorted(),
        ['active', 'replaced']
      );

      const replacedAgain = yield* Effect.result(
        residentA.mutation(authorizations.regeneratePass, {
          membershipId: world.residentA,
          passId: pass._id,
        })
      );
      EffectVitestUtils.assertFailure(
        replacedAgain,
        new Authorizations.PassNotActiveError()
      );

      yield* residentA.mutation(authorizations.cancel, {
        membershipId: world.residentA,
        authorizationId: created.authorizationId,
      });

      const afterCancel = yield* Effect.result(
        residentA.mutation(authorizations.regeneratePass, {
          membershipId: world.residentA,
          passId: regenerated._id,
        })
      );
      EffectVitestUtils.assertFailure(
        afterCancel,
        new Authorizations.PassNotActiveError()
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'keeps Favoritos per Membresía and stamps them when authorized',
    () =>
      Effect.gen(function* () {
        const world = yield* PorteriaFixtures.seedPorteria;
        const residentA = yield* PorteriaFixtures.as('residentA');
        const coResidentA = yield* PorteriaFixtures.as('coResidentA');

        const mother = yield* residentA.mutation(
          authorizations.createFavorite,
          {
            membershipId: world.residentA,
            visitorName: 'Mamá',
            relationship: 'family',
          }
        );
        yield* residentA.mutation(authorizations.createFavorite, {
          membershipId: world.residentA,
          visitorName: 'Carlos',
          relationship: 'friend',
        });

        const coResidentFavorite = yield* Effect.result(
          coResidentA.mutation(authorizations.create, {
            membershipId: world.coResidentA,
            type: 'temporary',
            startDate: PorteriaFixtures.localDateFromToday(0),
            visitors: [{ name: 'Mamá', favoriteId: mother }],
          })
        );
        EffectVitestUtils.assertFailure(
          coResidentFavorite,
          new Authorizations.FavoriteNotFoundError()
        );

        const created = yield* residentA.mutation(authorizations.create, {
          membershipId: world.residentA,
          type: 'temporary',
          startDate: PorteriaFixtures.localDateFromToday(0),
          visitors: [{ name: 'Mamá', favoriteId: mother }],
        });
        EffectVitestUtils.strictEqual(created.passes.length, 1);

        const favorites = yield* residentA.query(authorizations.listFavorites, {
          membershipId: world.residentA,
        });
        EffectVitestUtils.deepStrictEqual(
          favorites.map((favorite) => favorite.visitorName),
          ['Mamá', 'Carlos']
        );
        EffectVitestUtils.assertTrue(
          Predicate.isNotUndefined(favorites[0]?.lastAuthorizedAt)
        );

        const coResidentFavorites = yield* coResidentA.query(
          authorizations.listFavorites,
          { membershipId: world.coResidentA }
        );
        EffectVitestUtils.strictEqual(coResidentFavorites.length, 0);

        const removeOthers = yield* Effect.result(
          coResidentA.mutation(authorizations.removeFavorite, {
            membershipId: world.coResidentA,
            favoriteId: mother,
          })
        );
        EffectVitestUtils.assertFailure(
          removeOthers,
          new Authorizations.FavoriteNotFoundError()
        );

        yield* residentA.mutation(authorizations.removeFavorite, {
          membershipId: world.residentA,
          favoriteId: mother,
        });
        const remaining = yield* residentA.query(authorizations.listFavorites, {
          membershipId: world.residentA,
        });
        EffectVitestUtils.deepStrictEqual(
          remaining.map((favorite) => favorite.visitorName),
          ['Carlos']
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'denies a Membresía that is not the caller’s or not a Residente',
    () =>
      Effect.gen(function* () {
        const world = yield* PorteriaFixtures.seedPorteria;
        const residentA102 = yield* PorteriaFixtures.as('residentA102');
        const porterA = yield* PorteriaFixtures.as('porterA');

        const othersMembership = yield* Effect.result(
          residentA102.query(authorizations.listForApartment, {
            membershipId: world.residentA,
          })
        );
        EffectVitestUtils.assertFailure(
          othersMembership,
          new Memberships.AccessDeniedError()
        );

        const porterCreates = yield* Effect.result(
          porterA.mutation(authorizations.create, {
            membershipId: world.porterA,
            type: 'temporary',
            startDate: PorteriaFixtures.localDateFromToday(0),
            visitors: [{ name: 'Ana' }],
          })
        );
        EffectVitestUtils.assertFailure(
          porterCreates,
          new Memberships.AccessDeniedError()
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );
});
