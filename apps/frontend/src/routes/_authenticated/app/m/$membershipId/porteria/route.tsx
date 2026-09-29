import { useEffect } from 'react';

import { Outlet, createFileRoute } from '@tanstack/react-router';

import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import * as PorteriaRouteFeat from './-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/porteria'
)({
  component: PorteriaLayout,
});

function PorteriaLayout() {
  return (
    <MembershipRouteFeat.RequireRole role="porter">
      <ShiftStatusTopBarAction />
      <Outlet />
    </MembershipRouteFeat.RequireRole>
  );
}

/** Puts the Turno status chip in the top bar while a portería page is open. */
function ShiftStatusTopBarAction() {
  const { setTopBarActions } = MembershipRouteFeat.useTopBarActionsSlot();

  useEffect(() => {
    setTopBarActions(<PorteriaRouteFeat.ShiftStatusChip />);

    return () => setTopBarActions(null);
  }, [setTopBarActions]);

  return null;
}
