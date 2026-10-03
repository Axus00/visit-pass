import { describe, it } from '@effect/vitest';
import * as EffectVitestUtils from '@effect/vitest/utils';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import type { Id } from '#convex/_generated/dataModel';

import { Id as IdSchema } from './_generated/id';
import refs from './_generated/refs';
import { DatabaseReader, DatabaseWriter } from './_generated/services';
import * as Apartments from './modules/apartments';
import * as Memberships from './modules/memberships';
import * as TestConfect from './test.setup';

const FAR_FUTURE = 4_000_000_000_000;

/** `org_id` is the claim WorkOS adds for the organization the session selected. */
const identityOf = (userKey: string, unitSlug?: string) => ({
  subject: userKey,
  tokenIdentifier: `token|${userKey}`,
  ...(unitSlug === undefined ? {} : { org_id: `org_${unitSlug}` }),
});

const seedUser = Effect.fn('seedUser')(function* (
  userKey: string,
  overrides: { emailVerified?: boolean } = {}
) {
  const writer = yield* DatabaseWriter;

  return yield* writer.table('users').insert({
    externalId: userKey,
    identityTokenIdentifier: `token|${userKey}`,
    email: `${userKey}@example.test`,
    emailVerified: overrides.emailVerified ?? true,
    firstName: userKey,
    lastName: null,
    profilePictureUrl: null,
    lastSignInAt: null,
    locale: null,
    externalCreatedAt: 0,
    externalUpdatedAt: 0,
  });
});

const seedUnit = Effect.fn('seedUnit')(function* (slug: string) {
  const writer = yield* DatabaseWriter;

  return yield* writer.table('residentialUnits').insert({
    name: slug,
    slug,
    groupingWord: 'torre',
    externalOrganizationId: `org_${slug}`,
  });
});

const seedApartment = Effect.fn('seedApartment')(function* (
  residentialUnitId: Id<'residentialUnits'>,
  number: string
) {
  const writer = yield* DatabaseWriter;

  return yield* writer
    .table('apartments')
    .insert({ residentialUnitId, grouping: '1', number });
});

const seedMembership = Effect.fn('seedMembership')(function* (args: {
  residentialUnitId: Id<'residentialUnits'>;
  userKey: string;
  role: Memberships.Role;
  status: Memberships.MembershipStatus;
  userId?: Id<'users'>;
  apartmentId?: Id<'apartments'>;
  invitationExpiresAt?: number;
}) {
  const writer = yield* DatabaseWriter;

  return yield* writer.table('memberships').insert({
    residentialUnitId: args.residentialUnitId,
    role: args.role,
    apartmentId: args.apartmentId,
    occupancyType: args.role === 'resident' ? 'owner' : undefined,
    name: args.userKey,
    email: `${args.userKey}@example.test`,
    userId: args.userId,
    status: args.status,
    invitedAt: 0,
    invitationExpiresAt: args.invitationExpiresAt ?? FAR_FUTURE,
    invitationDelivery: 'sent',
  });
});

const World = Schema.Struct({
  north: IdSchema('residentialUnits'),
  south: IdSchema('residentialUnits'),
  northApartment: IdSchema('apartments'),
  southApartment: IdSchema('apartments'),
  northAdminMembership: IdSchema('memberships'),
  southAdminMembership: IdSchema('memberships'),
  rosa: IdSchema('users'),
});

/**
 * Two Unidades residenciales, each with an Administrador and one Apartamento,
 * plus Rosa: a Usuario who belongs to neither yet.
 */
const seedWorld = Effect.gen(function* () {
  const [north, south, northAdmin, southAdmin, rosa] = yield* Effect.all([
    seedUnit('north'),
    seedUnit('south'),
    seedUser('north-admin'),
    seedUser('south-admin'),
    seedUser('rosa'),
  ]);
  const [
    northApartment,
    southApartment,
    northAdminMembership,
    southAdminMembership,
  ] = yield* Effect.all([
    seedApartment(north, '101'),
    seedApartment(south, '101'),
    seedMembership({
      residentialUnitId: north,
      userKey: 'north-admin',
      userId: northAdmin,
      role: 'administrator',
      status: 'active',
    }),
    seedMembership({
      residentialUnitId: south,
      userKey: 'south-admin',
      userId: southAdmin,
      role: 'administrator',
      status: 'active',
    }),
  ]);

  return {
    north,
    south,
    northApartment,
    southApartment,
    northAdminMembership,
    southAdminMembership,
    rosa,
  };
});

