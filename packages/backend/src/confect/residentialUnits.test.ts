import { describe, it } from '@effect/vitest';
import * as EffectVitestUtils from '@effect/vitest/utils';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import refs from './_generated/refs';
import { DatabaseReader, DatabaseWriter } from './_generated/services';
import * as Memberships from './modules/memberships';
import * as ResidentialUnits from './modules/residentialUnits';
import * as Visits from './modules/visits';
import * as TestFixtures from './test.fixtures';
import * as TestConfect from './test.setup';

/** 10:00 in Bogotá, which is still the 25th in no zone the test uses. */
const NOW = Date.parse('2026-09-26T15:00:00Z');

describe('residentialUnits', () => {
  it.effect('counts the Administrador’s dashboard for their unit only', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* TestFixtures.seedTwoUnits;

      yield* confect.run(
        Effect.gen(function* () {
          const writer = yield* DatabaseWriter;

          const shift = (
            residentialUnitId: typeof world.unitA,
            porterMembershipId: typeof world.porterA,
            status: 'open' | 'closed'
          ) =>
            writer.table('shifts').insert({
              residentialUnitId,
              porterMembershipId,
              status,
              startedAt: NOW - 60_000,
            });

          const shiftA = yield* shift(world.unitA, world.porterA, 'open');
          yield* shift(world.unitA, world.porterA, 'closed');
          const shiftB = yield* shift(world.unitB, world.adminB, 'open');

          const visit = (args: {
            unitB?: boolean;
            enteredAt: string;
            exitedAt?: string;
            voided?: boolean;
          }) =>
            writer.table('visits').insert({
              residentialUnitId: args.unitB ? world.unitB : world.unitA,
              apartmentId: args.unitB
                ? world.apartmentB101
                : world.apartmentA101,
              visitorName: 'Visitante',
              visitType: 'temporary',
              origin: 'manual',
              shiftId: args.unitB ? shiftB : shiftA,
              entryPorterMembershipId: args.unitB
                ? world.adminB
                : world.porterA,
              enteredAt: Date.parse(args.enteredAt),
              exitedAt: Predicate.isUndefined(args.exitedAt)
                ? undefined
                : Date.parse(args.exitedAt),
              privacyNoticeVersion: Visits.PRIVACY_NOTICE_VERSION,
              voidedAt: args.voided ? Date.parse(args.enteredAt) : undefined,
            });

          // Today in Bogotá, gone.
          yield* visit({
            enteredAt: '2026-09-26T14:00:00Z',
            exitedAt: '2026-09-26T14:30:00Z',
          });
          // Today in Bogotá, still inside.
          yield* visit({ enteredAt: '2026-09-26T11:00:00Z' });
          // Today in Bogotá and open, but registered by mistake.
          yield* visit({ enteredAt: '2026-09-26T12:00:00Z', voided: true });
          // 23:00 yesterday in Bogotá although already the 26th in UTC.
          yield* visit({ enteredAt: '2026-09-26T04:00:00Z' });
          // Two days ago, gone.
          yield* visit({
            enteredAt: '2026-09-24T15:00:00Z',
            exitedAt: '2026-09-24T16:00:00Z',
          });
          yield* visit({ unitB: true, enteredAt: '2026-09-26T14:00:00Z' });
        }).pipe(Effect.orDie)
      );

      const overview = yield* confect
        .withIdentity(TestFixtures.identityOf('adminA'))
        .query(refs.public.residentialUnits.getOverview, {
          membershipId: world.adminA,
          now: NOW,
        });

      EffectVitestUtils.deepStrictEqual(overview, {
        unit: {
          _id: world.unitA,
          name: 'Unidad A',
          city: 'Bogotá',
          timeZone: 'America/Bogota',
          visitRetentionMonths: ResidentialUnits.DEFAULT_VISIT_RETENTION_MONTHS,
        },
        apartmentCount: 3,
        activeResidentCount: 1,
        porterCount: 1,
        pendingMembershipCount: 1,
        openShiftCount: 1,
        visitsToday: 2,
        visitorsInside: 2,
      });

      const porterOverview = yield* Effect.result(
        confect
          .withIdentity(TestFixtures.identityOf('porterA'))
          .query(refs.public.residentialUnits.getOverview, {
            membershipId: world.porterA,
            now: NOW,
          })
      );

      EffectVitestUtils.assertFailure(
        porterOverview,
        new Memberships.AccessDeniedError()
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'lists the unit’s Apartamentos in natural order to staff, never to Residentes',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* TestFixtures.seedTwoUnits;
        const admin = confect.withIdentity(TestFixtures.identityOf('adminA'));

        const created = yield* admin.mutation(
          refs.public.residentialUnits.createApartments,
          {
            membershipId: world.adminA,
            tower: '10',
            numbers: ['1001', '901', '901'],
          }
        );
        const repeated = yield* admin.mutation(
          refs.public.residentialUnits.createApartments,
          {
            membershipId: world.adminA,
            tower: '10',
            numbers: ['901', '902'],
          }
        );

        EffectVitestUtils.strictEqual(created, 2);
        EffectVitestUtils.strictEqual(repeated, 1);

        const apartments = yield* confect
          .withIdentity(TestFixtures.identityOf('porterA'))
          .query(refs.public.residentialUnits.listApartments, {
            membershipId: world.porterA,
          });

        EffectVitestUtils.deepStrictEqual(
          apartments.map(({ label, activeResidentCount }) => ({
            label,
            activeResidentCount,
          })),
          [
            { label: 'Torre 1 · 101', activeResidentCount: 1 },
            { label: 'Torre 1 · 102', activeResidentCount: 0 },
            { label: 'Torre 2 · 101', activeResidentCount: 0 },
            { label: 'Torre 10 · 901', activeResidentCount: 0 },
            { label: 'Torre 10 · 902', activeResidentCount: 0 },
            { label: 'Torre 10 · 1001', activeResidentCount: 0 },
          ]
        );

        const residentListing = yield* Effect.result(
          confect
            .withIdentity(TestFixtures.identityOf('residentA'))
            .query(refs.public.residentialUnits.listApartments, {
              membershipId: world.residentA,
            })
        );

        EffectVitestUtils.assertFailure(
          residentListing,
          new Memberships.AccessDeniedError()
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('stops counting active Membresías whose Usuario was deleted', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* TestFixtures.seedTwoUnits;
      const admin = confect.withIdentity(TestFixtures.identityOf('adminA'));

      // The Membresías stay active; only their Usuarios are soft-deleted.
      yield* confect.run(
        Effect.forEach(
          ['residentA', 'porterA'],
          (key) =>
            Effect.gen(function* () {
              const reader = yield* DatabaseReader;
              const writer = yield* DatabaseWriter;

              const user = yield* reader
                .table('users')
                .get('by_externalId', key);
              yield* writer.table('users').patch(user._id, { deletedAt: 0 });
            }),
          { discard: true }
        ).pipe(Effect.orDie)
      );

      const [overview, apartments] = yield* Effect.all(
        [
          admin.query(refs.public.residentialUnits.getOverview, {
            membershipId: world.adminA,
            now: NOW,
          }),
          admin.query(refs.public.residentialUnits.listApartments, {
            membershipId: world.adminA,
          }),
        ],
        { concurrency: 'unbounded' }
      );

      EffectVitestUtils.strictEqual(overview.activeResidentCount, 0);
      EffectVitestUtils.strictEqual(overview.porterCount, 0);
      EffectVitestUtils.deepStrictEqual(
        apartments.map(({ activeResidentCount }) => activeResidentCount),
        [0, 0, 0]
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('keeps Apartamentos and settings inside their own unit', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* TestFixtures.seedTwoUnits;
      const adminB = confect.withIdentity(TestFixtures.identityOf('adminB'));

      const unitBApartments = yield* adminB.query(
        refs.public.residentialUnits.listApartments,
        { membershipId: world.adminB }
      );

      EffectVitestUtils.deepStrictEqual(
        unitBApartments.map(({ _id }) => _id),
        [world.apartmentB101]
      );

      const accessDenied = new Memberships.AccessDeniedError();
      const denials = yield* Effect.all(
        [
          Effect.result(
            adminB.query(refs.public.residentialUnits.listApartments, {
              membershipId: world.residentA,
            })
          ),
          Effect.result(
            adminB.mutation(refs.public.residentialUnits.createApartments, {
              membershipId: world.adminA,
              tower: 'X',
              numbers: ['1'],
            })
          ),
          Effect.result(
            confect
              .withIdentity(TestFixtures.identityOf('residentA'))
              .mutation(refs.public.residentialUnits.update, {
                membershipId: world.residentA,
                name: 'Renamed',
                city: 'Cali',
                visitRetentionMonths: 6,
              })
          ),
          Effect.result(
            confect
              .withIdentity(TestFixtures.identityOf('revokedA'))
              .query(refs.public.residentialUnits.listApartments, {
                membershipId: world.revokedA,
              })
          ),
        ],
        { concurrency: 'unbounded' }
      );

      for (const denial of denials)
        EffectVitestUtils.assertFailure<unknown, unknown>(denial, accessDenied);
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('lets the Administrador rename the unit and set retention', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* TestFixtures.seedTwoUnits;
      const admin = confect.withIdentity(TestFixtures.identityOf('adminA'));

      yield* admin.mutation(refs.public.residentialUnits.update, {
        membershipId: world.adminA,
        name: 'Conjunto Renombrado',
        city: 'Cali',
        visitRetentionMonths: 6,
      });

      const overview = yield* admin.query(
        refs.public.residentialUnits.getOverview,
        { membershipId: world.adminA, now: NOW }
      );

      EffectVitestUtils.deepStrictEqual(overview.unit, {
        _id: world.unitA,
        name: 'Conjunto Renombrado',
        city: 'Cali',
        timeZone: 'America/Bogota',
        visitRetentionMonths: 6,
      });
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('reserves the platform functions to Superadmins', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      yield* TestFixtures.seedTwoUnits;
      const adminA = confect.withIdentity(TestFixtures.identityOf('adminA'));

      const [listing, creation] = yield* Effect.all(
        [
          Effect.result(adminA.query(refs.public.residentialUnits.listAll, {})),
          Effect.result(
            adminA.mutation(refs.public.residentialUnits.create, {
              name: 'Nueva',
              city: 'Cali',
              administratorEmail: 'admin@example.test',
            })
          ),
        ],
        { concurrency: 'unbounded' }
      );

      EffectVitestUtils.assertFailure(
        listing,
        new ResidentialUnits.NotSuperadminError()
      );
      EffectVitestUtils.assertFailure(
        creation,
        new ResidentialUnits.NotSuperadminError()
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'creates a unit with its first Administrador and lists it for the Superadmin',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* TestFixtures.seedTwoUnits;

        // Granting twice keeps a single Superadmin row.
        yield* confect.mutation(
          refs.internal.residentialUnits.grantSuperadmin,
          { email: 'outsider@example.test' }
        );
        yield* confect.mutation(
          refs.internal.residentialUnits.grantSuperadmin,
          { email: 'OUTSIDER@example.test' }
        );
        const superadmin = confect.withIdentity(
          TestFixtures.identityOf('outsider')
        );

        const invalidEmail = yield* Effect.result(
          superadmin.mutation(refs.public.residentialUnits.create, {
            name: 'Sin Administrador',
            city: 'Cali',
            administratorEmail: 'nadie',
          })
        );

        EffectVitestUtils.assertFailure(
          invalidEmail,
          new Memberships.InvalidMembershipError({ reason: 'invalidEmail' })
        );

        const createdId = yield* superadmin.mutation(
          refs.public.residentialUnits.create,
          {
            name: 'Conjunto Nuevo',
            city: 'Cali',
            administratorEmail: 'Nuevo.Admin@Example.test',
            administratorName: 'Nuevo Admin',
          }
        );

        const units = yield* superadmin.query(
          refs.public.residentialUnits.listAll,
          {}
        );

        EffectVitestUtils.deepStrictEqual(
          units.map(({ _id, name, administratorEmails, apartmentCount }) => ({
            _id,
            name,
            administratorEmails,
            apartmentCount,
          })),
          [
            {
              _id: createdId,
              name: 'Conjunto Nuevo',
              administratorEmails: ['nuevo.admin@example.test'],
              apartmentCount: 0,
            },
            {
              _id: world.unitA,
              name: 'Unidad A',
              administratorEmails: ['admina@example.test'],
              apartmentCount: 3,
            },
            {
              _id: world.unitB,
              name: 'Unidad B',
              administratorEmails: ['adminb@example.test'],
              apartmentCount: 1,
            },
          ]
        );

        const createdUnit = units.find(({ _id }) => _id === createdId);

        EffectVitestUtils.strictEqual(createdUnit?.timeZone, 'America/Bogota');
        EffectVitestUtils.strictEqual(
          createdUnit?.visitRetentionMonths,
          ResidentialUnits.DEFAULT_VISIT_RETENTION_MONTHS
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'activates at once the first Administrador who has an account',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        yield* TestFixtures.seedTwoUnits;

        yield* confect.mutation(
          refs.internal.residentialUnits.grantSuperadmin,
          {
            email: 'outsider@example.test',
          }
        );

        const createdId = yield* confect
          .withIdentity(TestFixtures.identityOf('outsider'))
          .mutation(refs.public.residentialUnits.create, {
            name: 'Conjunto Propio',
            city: 'Cali',
            administratorEmail: 'outsider@example.test',
          });

        const access = yield* confect
          .withIdentity(TestFixtures.identityOf('outsider'))
          .query(refs.public.memberships.listMine, {});

        EffectVitestUtils.deepStrictEqual(
          access.memberships.map(({ residentialUnitId, role }) => ({
            residentialUnitId,
            role,
          })),
          [{ residentialUnitId: createdId, role: 'administrator' }]
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );
});
