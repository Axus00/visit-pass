import { Outlet, createFileRoute } from '@tanstack/react-router';

import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/admin'
)({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <MembershipRouteFeat.RequireRole role="administrator">
      <Outlet />
    </MembershipRouteFeat.RequireRole>
  );
}
