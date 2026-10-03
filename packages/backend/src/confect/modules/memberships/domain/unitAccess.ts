import * as Predicate from 'effect/Predicate';

import { type Role, toExternalRoleSlugs } from './roles';

/** The WorkOS organization membership of one Usuario in one Unidad residencial. */
export type ExternalUnitAccess = {
  readonly id: string;
  readonly status: 'active' | 'inactive' | 'pending';
  readonly roleSlugs: ReadonlyArray<string>;
};

export type UnitAccessPlan =
  | { readonly type: 'keep' }
  | { readonly type: 'grant'; readonly roleSlugs: ReadonlyArray<string> }
  | { readonly type: 'withdraw'; readonly externalMembershipId: string };

/**
 * Decides how WorkOS must change to mirror the local Membresías (ADR 0008):
 * access exists while one is active and carries the union of their Roles. A
 * Usuario who only has an Invitación to answer keeps whatever WorkOS gave them
 * through its link, so answering does not sign them out mid-way.
 */
export const planUnitAccess = (args: {
  readonly current: ExternalUnitAccess | null;
  readonly roles: ReadonlyArray<Role>;
  readonly hasPendingInvitation: boolean;
}): UnitAccessPlan => {
  const { current, roles, hasPendingInvitation } = args;
  const roleSlugs = toExternalRoleSlugs(roles);
  const hasActiveRoles = roleSlugs.length > 0;
  const isCurrentlyActive =
    Predicate.isNotNull(current) && current.status === 'active';

  if (hasActiveRoles) {
    const mirrorsRoles =
      isCurrentlyActive &&
      current.roleSlugs.length === roleSlugs.length &&
      roleSlugs.every((slug) => current.roleSlugs.includes(slug));

    return mirrorsRoles ? { type: 'keep' } : { type: 'grant', roleSlugs };
  }

  const shouldWithdraw = isCurrentlyActive && !hasPendingInvitation;

  return shouldWithdraw
    ? { type: 'withdraw', externalMembershipId: current.id }
    : { type: 'keep' };
};
