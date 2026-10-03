import * as Context from 'effect/Context';

import type {
  MembershipsDoc,
  ResidentialUnitsDoc,
} from '../../../_generated/docs';
import type * as UsersDomain from '../../users/domain';

/**
 * The caller's standing in the Unidad residencial their token names:
 * `RequireUnitMembership` provides it only when at least one Membresía there is
 * active. Authorization reads these local rows, never the token's role claim.
 */
export class CurrentUnitMembership extends Context.Service<
  CurrentUnitMembership,
  {
    readonly user: UsersDomain.ActiveUsersDoc;
    readonly residentialUnit: ResidentialUnitsDoc;
    readonly memberships: ReadonlyArray<MembershipsDoc>;
  }
>()('@repo/backend/confect/modules/memberships/domain/CurrentUnitMembership') {}
