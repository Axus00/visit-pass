import { Outlet, createFileRoute } from '@tanstack/react-router';

import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';
import * as ResidenteRouteFeat from '#routes/_authenticated/app/m/$membershipId/residente/-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/residente'
)({
  component: ResidenteLayout,
});

function ResidenteLayout() {
  return (
    <MembershipRouteFeat.RequireRole role="resident">
      <ResidenteRouteFeat.ArrivalsNotifier />
      <Outlet />
    </MembershipRouteFeat.RequireRole>
  );
}
