import { QueryResult, useQuery } from '@confect/react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@workos-inc/authkit-react';
import * as Predicate from 'effect/Predicate';
import {
  ArrowLeft,
  ChevronRight,
  Crown,
  DoorOpen,
  Home,
  KeyRound,
  LogOut,
  type LucideIcon,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';

import refs from '@repo/backend/refs';
import * as CalendarShared from '@repo/backend/shared/calendar';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  cn,
} from '@repo/ui';

import * as Authentication from '#modules/authentication';
import * as CommonUI from '#modules/common-ui';
import * as Theme from '#modules/theme';
import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';

export const Route = createFileRoute('/_authenticated/app/perfil/')({
  component: ProfilePage,
});

const ROLE_ICONS = {
  resident: Home,
  porter: DoorOpen,
  administrator: ShieldCheck,
} as const satisfies Record<VisitPass.Role, unknown>;

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Oscuro', Icon: Moon },
  { value: 'system', label: 'Según el sistema', Icon: Monitor },
] as const satisfies ReadonlyArray<{
  value: Theme.ThemePreference;
  label: string;
  Icon: LucideIcon;
}>;

/** The signed-in Usuario: identity, Membresías, appearance and sign-out. */
function ProfilePage() {
  const { user } = useAuth();
  const me = useQuery(refs.public.users.me, {});
  const access = AppRouteFeat.useMyAccess();
  const storedUser = QueryResult.isSuccess(me) ? me.value : null;

  const firstName = user?.firstName ?? storedUser?.firstName ?? null;
  const lastName = user?.lastName ?? storedUser?.lastName ?? null;
  const email = user?.email ?? storedUser?.email ?? '';
  const hasName =
    Predicate.isNotNull(firstName) || Predicate.isNotNull(lastName);
  const displayName = hasName
    ? Authentication.getUserDisplayName(firstName, lastName)
    : email || 'Tu cuenta';
  const pictureUrl = user?.profilePictureUrl ?? storedUser?.profilePictureUrl;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
          <AppRouteFeat.BrandMark />
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
        <CommonUI.NavLinkButton
          to="/app"
          variant="ghost"
          className="-ml-2 w-fit"
        >
          <ArrowLeft aria-hidden="true" />
          Mis Membresías
        </CommonUI.NavLinkButton>
        <VisitPass.PageHeader title="Mi perfil" />

        <Card>
          <CardContent className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <Avatar className="size-20">
              <AvatarImage
                src={pictureUrl ?? undefined}
                alt={displayName}
                referrerPolicy="no-referrer"
              />
              <AvatarFallback className="text-xl">
                {VisitPass.initialsOf(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-xl font-semibold">{displayName}</p>
              <p className="break-all text-muted-foreground">{email}</p>
              {Predicate.isNotNull(storedUser) &&
              Predicate.isNotNull(storedUser.lastSignInAt) ? (
                <p className="text-xs text-muted-foreground">
                  Último inicio de sesión:{' '}
                  {VisitPass.formatDateTime(
                    storedUser.lastSignInAt,
                    CalendarShared.DEFAULT_TIME_ZONE
                  )}
                </p>
              ) : null}
            </div>
          </CardContent>
          <CardContent>
            <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
              <KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Tu nombre, correo, foto y contraseña los administra el proveedor
              de inicio de sesión. Cámbialos allí; aquí se actualizan en tu
              próximo ingreso.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mis Membresías</CardTitle>
            <CardDescription>
              Las Unidades residenciales donde tienes un Rol.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MembershipLinks access={access} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Apariencia</CardTitle>
            <CardDescription>Se guarda en este dispositivo.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeChooser />
          </CardContent>
        </Card>

        <CommonUI.NavLinkButton
          to="/signout"
          variant="destructive"
          size="lg"
          className="w-full sm:w-fit"
        >
          <LogOut aria-hidden="true" />
          Cerrar sesión
        </CommonUI.NavLinkButton>
      </main>
    </div>
  );
}

function MembershipLinks({
  access,
}: {
  access: ReturnType<typeof AppRouteFeat.useMyAccess>;
}) {
  if (Predicate.isNull(access))
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    );

  const hasNoAccess = access.memberships.length === 0 && !access.isSuperadmin;

  if (hasNoAccess)
    return (
      <p className="rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
        Aún no tienes Membresías. Pide a la administración de tu Unidad
        residencial que te invite con el correo con el que iniciaste sesión.
      </p>
    );

  return (
    <ul className="flex flex-col divide-y rounded-xl border">
      {access.memberships.map((membership) => {
        const Icon = ROLE_ICONS[membership.role];

        return (
          <li key={membership.membershipId}>
            <Link
              to={AppRouteFeat.ROLE_HOME_PATH[membership.role]}
              params={{ membershipId: membership.membershipId }}
              className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent/60 focus-visible:bg-accent"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {membership.residentialUnitName}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {VisitPass.ROLE_LABELS[membership.role]}
                  {membership.apartmentLabel
                    ? ` · ${membership.apartmentLabel}`
                    : null}
                  {membership.occupancyType
                    ? ` · ${VisitPass.OCCUPANCY_LABELS[membership.occupancyType]}`
                    : null}
                </span>
              </span>
              <ChevronRight
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        );
      })}
      {access.isSuperadmin ? (
        <li>
          <Link
            to="/app/superadmin"
            className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent/60 focus-visible:bg-accent"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-navy text-navy-foreground">
              <Crown className="size-5" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">Superadmin</span>
              <span className="text-sm text-muted-foreground">
                Unidades residenciales de la plataforma
              </span>
            </span>
            <ChevronRight
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          </Link>
        </li>
      ) : null}
    </ul>
  );
}

function ThemeChooser() {
  const { preference } = Theme.useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Apariencia"
      className="grid gap-2 sm:grid-cols-3"
    >
      {THEME_OPTIONS.map(({ value, label, Icon }) => {
        const isSelected = preference === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => Theme.setThemePreference(value)}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'hover:bg-accent/60'
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
