import { Outlet, createFileRoute } from '@tanstack/react-router';
import { ShieldAlert } from 'lucide-react';

import * as CommonUI from '#modules/common-ui';
import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';

import * as MembershipRouteFeat from './-feat';

export const Route = createFileRoute('/_authenticated/app/m/$membershipId')({
  component: MembershipLayout,
});

/** Resolves the Membresía in the URL against the caller's own access. */
function MembershipLayout() {
  const { membershipId } = Route.useParams();
  const access = AppRouteFeat.useMyAccess();

  if (access === null)
    return <CommonUI.GlobalSpinner message="Cargando tu Membresía" />;

  const membership = access.memberships.find(
    (candidate) => candidate.membershipId === membershipId
  );

  if (!membership)
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-6">
        <VisitPass.EmptyState
          icon={ShieldAlert}
          title="Esta Membresía no está disponible"
          description="Pudo haber sido revocada o pertenece a otra cuenta."
          action={
            <CommonUI.NavLinkButton to="/app" variant="default">
              Ver mis Membresías
            </CommonUI.NavLinkButton>
          }
        />
      </main>
    );

  return (
    <MembershipRouteFeat.MembershipProvider
      membership={membership}
      memberships={access.memberships}
    >
      <MembershipRouteFeat.AppShell>
        <Outlet />
      </MembershipRouteFeat.AppShell>
    </MembershipRouteFeat.MembershipProvider>
  );
}