const northAdmin = identityOf('north-admin', 'north');
const southAdmin = identityOf('south-admin', 'south');

const inviteRosaAsResident = (apartmentId: Id<'apartments'>) => ({
  name: 'Rosa Díaz',
  email: 'Rosa@Example.test',
  role: 'resident' as const,
  apartmentId,
  occupancyType: 'tenant' as const,
});

describe('memberships: Invitación and acceptance', () => {
  it.effect(
    'activates a Membresía only when the invited email accepts it',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* confect.run(seedWorld, World);

        const membershipId = yield* confect
          .withIdentity(northAdmin)
          .mutation(
            refs.public.memberships.invite,
            inviteRosaAsResident(world.northApartment)
          );

        const pendingAccess = yield* confect
          .withIdentity(identityOf('rosa'))
          .query(refs.public.memberships.myAccess, {});

        EffectVitestUtils.deepStrictEqual(pendingAccess?.units, []);
        EffectVitestUtils.deepStrictEqual(
          pendingAccess?.pendingInvitations.map((invitation) => ({
            _id: invitation._id,
            unit: invitation.residentialUnit.name,
            role: invitation.role,
            apartment: invitation.apartment,
          })),
          [
            {
              _id: membershipId,
              unit: 'north',
              role: 'resident',
              apartment: { grouping: '1', number: '101' },
            },
          ]
        );

        yield* confect
          .withIdentity(identityOf('rosa'))
          .mutation(refs.public.memberships.accept, { membershipId });

        const acceptedAccess = yield* confect
          .withIdentity(identityOf('rosa'))
          .query(refs.public.memberships.myAccess, {});

        EffectVitestUtils.deepStrictEqual(
          acceptedAccess?.pendingInvitations,
          []
        );
        EffectVitestUtils.deepStrictEqual(
          acceptedAccess?.units.map((unit) => ({
            unit: unit.residentialUnit.slug,
            roles: unit.memberships.map((membership) => membership.role),
          })),
          [{ unit: 'north', roles: ['resident'] }]
        );

        // The Membresía now opens the unit the token names.
        const apartments = yield* confect
          .withIdentity(identityOf('rosa', 'north'))
          .query(refs.public.apartments.list, {});

        EffectVitestUtils.deepStrictEqual(
          apartments.map((apartment) => apartment._id),
          [world.northApartment]
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('hides an Invitación from every email but the invited one', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* confect.run(seedWorld, World);
      yield* confect.run(seedUser('mallory'));

      const membershipId = yield* confect
        .withIdentity(northAdmin)
        .mutation(
          refs.public.memberships.invite,
          inviteRosaAsResident(world.northApartment)
        );

      const mallory = confect.withIdentity(identityOf('mallory'));
      const access = yield* mallory.query(refs.public.memberships.myAccess, {});
      const acceptance = yield* Effect.result(
        mallory.mutation(refs.public.memberships.accept, { membershipId })
      );
      const rejection = yield* Effect.result(
        mallory.mutation(refs.public.memberships.reject, { membershipId })
      );

      EffectVitestUtils.deepStrictEqual(access?.pendingInvitations, []);
      EffectVitestUtils.assertFailure(
        acceptance,
        new Memberships.InvitationNotFoundError()
      );
      EffectVitestUtils.assertFailure(
        rejection,
        new Memberships.InvitationNotFoundError()
      );

      // Rosa can still answer: the stranger's attempts changed nothing.
      yield* confect
        .withIdentity(identityOf('rosa'))
        .mutation(refs.public.memberships.accept, { membershipId });
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('refuses an unverified email and an expired Invitación', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* confect.run(seedWorld, World);

      const { unverifiedInvitation, expiredInvitation } = yield* confect.run(
        Effect.gen(function* () {
          yield* seedUser('unverified', { emailVerified: false });

          return yield* Effect.all({
            unverifiedInvitation: seedMembership({
              residentialUnitId: world.north,
              userKey: 'unverified',
              role: 'gatekeeper',
              status: 'pending',
            }),
            expiredInvitation: seedMembership({
              residentialUnitId: world.north,
              userKey: 'rosa',
              role: 'gatekeeper',
              status: 'pending',
              invitationExpiresAt: 1,
            }),
          });
        }),
        Schema.Struct({
          unverifiedInvitation: IdSchema('memberships'),
          expiredInvitation: IdSchema('memberships'),
        })
      );

      const unverified = yield* Effect.result(
        confect
          .withIdentity(identityOf('unverified'))
          .mutation(refs.public.memberships.accept, {
            membershipId: unverifiedInvitation,
          })
      );
      const expired = yield* Effect.result(
        confect
          .withIdentity(identityOf('rosa'))
          .mutation(refs.public.memberships.accept, {
            membershipId: expiredInvitation,
          })
      );

      EffectVitestUtils.assertFailure(
        unverified,
        new Memberships.EmailNotVerifiedError()
      );
      EffectVitestUtils.assertFailure(
        expired,
        new Memberships.InvitationExpiredError()
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'gives an expired Invitación another 30 days when it is resent',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* confect.run(seedWorld, World);

        const membershipId = yield* confect.run(
          seedMembership({
            residentialUnitId: world.north,
            userKey: 'rosa',
            role: 'gatekeeper',
            status: 'pending',
            invitationExpiresAt: 1,
          }),
          IdSchema('memberships')
        );

        yield* confect
          .withIdentity(northAdmin)
          .mutation(refs.public.memberships.resendInvitation, { membershipId });
        yield* confect
          .withIdentity(identityOf('rosa'))
          .mutation(refs.public.memberships.accept, { membershipId });

        const access = yield* confect
          .withIdentity(identityOf('rosa'))
          .query(refs.public.memberships.myAccess, {});

        EffectVitestUtils.strictEqual(access?.units.length, 1);
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    '"No soy yo" and a withdrawal both end the Invitación for good',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* confect.run(seedWorld, World);
        const admin = confect.withIdentity(northAdmin);
        const rosa = confect.withIdentity(identityOf('rosa'));

        const rejectedId = yield* admin.mutation(
          refs.public.memberships.invite,
          inviteRosaAsResident(world.northApartment)
        );
        yield* rosa.mutation(refs.public.memberships.reject, {
          membershipId: rejectedId,
        });

        // Rejecting frees the slot, so the Administrador may invite again.
        const withdrawnId = yield* admin.mutation(
          refs.public.memberships.invite,
          inviteRosaAsResident(world.northApartment)
        );
        yield* admin.mutation(refs.public.memberships.withdrawInvitation, {
          membershipId: withdrawnId,
        });

        const [afterRejection, afterWithdrawal] = yield* Effect.all([
          Effect.result(
            rosa.mutation(refs.public.memberships.accept, {
              membershipId: rejectedId,
            })
          ),
          Effect.result(
            rosa.mutation(refs.public.memberships.accept, {
              membershipId: withdrawnId,
            })
          ),
        ]);
        const memberships = yield* admin.query(
          refs.public.memberships.list,
          {}
        );

        EffectVitestUtils.assertFailure(
          afterRejection,
          new Memberships.InvitationNotFoundError()
        );
        EffectVitestUtils.assertFailure(
          afterWithdrawal,
          new Memberships.InvitationNotFoundError()
        );
        EffectVitestUtils.deepStrictEqual(
          memberships
            .filter((membership) => membership.email === 'rosa@example.test')
            .map((membership) => membership.status)
            .toSorted(),
          ['rejected', 'withdrawn']
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('checks what an Invitación may carry before creating it', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* confect.run(seedWorld, World);
      const admin = confect.withIdentity(northAdmin);
      const invitation = inviteRosaAsResident(world.northApartment);

      yield* admin.mutation(refs.public.memberships.invite, invitation);

      const [duplicate, residentWithoutApartment, gatekeeperWithApartment] =
        yield* Effect.all([
          Effect.result(
            admin.mutation(refs.public.memberships.invite, invitation)
          ),
          Effect.result(
            admin.mutation(refs.public.memberships.invite, {
              ...invitation,
              apartmentId: undefined,
            })
          ),
          Effect.result(
            admin.mutation(refs.public.memberships.invite, {
              ...invitation,
              role: 'gatekeeper',
            })
          ),
        ]);

      EffectVitestUtils.assertFailure(
        duplicate,
        new Memberships.DuplicateMembershipError()
      );
      EffectVitestUtils.assertFailure(
        residentWithoutApartment,
        new Memberships.InvalidResidentAssignmentError()
      );
      EffectVitestUtils.assertFailure(
        gatekeeperWithApartment,
        new Memberships.InvalidResidentAssignmentError()
      );

      // A second Rol for the same person is a second Membresía, not a duplicate.
      yield* admin.mutation(refs.public.memberships.invite, {
        name: invitation.name,
        email: invitation.email,
        role: 'gatekeeper',
        apartmentId: undefined,
        occupancyType: undefined,
      });
    }).pipe(Effect.provide(TestConfect.layer))
  );
});

describe('memberships: revocation', () => {
  it.effect('ends access at once and never reactivates the Membresía', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* confect.run(seedWorld, World);
      const admin = confect.withIdentity(northAdmin);
      const rosa = confect.withIdentity(identityOf('rosa', 'north'));

      const membershipId = yield* admin.mutation(
        refs.public.memberships.invite,
        inviteRosaAsResident(world.northApartment)
      );
      yield* rosa.mutation(refs.public.memberships.accept, { membershipId });
      yield* admin.mutation(refs.public.memberships.revoke, { membershipId });

      const [entry, secondRevocation, access] = yield* Effect.all([
        Effect.result(rosa.query(refs.public.apartments.list, {})),
        Effect.result(
          admin.mutation(refs.public.memberships.revoke, { membershipId })
        ),
        rosa.query(refs.public.memberships.myAccess, {}),
      ]);

      EffectVitestUtils.assertFailure(
        entry,
        new Memberships.MembershipRequiredError()
      );
      EffectVitestUtils.assertFailure(
        secondRevocation,
        new Memberships.MembershipNotFoundError()
      );
      EffectVitestUtils.deepStrictEqual(access?.units, []);

      // Inviting the same person again creates another Membresía.
      const reinvitedId = yield* admin.mutation(
        refs.public.memberships.invite,
        inviteRosaAsResident(world.northApartment)
      );

      EffectVitestUtils.assertTrue(reinvitedId !== membershipId);
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('keeps an Administrador from revoking themself', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* confect.run(seedWorld, World);

      const result = yield* Effect.result(
        confect
          .withIdentity(northAdmin)
          .mutation(refs.public.memberships.revoke, {
            membershipId: world.northAdminMembership,
          })
      );

      EffectVitestUtils.assertFailure(
        result,
        new Memberships.CannotRevokeOwnMembershipError()
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('revokes every Membresía of a Usuario WorkOS deleted', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* confect.run(seedWorld, World);
      const admin = confect.withIdentity(northAdmin);

      const membershipId = yield* admin.mutation(
        refs.public.memberships.invite,
        inviteRosaAsResident(world.northApartment)
      );
      yield* confect
        .withIdentity(identityOf('rosa'))
        .mutation(refs.public.memberships.accept, { membershipId });

      yield* confect.mutation(refs.internal.users.softDeleteByExternalId, {
        externalId: 'rosa',
      });

      const memberships = yield* admin.query(refs.public.memberships.list, {});
      const revoked = memberships.find(
        (membership) => membership._id === membershipId
      );

      // The unit keeps its own copy of the name for its history (ADR 0010).
      EffectVitestUtils.strictEqual(revoked?.status, 'revoked');
      EffectVitestUtils.strictEqual(revoked?.name, 'Rosa Díaz');
    }).pipe(Effect.provide(TestConfect.layer))
  );
});

describe('memberships: isolation between Unidades residenciales', () => {
  it.effect('never lets an Administrador read or change another unit', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* confect.run(seedWorld, World);
      const north = confect.withIdentity(northAdmin);
      const south = confect.withIdentity(southAdmin);

      const northInvitation = yield* north.mutation(
        refs.public.memberships.invite,
        inviteRosaAsResident(world.northApartment)
      );

      const [
        listed,
        apartments,
        resent,
        withdrawn,
        revoked,
        occupancy,
        invitedToForeignApartment,
        renamed,
        removed,
      ] = yield* Effect.all([
        south.query(refs.public.memberships.list, {}),
        south.query(refs.public.apartments.list, {}),
        Effect.result(
          south.mutation(refs.public.memberships.resendInvitation, {
            membershipId: northInvitation,
          })
        ),
        Effect.result(
          south.mutation(refs.public.memberships.withdrawInvitation, {
            membershipId: northInvitation,
          })
        ),
        Effect.result(
          south.mutation(refs.public.memberships.revoke, {
            membershipId: world.northAdminMembership,
          })
        ),
        Effect.result(
          south.mutation(refs.public.memberships.updateOccupancyType, {
            membershipId: northInvitation,
            occupancyType: 'owner',
          })
        ),
        Effect.result(
          south.mutation(
            refs.public.memberships.invite,
            inviteRosaAsResident(world.northApartment)
          )
        ),
        Effect.result(
          south.mutation(refs.public.apartments.rename, {
            apartmentId: world.northApartment,
            grouping: '9',
            number: '999',
          })
        ),
        Effect.result(
          south.mutation(refs.public.apartments.remove, {
            apartmentId: world.northApartment,
          })
        ),
      ]);

      EffectVitestUtils.deepStrictEqual(
        listed.map((membership) => membership._id),
        [world.southAdminMembership]
      );
      EffectVitestUtils.deepStrictEqual(
        apartments.map((apartment) => apartment._id),
        [world.southApartment]
      );
      const membershipNotFound = new Memberships.MembershipNotFoundError();
      const apartmentNotFound = new Apartments.ApartmentNotFoundError();

      EffectVitestUtils.assertFailure(resent, membershipNotFound);
      EffectVitestUtils.assertFailure(withdrawn, membershipNotFound);
      EffectVitestUtils.assertFailure(revoked, membershipNotFound);
      EffectVitestUtils.assertFailure(occupancy, membershipNotFound);
      EffectVitestUtils.assertFailure(
        invitedToForeignApartment,
        apartmentNotFound
      );
      EffectVitestUtils.assertFailure(renamed, apartmentNotFound);
      EffectVitestUtils.assertFailure(removed, apartmentNotFound);
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'reads the unit from the token and the Rol from the Membresía',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* confect.run(seedWorld, World);
        yield* confect.run(
          seedMembership({
            residentialUnitId: world.north,
            userKey: 'rosa',
            userId: world.rosa,
            role: 'gatekeeper',
            status: 'active',
          })
        );

        const [withoutUnit, unknownUnit, foreignUnit, wrongRole, anonymous] =
          yield* Effect.all([
            Effect.result(
              confect
                .withIdentity(identityOf('north-admin'))
                .query(refs.public.memberships.list, {})
            ),
            Effect.result(
              confect
                .withIdentity(identityOf('north-admin', 'nowhere'))
                .query(refs.public.memberships.list, {})
            ),
            // A member of one unit holding a token for another gets nothing.
            Effect.result(
              confect
                .withIdentity(identityOf('north-admin', 'south'))
                .query(refs.public.memberships.list, {})
            ),
            Effect.result(
              confect
                .withIdentity(identityOf('rosa', 'north'))
                .query(refs.public.memberships.list, {})
            ),
            Effect.result(confect.query(refs.public.memberships.list, {})),
          ]);

        EffectVitestUtils.assertFailure(
          withoutUnit,
          new Memberships.NoActiveResidentialUnitError()
        );
        EffectVitestUtils.assertFailure(
          unknownUnit,
          new Memberships.NoActiveResidentialUnitError()
        );
        EffectVitestUtils.assertFailure(
          foreignUnit,
          new Memberships.MembershipRequiredError()
        );
        EffectVitestUtils.assertFailure(
          wrongRole,
          new Memberships.RoleRequiredError({ role: 'administrator' })
        );
        EffectVitestUtils.strictEqual(anonymous._tag, 'Failure');
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('asks WorkOS for the union of Roles in one unit only', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* confect.run(seedWorld, World);
      yield* confect.run(
        Effect.all([
          seedMembership({
            residentialUnitId: world.north,
            userKey: 'rosa',
            userId: world.rosa,
            role: 'gatekeeper',
            status: 'active',
          }),
          seedMembership({
            residentialUnitId: world.north,
            userKey: 'rosa',
            userId: world.rosa,
            role: 'resident',
            status: 'active',
            apartmentId: world.northApartment,
          }),
          seedMembership({
            residentialUnitId: world.south,
            userKey: 'rosa',
            role: 'administrator',
            status: 'pending',
          }),
        ])
      );

      const [north, south] = yield* Effect.all([
        confect.query(refs.internal.memberships.getUnitAccessTarget, {
          userId: world.rosa,
          residentialUnitId: world.north,
        }),
        confect.query(refs.internal.memberships.getUnitAccessTarget, {
          userId: world.rosa,
          residentialUnitId: world.south,
        }),
      ]);

      EffectVitestUtils.deepStrictEqual(north, {
        externalUserId: 'rosa',
        externalOrganizationId: 'org_north',
        roles: ['gatekeeper', 'resident'],
        hasPendingInvitation: false,
      });
      EffectVitestUtils.deepStrictEqual(south, {
        externalUserId: 'rosa',
        externalOrganizationId: 'org_south',
        roles: [],
        hasPendingInvitation: true,
      });
    }).pipe(Effect.provide(TestConfect.layer))
  );
});

describe('apartments', () => {
  it.effect('deletes an unused Apartamento and deactivates a used one', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* confect.run(seedWorld, World);
      const admin = confect.withIdentity(northAdmin);

      const unusedId = yield* admin.mutation(refs.public.apartments.create, {
        grouping: '2',
        number: '201',
      });
      const membershipId = yield* admin.mutation(
        refs.public.memberships.invite,
        inviteRosaAsResident(world.northApartment)
      );

      const whileInvited = yield* Effect.result(
        admin.mutation(refs.public.apartments.remove, {
          apartmentId: world.northApartment,
        })
      );

      yield* admin.mutation(refs.public.memberships.withdrawInvitation, {
        membershipId,
      });

      const [unused, used] = yield* Effect.all([
        admin.mutation(refs.public.apartments.remove, {
          apartmentId: unusedId,
        }),
        admin.mutation(refs.public.apartments.remove, {
          apartmentId: world.northApartment,
        }),
      ]);
      const apartments = yield* admin.query(refs.public.apartments.list, {});
      const inviteToDeactivated = yield* Effect.result(
        admin.mutation(
          refs.public.memberships.invite,
          inviteRosaAsResident(world.northApartment)
        )
      );

      EffectVitestUtils.assertFailure(
        whileInvited,
        new Apartments.ApartmentInUseError()
      );
      EffectVitestUtils.strictEqual(unused, 'deleted');
      EffectVitestUtils.strictEqual(used, 'deactivated');
      EffectVitestUtils.deepStrictEqual(
        apartments.map((apartment) => ({
          _id: apartment._id,
          isDeactivated: apartment.deactivatedAt !== undefined,
        })),
        [{ _id: world.northApartment, isDeactivated: true }]
      );
      EffectVitestUtils.assertFailure(
        inviteToDeactivated,
        new Apartments.ApartmentNotFoundError()
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('keeps Agrupación and number unique within a unit only', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* confect.run(seedWorld, World);
      const admin = confect.withIdentity(northAdmin);

      const otherId = yield* admin.mutation(refs.public.apartments.create, {
        grouping: '1',
        number: '102',
      });

      const [duplicate, clashingRename] = yield* Effect.all([
        Effect.result(
          admin.mutation(refs.public.apartments.create, {
            grouping: '1',
            number: '101',
          })
        ),
        Effect.result(
          admin.mutation(refs.public.apartments.rename, {
            apartmentId: otherId,
            grouping: '1',
            number: '101',
          })
        ),
      ]);

      EffectVitestUtils.assertFailure(
        duplicate,
        new Apartments.DuplicateApartmentError()
      );
      EffectVitestUtils.assertFailure(
        clashingRename,
        new Apartments.DuplicateApartmentError()
      );

      yield* admin.mutation(refs.public.apartments.rename, {
        apartmentId: otherId,
        grouping: '1',
        number: '103',
      });

      const renamed = yield* confect.run(
        Effect.gen(function* () {
          const reader = yield* DatabaseReader;

          return yield* reader.table('apartments').get(otherId);
        }),
        Apartments.ApartmentsDocSchema
      );

      EffectVitestUtils.strictEqual(renamed.number, '103');
      // The other unit already had its own "1 · 101", untouched by all of this.
      EffectVitestUtils.assertTrue(
        world.southApartment !== world.northApartment
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('lets only the Administrador change the Agrupación word', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* confect.run(seedWorld, World);
      yield* confect.run(
        seedMembership({
          residentialUnitId: world.north,
          userKey: 'rosa',
          userId: world.rosa,
          role: 'gatekeeper',
          status: 'active',
        })
      );

      const asGatekeeper = yield* Effect.result(
        confect
          .withIdentity(identityOf('rosa', 'north'))
          .mutation(refs.public.residentialUnits.updateGroupingWord, {
            groupingWord: 'bloque',
          })
      );
      yield* confect
        .withIdentity(northAdmin)
        .mutation(refs.public.residentialUnits.updateGroupingWord, {
          groupingWord: null,
        });

      const access = yield* confect
        .withIdentity(northAdmin)
        .query(refs.public.memberships.myAccess, {});

      EffectVitestUtils.assertFailure(
        asGatekeeper,
        new Memberships.RoleRequiredError({ role: 'administrator' })
      );
      EffectVitestUtils.strictEqual(
        access?.units[0]?.residentialUnit.groupingWord,
        null
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );
});
