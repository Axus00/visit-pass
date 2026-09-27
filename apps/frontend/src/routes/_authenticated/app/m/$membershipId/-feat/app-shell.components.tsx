import type { ReactNode } from 'react';

import { Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@workos-inc/authkit-react';
import {
  ArrowLeftRight,
  Check,
  ChevronsUpDown,
  LayoutGrid,
  LogOut,
  UserRound,
} from 'lucide-react';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from '@repo/ui';

import * as Authentication from '#modules/authentication';
import * as Theme from '#modules/theme';
import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';

import {
  useAllMemberships,
  useCurrentMembership,
  useIsSuperadmin,
  useTopBarActionsSlot,
} from './membership-context';
import { NAVIGATION, type NavItem } from './navigation.constant';

/**
 * Chrome for every Membresía panel: a navy sidebar on desktop and a bottom tab
 * bar on mobile, following the Visit Pass mockups.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const membership = useCurrentMembership();
  const navigation: ReadonlyArray<NavItem> = NAVIGATION[membership.role];
  const { topBarActions } = useTopBarActionsSlot();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="px-5 pt-6 pb-8">
          <AppRouteFeat.BrandMark className="text-sidebar-accent-foreground" />
        </div>
        <nav aria-label="Navegación principal" className="flex-1 px-3">
          <ul className="flex flex-col gap-1">
            {navigation.map((item) => (
              <li key={item.to}>
                <SidebarLink
                  item={item}
                  membershipId={membership.membershipId}
                />
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-3">
          <MembershipSwitcher />
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <p className="truncate font-semibold">
                {membership.residentialUnitName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {VisitPass.ROLE_LABELS[membership.role]}
                {membership.apartmentLabel
                  ? ` · ${membership.apartmentLabel}`
                  : null}
              </p>
            </div>
            {topBarActions}
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-6 pb-28 sm:px-6 lg:pt-8 lg:pb-12">
          {children}
        </main>
      </div>

      <MobileTabBar
        navigation={navigation}
        membershipId={membership.membershipId}
      />
    </div>
  );
}

function SidebarLink({
  item,
  membershipId,
}: {
  item: NavItem;
  membershipId: string;
}) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      params={{ membershipId }}
      activeOptions={{ exact: item.exact ?? false }}
      className="relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/85 transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-primary data-[status=active]:before:absolute data-[status=active]:before:inset-y-2 data-[status=active]:before:-left-3 data-[status=active]:before:w-1 data-[status=active]:before:rounded-r-full data-[status=active]:before:bg-sidebar-primary"
    >
      <Icon className="size-5" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

function MobileTabBar({
  navigation,
  membershipId,
}: {
  navigation: ReadonlyArray<NavItem>;
  membershipId: string;
}) {
  const mobileItems = navigation.filter((item) => item.showOnMobile);

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
        {mobileItems.map((item) => {
          const Icon = item.icon;

          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                params={{ membershipId }}
                activeOptions={{ exact: item.exact ?? false }}
                className="group flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[0.7rem] font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:text-primary"
              >
                <span className="grid h-8 w-12 place-items-center rounded-full transition-colors group-data-[status=active]:bg-primary group-data-[status=active]:text-primary-foreground">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {item.shortLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MembershipSwitcher() {
  const membership = useCurrentMembership();
  const memberships = useAllMemberships();
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/60 px-3 py-3 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            aria-label="Cambiar de Membresía"
          />
        }
      >
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-sidebar-accent-foreground">
            {membership.residentialUnitName}
          </span>
          <span className="truncate text-xs text-sidebar-primary">
            {VisitPass.ROLE_LABELS[membership.role]}
            {membership.apartmentLabel
              ? ` · ${membership.apartmentLabel}`
              : null}
          </span>
        </span>
        <ChevronsUpDown className="size-4 opacity-70" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-72">
        <MembershipMenuItems
          current={membership.membershipId}
          memberships={memberships}
          onSelect={(next) =>
            void navigate({
              to: AppRouteFeat.ROLE_HOME_PATH[next.role],
              params: { membershipId: next.membershipId },
            })
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MembershipMenuItems({
  current,
  memberships,
  onSelect,
}: {
  current: string;
  memberships: ReadonlyArray<VisitPass.MembershipSummary>;
  onSelect: (membership: VisitPass.MembershipSummary) => void;
}) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>Mis Membresías</DropdownMenuLabel>
      {memberships.map((candidate) => (
        <DropdownMenuItem
          key={candidate.membershipId}
          onClick={() => onSelect(candidate)}
          className="items-start"
        >
          <Check
            className={cn(
              'mt-0.5',
              candidate.membershipId === current ? 'opacity-100' : 'opacity-0'
            )}
            aria-hidden="true"
          />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">
              {candidate.residentialUnitName}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {VisitPass.ROLE_LABELS[candidate.role]}
              {candidate.apartmentLabel
                ? ` · ${candidate.apartmentLabel}`
                : null}
            </span>
          </span>
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  );
}

function UserMenu() {
  const { user } = useAuth();
  const membership = useCurrentMembership();
  const memberships = useAllMemberships();
  const isSuperadmin = useIsSuperadmin();
  const navigate = useNavigate();

  if (!user) return null;

  const displayName = Authentication.getUserDisplayName(
    user.firstName,
    user.lastName
  );
  const hasSeveralMemberships = memberships.length > 1;
  // With one Membresía and no Superadmin panel, `/app` redirects right back.
  const hasMembershipHub = hasSeveralMemberships || isSuperadmin;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Abrir menú de usuario"
          />
        }
      >
        <Avatar>
          <AvatarImage
            src={user.profilePictureUrl ?? undefined}
            alt={displayName}
            referrerPolicy="no-referrer"
          />
          <AvatarFallback>{VisitPass.initialsOf(displayName)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2 py-2">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        {hasSeveralMemberships ? (
          <>
            <div className="lg:hidden">
              <MembershipMenuItems
                current={membership.membershipId}
                memberships={memberships}
                onSelect={(next) =>
                  void navigate({
                    to: AppRouteFeat.ROLE_HOME_PATH[next.role],
                    params: { membershipId: next.membershipId },
                  })
                }
              />
              <DropdownMenuSeparator />
            </div>
          </>
        ) : null}
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={
              <Link to="/app/perfil">
                <UserRound />
                Mi perfil
              </Link>
            }
          />
          {hasMembershipHub ? (
            <DropdownMenuItem
              render={
                <Link to="/app">
                  {hasSeveralMemberships ? <ArrowLeftRight /> : <LayoutGrid />}
                  Todas mis Membresías
                </Link>
              }
            />
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <Theme.ThemeMenuItems />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link to="/signout">
              <LogOut />
              Cerrar sesión
            </Link>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
