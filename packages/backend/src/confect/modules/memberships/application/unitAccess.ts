import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import * as WorkOSApplication from '../../workos/application';
import * as Domain from '../domain';

// -*******************************************************************************-
// API
// -*******************************************************************************-

/**
 * Makes the WorkOS organization membership mirror the local Membresías of one
 * Usuario in one Unidad residencial. It is idempotent, so the scheduler, the
 * WorkOS events and the unit switcher may all run it for the same pair.
 */
export const reconcileUnitAccess = Effect.fn('Memberships.reconcileUnitAccess')(
  function* (target: Domain.UnitAccessTarget) {
    const workos = yield* WorkOSApplication.WorkOSService;

    const current = yield* workos.organizationMemberships.getOne({
      externalUserId: target.externalUserId,
      externalOrganizationId: target.externalOrganizationId,
    });

    const plan = Domain.planUnitAccess({
      current,
      roles: target.roles,
      hasPendingInvitation: target.hasPendingInvitation,
    });

    yield* Match.value(plan).pipe(
      Match.when({ type: 'keep' }, () => Effect.void),
      Match.when({ type: 'grant' }, ({ roleSlugs }) =>
        workos.organizationMemberships.grant({
          externalUserId: target.externalUserId,
          externalOrganizationId: target.externalOrganizationId,
          roleSlugs,
          current,
        })
      ),
      Match.when({ type: 'withdraw' }, ({ externalMembershipId }) =>
        workos.organizationMemberships.deactivate({ externalMembershipId })
      ),
      Match.exhaustive
    );
  }
);
