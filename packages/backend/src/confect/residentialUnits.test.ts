import { describe, it } from '@effect/vitest';
import * as EffectVitestUtils from '@effect/vitest/utils';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';

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

          const visit = ({
            unitB = false,
            voided = false,
            ...args
          }: {
            unitB?: boolean;
            enteredAt: string;
            exitedAt?: string;
            voided?: boolean;
          }) =>
            writer.table('visits').insert({
              residentialUnitId: unitB ? world.unitB : world.unitA,
              apartmentId: unitB ? world.apartmentB101 : world.apartmentA101,
              visitorName: 'Visitante',
              visitType: 'temporary',
              origin: 'manual',
              shiftId: unitB ? shiftB : shiftA,
              entryPorterMembershipId: unitB ? world.adminB : world.porterA,
              enteredAt: Date.parse(args.enteredAt),
              exitedAt: Predicate.isUndefined(args.exitedAt)
                ? undefined
                : Date.parse(args.exitedAt),
              privacyNoticeVersion: Visits.PRIVACY_NOTICE_VERSION,
              voidedAt: voided ? Date.parse(args.enteredAt) : undefined,
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

  it.effect(
    'refuses Apartamentos beyond the limit every listing can read',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* TestFixtures.seedTwoUnits;
        const admin = confect.withIdentity(TestFixtures.identityOf('adminA'));

        // Unit A already holds 3, so these leave room for exactly one more.
        yield* confect.run(
          Effect.gen(function* () {
            const writer = yield* DatabaseWriter;

            yield* Effect.forEach(
              Array.from({ length: 1996 }, (_, index) => String(index + 1)),
              (number) =>
                writer.table('apartments').insert({
                  residentialUnitId: world.unitA,
                  tower: '9',
                  number,
                }),
              { concurrency: 'unbounded', discard: true }
            );
          }).pipe(Effect.orDie)
        );

        const createApartments = (numbers: ReadonlyArray<string>) =>
          Effect.result(
            admin.mutation(refs.public.residentialUnits.createApartments, {
              membershipId: world.adminA,
              tower: '10',
              numbers,
            })
          );

        const overflow = yield* createApartments(['1', '2']);
        EffectVitestUtils.assertFailure(
          overflow,
          new ResidentialUnits.ApartmentLimitReachedError({ limit: 2000 })
        );

        const lastOne = yield* createApartments(['1']);
        EffectVitestUtils.assertSuccess(lastOne, 1);

        // Repeating an existing Apartamento adds nothing, so it still succeeds.
        const repeated = yield* createApartments(['1']);
        EffectVitestUtils.assertSuccess(repeated, 0);

        const full = yield* createApartments(['2']);
        EffectVitestUtils.assertFailure(
          full,
          new ResidentialUnits.ApartmentLimitReachedError({ limit: 2000 })
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
      const world = yield* TestFixtures.seedTwoUnits;
      const adminA = confect.withIdentity(TestFixtures.identityOf('adminA'));

      const denials = yield* Effect.all(
        [
          Effect.result(adminA.query(refs.public.residentialUnits.listAll, {})),
          Effect.result(
            adminA.mutation(refs.public.residentialUnits.create, {
              name: 'Nueva',
              city: 'Cali',
              administratorEmail: 'admin@example.test',
            })
          ),
          Effect.result(
            adminA.mutation(refs.public.residentialUnits.inviteAdministrator, {
              residentialUnitId: world.unitA,
              administratorEmail: 'admin@example.test',
            })
          ),
          Effect.result(
            adminA.mutation(
              refs.public.residentialUnits.revokeAdministratorInvitation,
              { residentialUnitId: world.unitA, email: 'admin@example.test' }
            )
          ),
        ],
        { concurrency: 'unbounded' }
      );

      for (const denial of denials)
        EffectVitestUtils.assertFailure<unknown, unknown>(
          denial,
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

        // An active Administrador who changed email lists under the new one.
        yield* confect.run(
          Effect.gen(function* () {
            const reader = yield* DatabaseReader;
            const writer = yield* DatabaseWriter;

            const { userId } = yield* reader
              .table('memberships')
              .get(world.adminA);

            if (Predicate.isUndefined(userId)) return;

            yield* writer
              .table('users')
              .patch(userId, { email: 'admina.nuevo@example.test' });
          }).pipe(Effect.orDie)
        );

        const units = yield* superadmin.query(
          refs.public.residentialUnits.listAll,
          {}
        );

        EffectVitestUtils.deepStrictEqual(
          units.map(({ _id, name, administrators, apartmentCount }) => ({
            _id,
            name,
            administrators,
            apartmentCount,
          })),
          [
            {
              _id: createdId,
              name: 'Conjunto Nuevo',
              administrators: [
                { email: 'nuevo.admin@example.test', status: 'pending' },
              ],
              apartmentCount: 0,
            },
            {
              _id: world.unitA,
              name: 'Unidad A',
              // `revokedA` is left out.
              administrators: [
                { email: 'admina.nuevo@example.test', status: 'active' },
              ],
              apartmentCount: 3,
            },
            {
              _id: world.unitB,
              name: 'Unidad B',
              administrators: [
                { email: 'adminb@example.test', status: 'active' },
              ],
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
    'keeps the first Administrador pending until their own session activates it',
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

        const outsider = confect.withIdentity(
          TestFixtures.identityOf('outsider')
        );

        const createdId = yield* outsider.mutation(
          refs.public.residentialUnits.create,
          {
            name: 'Conjunto Propio',
            city: 'Cali',
            administratorEmail: 'outsider@example.test',
          }
        );

        // Having an account does not activate the invitation by itself.
        const beforeActivation = yield* outsider.query(
          refs.public.memberships.listMine,
          {}
        );
        EffectVitestUtils.deepStrictEqual(beforeActivation.memberships, []);

        const activated = yield* outsider.mutation(
          refs.public.memberships.activatePending,
          {}
        );
        EffectVitestUtils.strictEqual(activated, 1);

        const access = yield* outsider.query(
          refs.public.memberships.listMine,
          {}
        );

        EffectVitestUtils.deepStrictEqual(
          access.memberships.map(({ residentialUnitId, role }) => ({
            residentialUnitId,
            role,
          })),
          [{ residentialUnitId: createdId, role: 'administrator' }]
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'lets the Superadmin replace a mistyped Administrador invitation',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        yield* TestFixtures.seedTwoUnits;

        yield* confect.mutation(
          refs.internal.residentialUnits.grantSuperadmin,
          { email: 'outsider@example.test' }
        );
        const superadmin = confect.withIdentity(
          TestFixtures.identityOf('outsider')
        );

        const unitId = yield* superadmin.mutation(
          refs.public.residentialUnits.create,
          {
            name: 'Conjunto Nuevo',
            city: 'Cali',
            administratorEmail: 'nuevo.admn@example.test',
          }
        );

        yield* superadmin.mutation(
          refs.public.residentialUnits.revokeAdministratorInvitation,
          { residentialUnitId: unitId, email: ' Nuevo.Admn@Example.test ' }
        );
        yield* superadmin.mutation(
          refs.public.residentialUnits.inviteAdministrator,
          {
            residentialUnitId: unitId,
            administratorEmail: 'Nuevo.Admin@Example.test',
            administratorName: 'Nuevo Admin',
          }
        );

        const units = yield* superadmin.query(
          refs.public.residentialUnits.listAll,
          {}
        );

        EffectVitestUtils.deepStrictEqual(
          units.find(({ _id }) => _id === unitId)?.administrators,
          [{ email: 'nuevo.admin@example.test', status: 'pending' }]
        );

        const [revokedTwice, duplicate, invalidEmail] = yield* Effect.all(
          [
            Effect.result(
              superadmin.mutation(
                refs.public.residentialUnits.revokeAdministratorInvitation,
                { residentialUnitId: unitId, email: 'nuevo.admn@example.test' }
              )
            ),
            Effect.result(
              superadmin.mutation(
                refs.public.residentialUnits.inviteAdministrator,
                {
                  residentialUnitId: unitId,
                  administratorEmail: 'nuevo.admin@example.test',
                }
              )
            ),
            Effect.result(
              superadmin.mutation(
                refs.public.residentialUnits.inviteAdministrator,
                { residentialUnitId: unitId, administratorEmail: 'nadie' }
              )
            ),
          ],
          { concurrency: 'unbounded' }
        );

        EffectVitestUtils.assertFailure(
          revokedTwice,
          new Memberships.MembershipNotFoundError()
        );
        EffectVitestUtils.assertFailure(
          duplicate,
          new Memberships.MembershipAlreadyExistsError({
            email: 'nuevo.admin@example.test',
          })
        );
        EffectVitestUtils.assertFailure(
          invalidEmail,
          new Memberships.InvalidMembershipError({ reason: 'invalidEmail' })
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'invites an Administrador with an account as pending, and never revokes active or non-Administrador Membresías',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* TestFixtures.seedTwoUnits;

        yield* confect.mutation(
          refs.internal.residentialUnits.grantSuperadmin,
          { email: 'outsider@example.test' }
        );
        const superadmin = confect.withIdentity(
          TestFixtures.identityOf('outsider')
        );

        // `adminB` has an account, yet the Membresía in unit A waits for them.
        const invitedId = yield* superadmin.mutation(
          refs.public.residentialUnits.inviteAdministrator,
          {
            residentialUnitId: world.unitA,
            administratorEmail: 'adminb@example.test',
          }
        );
        const pendingStatus = yield* confect.run(
          Effect.gen(function* () {
            const reader = yield* DatabaseReader;

            const { status } = yield* reader
              .table('memberships')
              .get(invitedId);

            return status;
          }).pipe(Effect.orDie),
          Memberships.MembershipStatus
        );
        EffectVitestUtils.strictEqual(pendingStatus, 'pending');

        yield* confect
          .withIdentity(TestFixtures.identityOf('adminB'))
          .mutation(refs.public.memberships.activatePending, {});

        const revocations = yield* Effect.forEach(
          [
            'adminb@example.test',
            'admina@example.test',
            // A pending Portero, not an Administrador.
            'pendinga@example.test',
          ],
          (email) =>
            Effect.result(
              superadmin.mutation(
                refs.public.residentialUnits.revokeAdministratorInvitation,
                { residentialUnitId: world.unitA, email }
              )
            ),
          { concurrency: 'unbounded' }
        );

        for (const revocation of revocations)
          EffectVitestUtils.assertFailure(
            revocation,
            new Memberships.MembershipNotFoundError()
          );

        const statuses = yield* confect.run(
          Effect.gen(function* () {
            const reader = yield* DatabaseReader;

            const statusOf = (membershipId: typeof invitedId) =>
              reader
                .table('memberships')
                .get(membershipId)
                .pipe(Effect.map(({ status }) => status));

            return yield* Effect.all(
              {
                invited: statusOf(invitedId),
                adminA: statusOf(world.adminA),
                pendingA: statusOf(world.pendingA),
              },
              { concurrency: 'unbounded' }
            );
          }).pipe(Effect.orDie),
          Schema.Struct({
            invited: Memberships.MembershipStatus,
            adminA: Memberships.MembershipStatus,
            pendingA: Memberships.MembershipStatus,
          })
        );

        EffectVitestUtils.deepStrictEqual(statuses, {
          invited: 'active',
          adminA: 'active',
          pendingA: 'pending',
        });
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('refuses to invite an Administrador into a missing unit', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* TestFixtures.seedTwoUnits;

      yield* confect.mutation(refs.internal.residentialUnits.grantSuperadmin, {
        email: 'outsider@example.test',
      });

      yield* confect.run(
        Effect.gen(function* () {
          const writer = yield* DatabaseWriter;

          yield* writer.table('residentialUnits').delete(world.unitB);
        }).pipe(Effect.orDie)
      );

      const invitation = yield* Effect.result(
        confect
          .withIdentity(TestFixtures.identityOf('outsider'))
          .mutation(refs.public.residentialUnits.inviteAdministrator, {
            residentialUnitId: world.unitB,
            administratorEmail: 'nuevo@example.test',
          })
      );

      EffectVitestUtils.assertFailure(
        invitation,
        new ResidentialUnits.ResidentialUnitNotFoundError()
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );
});
