import { Navigate, createFileRoute } from '@tanstack/react-router';

import * as AppRouteFeat from '#routes/_authenticated/app/-feat';

import * as MembershipRouteFeat from './-feat';

export const Route = createFileRoute('/_authenticated/app/m/$membershipId/')({
  component: MembershipIndex,
});

function MembershipIndex() {
  const membership = MembershipRouteFeat.useCurrentMembership();

  return (
    <Navigate
      to={AppRouteFeat.ROLE_HOME_PATH[membership.role]}
      params={{ membershipId: membership.membershipId }}
      replace
    />
  );
}
