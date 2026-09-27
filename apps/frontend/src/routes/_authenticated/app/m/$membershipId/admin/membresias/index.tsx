import { useState } from 'react';

import { useMutation, useQuery } from '@confect/react';
import { createFileRoute } from '@tanstack/react-router';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';
import { Link2, MailQuestion, UserPlus, UserX, Users } from 'lucide-react';

import refs from '@repo/backend/refs';
import {
  Badge,
  Button,
  Card,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
  toast,
} from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';
import * as AdminRouteFeat from '#routes/_authenticated/app/m/$membershipId/admin/-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/admin/membresias/'
)({
  component: AdminMembershipsPage,
});

type RoleTab = VisitPass.Role | 'all';
type StatusFilter = AdminRouteFeat.MembershipStatus | 'all';

const ROLE_TABS = [
  { value: 'all', label: 'Todas' },
  { value: 'resident', label: 'Residentes' },
  { value: 'porter', label: 'Porteros' },
  { value: 'administrator', label: 'Administradores' },
] as const satisfies ReadonlyArray<{ value: RoleTab; label: string }>;

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'active', label: 'Activas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'revoked', label: 'Revocadas' },
] as const satisfies ReadonlyArray<AdminRouteFeat.SelectOption<StatusFilter>>;

const STATUS_BADGES = {
  active: 'success',
  pending: 'warning',
  revoked: 'outline',
} as const satisfies Record<AdminRouteFeat.MembershipStatus, string>;

/** Everyone with access to the unit: invite, filter and revoke Membresías. */
function AdminMembershipsPage() {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const [roleTab, setRoleTab] = useState<RoleTab>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const memberships = useQuery(refs.public.memberships.listForUnit, {
    membershipId: membership.membershipId,
  });

  return (
    <>
      <VisitPass.PageHeader
        eyebrow="Personas"
        title="Membresías"
        description="Residentes, Porteros y Administradores de la unidad. Una invitación queda pendiente hasta que la persona inicia sesión con su correo."
        actions={
          <Button onClick={() => setIsInviteOpen(true)}>
            <UserPlus aria-hidden="true" />
            Invitar persona
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Tabs
            value={roleTab}
            onValueChange={(value) => setRoleTab(value as RoleTab)}
          >
            <TabsList>
              {ROLE_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <AdminRouteFeat.SelectField
          label="Estado"
          hideLabel
          value={status}
          onValueChange={setStatus}
          options={STATUS_OPTIONS}
          className="sm:w-52"
        />
      </div>

      <AdminRouteFeat.QueryView
        result={memberships}
        loading={
          <Card className="gap-2 p-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </Card>
        }
      >
        {(value) => {
          const filtered = value
            .filter(
              (candidate) =>
                (roleTab === 'all' || candidate.role === roleTab) &&
                (status === 'all' || candidate.status === status)
            )
            // Newest first, with revoked ones after the rest.
            .sort((left, right) => {
              const leftRevoked = left.status === 'revoked' ? 1 : 0;
              const rightRevoked = right.status === 'revoked' ? 1 : 0;

              if (leftRevoked !== rightRevoked)
                return leftRevoked - rightRevoked;

              return right._creationTime - left._creationTime;
            });

          if (filtered.length === 0)
            return (
              <VisitPass.EmptyState
                icon={Users}
                title="No hay Membresías con estos filtros"
                description="Invita a una persona o cambia el Rol y el estado."
                action={
                  <Button
                    variant="outline"
                    onClick={() => setIsInviteOpen(true)}
                  >
                    <UserPlus aria-hidden="true" />
                    Invitar persona
                  </Button>
                }
              />
            );

          return (
            <Card className="gap-0 py-0">
              <ul className="flex flex-col divide-y">
                {filtered.map((member) => (
                  <MembershipRow
                    key={member._id}
                    member={member}
                    isCurrent={member._id === membership.membershipId}
                  />
                ))}
              </ul>
            </Card>
          );
        }}
      </AdminRouteFeat.QueryView>

      <AdminRouteFeat.InviteMemberDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
      />
    </>
  );
}

function MembershipRow({
  member,
  isCurrent,
}: {
  member: AdminRouteFeat.MembershipDetail;
  isCurrent: boolean;
}) {
  const displayName = member.name ?? member.email;
  const isPending = member.status === 'pending';
  const canRevoke = !isCurrent && member.status !== 'revoked';

  return (
    <li
      className={cn(
        'flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4',
        member.status === 'revoked' && 'opacity-70'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <VisitPass.InitialsAvatar
          initials={VisitPass.initialsOf(displayName)}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-medium">{displayName}</span>
            {isCurrent ? <Badge variant="outline">Tú</Badge> : null}
          </p>
          {Predicate.isUndefined(member.name) ? null : (
            <p className="truncate text-sm text-muted-foreground">
              {member.email}
            </p>
          )}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {VisitPass.ROLE_LABELS[member.role]}
            </span>
            {Predicate.isNotUndefined(member.apartmentLabel) ? (
              <span>{member.apartmentLabel}</span>
            ) : null}
            {Predicate.isNotUndefined(member.occupancyType) ? (
              <span>{VisitPass.OCCUPANCY_LABELS[member.occupancyType]}</span>
            ) : null}
          </p>
          {isPending ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MailQuestion className="size-3.5" aria-hidden="true" />
              Pendiente de inicio de sesión
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-13 sm:pl-0">
        <Badge variant={STATUS_BADGES[member.status]}>
          {AdminRouteFeat.MEMBERSHIP_STATUS_LABELS[member.status]}
        </Badge>
        {isPending ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void AdminRouteFeat.copyAppLink()}
          >
            <Link2 aria-hidden="true" />
            Copiar enlace de la app
          </Button>
        ) : null}
        {canRevoke ? <RevokeMembershipDialog member={member} /> : null}
      </div>
    </li>
  );
}

/** "Revocar" button that confirms, then revokes the Membresía. */
function RevokeMembershipDialog({
  member,
}: {
  member: AdminRouteFeat.MembershipDetail;
}) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const revoke = useMutation(refs.public.memberships.revoke);
  const displayName = member.name ?? member.email;
  const apartmentSuffix = member.apartmentLabel
    ? ` en ${member.apartmentLabel}`
    : '';

  const handleRevoke = async () => {
    const result = await AppRouteFeat.settleMutation(
      revoke({
        membershipId: membership.membershipId,
        targetMembershipId: member._id,
      })
    );

    if (Result.isFailure(result)) {
      toast.error(VisitPass.describeBackendError(result.failure));
      return false;
    }

    toast.success(`Revocaste la Membresía de ${displayName}.`);
    return true;
  };

  return (
    <MembershipRouteFeat.ConfirmActionDialog
      trigger={<Button variant="ghost" size="sm" />}
      triggerContent={
        <>
          <UserX aria-hidden="true" />
          Revocar
        </>
      }
      title="¿Revocar esta Membresía?"
      description={`${displayName} dejará de tener acceso como ${VisitPass.ROLE_LABELS[member.role]}${apartmentSuffix}. La Membresía queda en el historial, así que las Visitas pasadas siguen mostrando quién las registró, y las Autorizaciones del Apartamento no se cancelan.`}
      confirmLabel="Revocar"
      destructive
      onConfirm={handleRevoke}
    />
  );
}
