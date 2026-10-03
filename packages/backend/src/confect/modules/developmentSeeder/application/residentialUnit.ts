import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import { DatabaseWriter } from '../../../_generated/services';
import * as ApartmentsApplication from '../../apartments/application';
import * as MembershipsApplication from '../../memberships/application';
import * as ResidentialUnitsApplication from '../../residentialUnits/application';
import * as UsersApplication from '../../users/application';
import * as UsersDomain from '../../users/domain';
import * as Domain from '../domain';

/**
 * Upserts the development unit, its Apartamentos and its Administrador.
 * `externalOrganizationId` is rewritten on every run because a rerun may pair
 * the surviving deployment with a fresh WorkOS environment.
 */
export const seedDevelopmentResidentialUnit = Effect.fn(
  'DevelopmentSeeder.seedDevelopmentResidentialUnit'
)(function* (externalOrganizationId: string) {
  const writer = yield* DatabaseWriter;
  const seed = Domain.DEVELOPMENT_RESIDENTIAL_UNIT;

  const [existingUnit, administrator] = yield* Effect.all(
    [
      ResidentialUnitsApplication.getOneBySlug(seed.slug),
      UsersApplication.getOneByEmail(seed.administrator.email).pipe(
        UsersDomain.isActiveOrNull,
        Effect.andThen((user) => Effect.fromNullishOr(user))
      ),
    ],
    { concurrency: 'unbounded' }
  );

  const residentialUnitId = Predicate.isNull(existingUnit)
    ? yield* writer.table('residentialUnits').insert({
        name: seed.name,
        slug: seed.slug,
        groupingWord: seed.groupingWord,
        externalOrganizationId,
      })
    : yield* writer
        .table('residentialUnits')
        .patch(existingUnit._id, { externalOrganizationId })
        .pipe(Effect.as(existingUnit._id));

  yield* Effect.forEach(
    seed.apartments,
    (label) =>
      Effect.gen(function* () {
        const apartment = yield* ApartmentsApplication.getOneByLabel(
          residentialUnitId,
          label
        );
        if (Predicate.isNotNull(apartment)) return;

        yield* writer
          .table('apartments')
          .insert({ residentialUnitId, ...label });
      }),
    { discard: true }
  );

  const administratorMemberships =
    yield* MembershipsApplication.listByUnitAndEmail(
      residentialUnitId,
      administrator.email
    );
  const isAlreadyAdministrator = administratorMemberships.some(
    (membership) =>
      membership.status === 'active' && membership.role === 'administrator'
  );

  if (!isAlreadyAdministrator) {
    const now = yield* Clock.currentTimeMillis;

    yield* writer.table('memberships').insert({
      residentialUnitId,
      role: 'administrator',
      name: seed.administrator.name,
      email: administrator.email,
      userId: administrator._id,
      status: 'active',
      invitedAt: now,
      invitationExpiresAt: now,
      invitationDelivery: 'skipped',
      acceptedAt: now,
    });
  }

  return { userId: administrator._id, residentialUnitId };
}, Effect.orDie);
