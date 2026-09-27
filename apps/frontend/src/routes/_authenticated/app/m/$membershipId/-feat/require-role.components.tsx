import type { ReactNode } from 'react';

import { Navigate } from '@tanstack/react-router';

import type * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';

import { useCurrentMembership } from './membership-context';

/** Sends a Membresía with another Rol to its own panel instead of this one. */
export function RequireRole({
  role,
  children,
}: {
  role: VisitPass.Role;
  children: ReactNode;
}) {
  const membership = useCurrentMembership();

  if (membership.role !== role)
    return (
      <Navigate
        to={AppRouteFeat.ROLE_HOME_PATH[membership.role]}
        params={{ membershipId: membership.membershipId }}
        replace
      />
    );

  return <>{children}</>;
}
