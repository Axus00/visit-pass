import { MiddlewareImpl } from '@confect/server';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import databaseSchema from '../_generated/schema';
import { Auth } from '../_generated/services';
import * as Authentication from '../modules/authentication';
import * as Memberships from '../modules/memberships';
import * as ResidentialUnits from '../modules/residentialUnits';
import * as Users from '../modules/users';
import RequireUnitMembership from './RequireUnitMembership.spec';

export default MiddlewareImpl.provides(
  databaseSchema,
  RequireUnitMembership,
  Memberships.CurrentUnitMembership,
  Effect.gen(function* () {
    const auth = yield* Auth;

    const identity = yield* auth.getUserIdentity.pipe(
      Effect.mapError(() => new Authentication.NoUserIdentityFoundError())
    );

    const externalOrganizationId = identity['org_id'];
    if (!Predicate.isString(externalOrganizationId))
      return yield* new Memberships.NoActiveResidentialUnitError();

    const [user, residentialUnit] = yield* Effect.all(
      [
        Users.getOneByIdentityTokenIdentifier(identity.tokenIdentifier).pipe(
          Users.isActiveOrNull
        ),
        ResidentialUnits.getOneByExternalOrganizationId(externalOrganizationId),
      ],
      { concurrency: 'unbounded' }
    );

    if (Predicate.isNull(residentialUnit))
      return yield* new Memberships.NoActiveResidentialUnitError();

    if (Predicate.isNull(user))
      return yield* new Memberships.MembershipRequiredError();

    const activeMemberships = yield* Memberships.listActiveByUser(user._id);
    const memberships = activeMemberships.filter(
      (membership) => membership.residentialUnitId === residentialUnit._id
    );

    if (memberships.length === 0)
      return yield* new Memberships.MembershipRequiredError();

    return { user, residentialUnit, memberships };
  })
);
