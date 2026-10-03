import { MiddlewareSpec } from '@confect/core';
import * as Schema from 'effect/Schema';

import * as AuthenticationDomain from '../modules/authentication/domain';
import * as MembershipsDomain from '../modules/memberships/domain';

/**
 * Guards every function that works inside one Unidad residencial: the unit is
 * the one `org_id` names in the access token, never an argument, and the caller
 * must hold an active local Membresía there.
 */
export default class RequireUnitMembership extends MiddlewareSpec.MiddlewareSpec<
  RequireUnitMembership,
  { provides: MembershipsDomain.CurrentUnitMembership }
>()('RequireUnitMembership', {
  error: () =>
    Schema.Union([
      AuthenticationDomain.NoUserIdentityFoundError,
      MembershipsDomain.NoActiveResidentialUnitError,
      MembershipsDomain.MembershipRequiredError,
    ]),
  functionTypes: { query: true, mutation: true, action: false },
}) {}
