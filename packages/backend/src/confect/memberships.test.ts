import { describe, it } from '@effect/vitest';
import * as EffectVitestUtils from '@effect/vitest/utils';
import * as Effect from 'effect/Effect';

import refs from './_generated/refs';
import { DatabaseReader, DatabaseWriter } from './_generated/services';
import * as Memberships from './modules/memberships';
import * as ResidentialUnits from './modules/residentialUnits';
import * as TestFixtures from './test.fixtures';
import * as TestConfect from './test.setup';

describe('memberships', () => {
  it.effect(
    'lists only the caller’s active Membresías with their unit and Apartamento',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* TestFixtures.seedTwoUnits;

        const residentAccess = yield* confect
          .withIdentity(TestFixtures.identityOf('residentA'))
          .query(refs.public.memberships.listMine, {});

        EffectVitestUtils.deepStrictEqual(residentAccess, {
          isSuperadmin: false,
          memberships: [
            {
              membershipId: world.residentA,
              role: 'resident',
              residentialUnitId: world.unitA,
              residentialUnitName: 'Unidad A',
              residentialUnitTimeZone: 'America/Bogota',
              apartmentId: world.apartmentA101,
              apartmentLabel: 'Torre 1 · 101',
              occupancyType: 'owner',
            },
          ],
        });

        const [revokedAccess, pendingAccess] = yield* Effect.all(
          [
            confect
              .withIdentity(TestFixtures.identityOf('revokedA'))
              .query(refs.public.memberships.listMine, {}),
            confect
              .withIdentity(TestFixtures.identityOf('pendingA'))
              .query(refs.public.memberships.listMine, {}),
          ],
          { concurrency: 'unbounded' }
        );

        EffectVitestUtils.deepStrictEqual(revokedAccess.memberships, []);
        EffectVitestUtils.deepStrictEqual(pendingAccess.memberships, []);
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('answers no access until the caller’s Usuario is synced', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;

      const access = yield* confect
        .withIdentity(TestFixtures.identityOf('not-synced'))
        .query(refs.public.memberships.listMine, {});

      EffectVitestUtils.deepStrictEqual(access, {
        memberships: [],
        isSuperadmin: false,
      });
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('flags a Superadmin granted under any email casing', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      yield* TestFixtures.seedTwoUnits;

      yield* confect.mutation(refs.internal.residentialUnits.grantSuperadmin, {
        email: ' Outsider@Example.TEST ',
      });

      const access = yield* confect
        .withIdentity(TestFixtures.identityOf('outsider'))
        .query(refs.public.memberships.listMine, {});

      EffectVitestUtils.strictEqual(access.isSuperadmin, true);
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'activates a pending invitation once its Usuario signs in, idempotently',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* TestFixtures.seedTwoUnits;
        const admin = confect.withIdentity(TestFixtures.identityOf('adminA'));

        const invitedId = yield* admin.mutation(
          refs.public.memberships.invite,
          {
            membershipId: world.adminA,
            email: 'Nueva.Residente@Example.test',
            displayName: 'Nueva Residente',
            role: 'resident',
            apartmentId: world.apartmentA102,
            occupancyType: 'tenant',
          }
        );

        const beforeSignIn = yield* admin.query(
          refs.public.memberships.listForUnit,
          { membershipId: world.adminA }
        );
        const invited = beforeSignIn.find(({ _id }) => _id === invitedId);

        EffectVitestUtils.strictEqual(invited?.status, 'pending');
        EffectVitestUtils.strictEqual(
          invited?.email,
          'nueva.residente@example.test'
        );
        EffectVitestUtils.strictEqual(invited?.name, 'Nueva Residente');

        yield* confect.run(
          TestFixtures.insertUser('nueva', 'nueva.residente@example.test').pipe(
            Effect.orDie
          )
        );
        const newcomer = confect.withIdentity(TestFixtures.identityOf('nueva'));

        const firstActivation = yield* newcomer.mutation(
          refs.public.memberships.activatePending,
          {}
        );
        const secondActivation = yield* newcomer.mutation(
          refs.public.memberships.activatePending,
          {}
        );

        EffectVitestUtils.strictEqual(firstActivation, 1);
        EffectVitestUtils.strictEqual(secondActivation, 0);

        const access = yield* newcomer.query(
          refs.public.memberships.listMine,
          {}
        );

        EffectVitestUtils.deepStrictEqual(
          access.memberships.map(({ membershipId, apartmentLabel }) => ({
            membershipId,
            apartmentLabel,
          })),
          [{ membershipId: invitedId, apartmentLabel: 'Torre 1 · 102' }]
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('activates at once an invitation to an existing Usuario', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* TestFixtures.seedTwoUnits;

      const invitedId = yield* confect
        .withIdentity(TestFixtures.identityOf('adminA'))
        .mutation(refs.public.memberships.invite, {
          membershipId: world.adminA,
          email: 'OUTSIDER@example.test',
          role: 'porter',
        });

      const access = yield* confect
        .withIdentity(TestFixtures.identityOf('outsider'))
        .query(refs.public.memberships.listMine, {});

      EffectVitestUtils.deepStrictEqual(
        access.memberships.map(({ membershipId, role }) => ({
          membershipId,
          role,
        })),
        [{ membershipId: invitedId, role: 'porter' }]
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('rejects invitations that break the Rol rules', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* TestFixtures.seedTwoUnits;
      const admin = confect.withIdentity(TestFixtures.identityOf('adminA'));

      const invite = (invitation: Memberships.InviteMemberDto) =>
        Effect.result(
          admin.mutation(refs.public.memberships.invite, {
            membershipId: world.adminA,
            ...invitation,
          })
        );

      const [
        residentWithoutApartment,
        residentWithoutOccupancy,
        porterWithApartment,
        apartmentOfOtherUnit,
        malformedEmail,
        duplicate,
      ] = yield* Effect.all(
        [
          invite({ email: 'a@example.test', role: 'resident' }),
          invite({
            email: 'b@example.test',
            role: 'resident',
            apartmentId: world.apartmentA101,
          }),
          invite({
            email: 'c@example.test',
            role: 'porter',
            apartmentId: world.apartmentA101,
          }),
          invite({
            email: 'd@example.test',
            role: 'resident',
            apartmentId: world.apartmentB101,
            occupancyType: 'owner',
          }),
          invite({ email: 'not-an-email', role: 'porter' }),
          invite({ email: 'PorterA@Example.test', role: 'porter' }),
        ],
        { concurrency: 'unbounded' }
      );

      EffectVitestUtils.assertFailure(
        residentWithoutApartment,
        new Memberships.InvalidMembershipError({
          reason: 'residentNeedsApartment',
        })
      );
      EffectVitestUtils.assertFailure(
        residentWithoutOccupancy,
        new Memberships.InvalidMembershipError({
          reason: 'residentNeedsApartment',
        })
      );
      EffectVitestUtils.assertFailure(
        porterWithApartment,
        new Memberships.InvalidMembershipError({
          reason: 'onlyResidentsHaveApartment',
        })
      );
      EffectVitestUtils.assertFailure(
        apartmentOfOtherUnit,
        new ResidentialUnits.ApartmentNotFoundError()
      );
      EffectVitestUtils.assertFailure(
        malformedEmail,
        new Memberships.InvalidMembershipError({ reason: 'invalidEmail' })
      );
      EffectVitestUtils.assertFailure(
        duplicate,
        new Memberships.MembershipAlreadyExistsError({
          email: 'portera@example.test',
        })
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'never gives a Usuario who changed email a second Membresía in the same seat',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* TestFixtures.seedTwoUnits;
        const admin = confect.withIdentity(TestFixtures.identityOf('adminA'));
        const porter = confect.withIdentity(TestFixtures.identityOf('porterA'));

        // Invited while no Usuario holds the new email, so it waits pending.
        const pendingId = yield* admin.mutation(
          refs.public.memberships.invite,
          {
            membershipId: world.adminA,
            email: 'porter.new@example.test',
            role: 'porter',
          }
        );

        yield* confect.run(
          Effect.gen(function* () {
            const reader = yield* DatabaseReader;
            const writer = yield* DatabaseWriter;
            const porterUser = yield* reader
              .table('users')
              .get(
                'by_identityTokenIdentifier',
                TestFixtures.identityOf('porterA').tokenIdentifier
              );

            yield* writer.table('users').patch(porterUser._id, {
              email: 'porter.new@example.test',
            });
          }).pipe(Effect.orDie)
        );

        const activated = yield* porter.mutation(
          refs.public.memberships.activatePending,
          {}
        );
        EffectVitestUtils.strictEqual(activated, 0);

        const [access, unitMembers] = yield* Effect.all(
          [
            porter.query(refs.public.memberships.listMine, {}),
            admin.query(refs.public.memberships.listForUnit, {
              membershipId: world.adminA,
            }),
          ],
          { concurrency: 'unbounded' }
        );

        EffectVitestUtils.deepStrictEqual(
          access.memberships.map(({ membershipId }) => membershipId),
          [world.porterA]
        );
        EffectVitestUtils.strictEqual(
          unitMembers.find(({ _id }) => _id === pendingId)?.status,
          'revoked'
        );

        const [samePorterSeat, residentSeat] = yield* Effect.all(
          [
            Effect.result(
              admin.mutation(refs.public.memberships.invite, {
                membershipId: world.adminA,
                email: 'Porter.New@Example.test',
                role: 'porter',
              })
            ),
            admin.mutation(refs.public.memberships.invite, {
              membershipId: world.adminA,
              email: 'porter.new@example.test',
              role: 'resident',
              apartmentId: world.apartmentA102,
              occupancyType: 'tenant',
            }),
          ],
          { concurrency: 'unbounded' }
        );

        EffectVitestUtils.assertFailure(
          samePorterSeat,
          new Memberships.MembershipAlreadyExistsError({
            email: 'porter.new@example.test',
          })
        );

        const accessAfterInvite = yield* porter.query(
          refs.public.memberships.listMine,
          {}
        );
        EffectVitestUtils.deepStrictEqual(
          accessAfterInvite.memberships.map(({ membershipId }) => membershipId),
          [world.porterA, residentSeat]
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'lists the newest Residente even behind more than 1000 Porteros',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* TestFixtures.seedTwoUnits;
        const admin = confect.withIdentity(TestFixtures.identityOf('adminA'));

        yield* confect.run(
          Effect.gen(function* () {
            const writer = yield* DatabaseWriter;

            yield* Effect.forEach(
              Array.from({ length: 1000 }, (_, index) => index),
              (index) =>
                writer.table('memberships').insert({
                  residentialUnitId: world.unitA,
                  email: `porter.${index}@example.test`,
                  role: 'porter',
                  status: 'pending',
                }),
              { discard: true }
            );
          }).pipe(Effect.orDie)
        );

        const newestResident = yield* admin.mutation(
          refs.public.memberships.invite,
          {
            membershipId: world.adminA,
            email: 'newest.resident@example.test',
            role: 'resident',
            apartmentId: world.apartmentA102,
            occupancyType: 'owner',
          }
        );

        const members = yield* admin.query(
          refs.public.memberships.listForUnit,
          { membershipId: world.adminA }
        );
        const listedIds = members.map(({ _id }) => _id);

        EffectVitestUtils.assertTrue(listedIds.includes(newestResident));
        EffectVitestUtils.assertTrue(listedIds.includes(world.residentA));
        EffectVitestUtils.assertTrue(listedIds.includes(world.adminA));
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('keeps every unit’s Membresías to its own Administradores', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* TestFixtures.seedTwoUnits;
      const adminB = confect.withIdentity(TestFixtures.identityOf('adminB'));

      const unitBMembers = yield* adminB.query(
        refs.public.memberships.listForUnit,
        { membershipId: world.adminB }
      );

      EffectVitestUtils.deepStrictEqual(
        unitBMembers.map(({ email }) => email),
        ['adminb@example.test']
      );

      const accessDenied = new Memberships.AccessDeniedError();
      const denials = yield* Effect.all(
        [
          // Someone else's Membresía, even an Administrador's.
          Effect.result(
            adminB.query(refs.public.memberships.listForUnit, {
              membershipId: world.adminA,
            })
          ),
          // A Residente is not an Administrador.
          Effect.result(
            confect
              .withIdentity(TestFixtures.identityOf('residentA'))
              .mutation(refs.public.memberships.invite, {
                membershipId: world.residentA,
                email: 'friend@example.test',
                role: 'porter',
              })
          ),
          // Revoked and pending Membresías grant nothing.
          Effect.result(
            confect
              .withIdentity(TestFixtures.identityOf('revokedA'))
              .query(refs.public.memberships.listForUnit, {
                membershipId: world.revokedA,
              })
          ),
          Effect.result(
            confect
              .withIdentity(TestFixtures.identityOf('pendingA'))
              .query(refs.public.memberships.listForUnit, {
                membershipId: world.pendingA,
              })
          ),
          // Revoking across units reveals nothing either.
          Effect.result(
            adminB.mutation(refs.public.memberships.revoke, {
              membershipId: world.adminA,
              targetMembershipId: world.residentA,
            })
          ),
        ],
        { concurrency: 'unbounded' }
      );

      for (const denial of denials)
        EffectVitestUtils.assertFailure<unknown, unknown>(denial, accessDenied);
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('revokes a Membresía of the unit, never the caller’s own', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* TestFixtures.seedTwoUnits;
      const adminA = confect.withIdentity(TestFixtures.identityOf('adminA'));

      yield* adminA.mutation(refs.public.memberships.revoke, {
        membershipId: world.adminA,
        targetMembershipId: world.residentA,
      });
      // Revoking again is a no-op.
      yield* adminA.mutation(refs.public.memberships.revoke, {
        membershipId: world.adminA,
        targetMembershipId: world.residentA,
      });

      const residentAccess = yield* confect
        .withIdentity(TestFixtures.identityOf('residentA'))
        .query(refs.public.memberships.listMine, {});

      EffectVitestUtils.deepStrictEqual(residentAccess.memberships, []);

      const [ownRevocation, otherUnitRevocation] = yield* Effect.all(
        [
          Effect.result(
            adminA.mutation(refs.public.memberships.revoke, {
              membershipId: world.adminA,
              targetMembershipId: world.adminA,
            })
          ),
          Effect.result(
            adminA.mutation(refs.public.memberships.revoke, {
              membershipId: world.adminA,
              targetMembershipId: world.adminB,
            })
          ),
        ],
        { concurrency: 'unbounded' }
      );

      EffectVitestUtils.assertFailure(
        ownRevocation,
        new Memberships.CannotRevokeOwnMembershipError()
      );
      EffectVitestUtils.assertFailure(
        otherUnitRevocation,
        new Memberships.MembershipNotFoundError()
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );
});
