import { Link, Navigate, createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@workos-inc/authkit-react';
import * as Predicate from 'effect/Predicate';
import {
  Building2,
  ChevronRight,
  Crown,
  DoorOpen,
  Home,
  MailQuestion,
  ShieldCheck,
} from 'lucide-react';

import { Card, Skeleton } from '@repo/ui';

import * as Authentication from '#modules/authentication';
import * as VisitPass from '#modules/visit-pass';

import * as AppRouteFeat from './-feat';

export const Route = createFileRoute('/_authenticated/app/')({
  component: AppHubPage,
});

const ROLE_ICONS = {
  resident: Home,
  porter: DoorOpen,
  administrator: ShieldCheck,
} as const satisfies Record<VisitPass.Role, unknown>;

/** Lists the caller's Membresías; with exactly one, goes straight to its panel. */
function AppHubPage() {
  const { user } = useAuth();
  const access = AppRouteFeat.useMyAccess();

  const hasSingleMembership =
    Predicate.isNotNull(access) &&
    access.memberships.length === 1 &&
    !access.isSuperadmin;
  const singleMembership = hasSingleMembership
    ? access.memberships[0]
    : undefined;

  if (Predicate.isNotUndefined(singleMembership)) {
    return (
      <Navigate
        to={AppRouteFeat.ROLE_HOME_PATH[singleMembership.role]}
        params={{ membershipId: singleMembership.membershipId }}
        replace
      />
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
          <AppRouteFeat.BrandMark />
          <Authentication.UserAvatarMenu user={user} />
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <VisitPass.PageHeader
          eyebrow="Bienvenido"
          title="¿Dónde vas a trabajar hoy?"
          description="Elige la Unidad residencial y el Rol con el que quieres entrar."
        />
        {Predicate.isNull(access) ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : (
          <MembershipList access={access} />
        )}
      </main>
    </div>
  );
}

function MembershipList({
  access,
}: {
  access: NonNullable<ReturnType<typeof AppRouteFeat.useMyAccess>>;
}) {
  const hasNoAccess = access.memberships.length === 0 && !access.isSuperadmin;

  if (hasNoAccess)
    return (
      <VisitPass.EmptyState
        icon={MailQuestion}
        title="Aún no tienes Membresías"
        description="Pide a la administración de tu copropiedad que te invite con el correo con el que iniciaste sesión. Tu acceso se activa en cuanto vuelvas a entrar."
      />
    );

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {access.memberships.map((membership) => {
        const Icon = ROLE_ICONS[membership.role];

        return (
          <li key={membership.membershipId}>
            <Link
              to={AppRouteFeat.ROLE_HOME_PATH[membership.role]}
              params={{ membershipId: membership.membershipId }}
              className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Card className="flex-row items-center gap-4 px-5 py-5 transition-colors group-hover:bg-accent/60">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    {VisitPass.ROLE_LABELS[membership.role]}
                  </p>
                  <p className="truncate font-semibold">
                    {membership.residentialUnitName}
                  </p>
                  {Predicate.isNotUndefined(membership.apartmentLabel) ? (
                    <p className="truncate text-sm text-muted-foreground">
                      {membership.apartmentLabel}
                      {Predicate.isNotUndefined(membership.occupancyType)
                        ? ` · ${VisitPass.OCCUPANCY_LABELS[membership.occupancyType]}`
                        : null}
                    </p>
                  ) : null}
                </div>
                <ChevronRight
                  className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Card>
            </Link>
          </li>
        );
      })}
      {access.isSuperadmin ? (
        <li>
          <Link
            to="/app/superadmin"
            className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="flex-row items-center gap-4 bg-navy px-5 py-5 text-navy-foreground ring-0 transition-opacity group-hover:opacity-95">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/10">
                <Crown className="size-6" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-xs font-semibold tracking-[0.08em] uppercase opacity-80">
                  Plataforma
                </p>
                <p className="font-semibold">Superadmin</p>
                <p className="flex items-center gap-1.5 text-sm opacity-80">
                  <Building2 className="size-3.5" aria-hidden="true" />
                  Unidades residenciales
                </p>
              </div>
              <ChevronRight className="size-5 opacity-70" aria-hidden="true" />
            </Card>
          </Link>
        </li>
      ) : null}
    </ul>
  );
}
