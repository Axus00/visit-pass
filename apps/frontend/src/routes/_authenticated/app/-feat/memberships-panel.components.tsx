import { useState } from 'react';

import { QueryResult, useMutation, useQuery } from '@confect/react';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';

import refs from '@repo/backend/refs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Skeleton,
  toast,
} from '@repo/ui';

import { InviteMembershipDialog } from './invite-membership-dialog.components';
import { OptionSelect } from './option-select.components';
import {
  type GroupingWord,
  type MembershipId,
  type MembershipSummary,
  OCCUPANCY_TYPE_OPTIONS,
  type OccupancyType,
  formatInvitationDelivery,
  formatMemberName,
  formatMembershipStatus,
  formatRoleWithApartment,
  formatUnitAccessError,
} from './unit-access.models';

/** The Administrador's view of every Membresía in the active Unidad residencial. */
export function MembershipsPanel({
  groupingWord,
  ownMembershipIds,
  now,
}: {
  groupingWord: GroupingWord;
  ownMembershipIds: ReadonlyArray<MembershipId>;
  now: number;
}) {
  const memberships = useQuery(refs.public.memberships.list, {});
  const apartments = useQuery(refs.public.apartments.list, {});
  const revoke = useMutation(refs.public.memberships.revoke);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [membershipToRevoke, setMembershipToRevoke] =
    useState<MembershipSummary | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const revokeMembership = async (membership: MembershipSummary) => {
    setIsRevoking(true);
    const result = await revoke({ membershipId: membership._id });
    setIsRevoking(false);

    if (Result.isFailure(result)) {
      toast.error(formatUnitAccessError(result.failure));
      return;
    }

    toast.success('Membresía revocada.');
    setMembershipToRevoke(null);
  };

  if (QueryResult.isFailure(memberships))
    return (
      <p className="text-sm text-destructive" role="alert">
        {formatUnitAccessError(memberships.error)}
      </p>
    );

  if (!QueryResult.isSuccess(memberships))
    return <Skeleton className="h-40 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsInviteOpen(true)}>Invitar</Button>
      </div>

      {memberships.value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Esta Unidad residencial aún no tiene Membresías.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {memberships.value.map((membership) => (
            <MembershipListItem
              key={membership._id}
              membership={membership}
              groupingWord={groupingWord}
              isOwnMembership={ownMembershipIds.includes(membership._id)}
              now={now}
              onRevoke={setMembershipToRevoke}
            />
          ))}
        </ul>
      )}

      <InviteMembershipDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        apartments={QueryResult.isSuccess(apartments) ? apartments.value : []}
        groupingWord={groupingWord}
      />

      <AlertDialog
        open={Predicate.isNotNull(membershipToRevoke)}
        onOpenChange={(open) => {
          if (open) return;

          setMembershipToRevoke(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revocar Membresía</AlertDialogTitle>
            <AlertDialogDescription>
              La Membresía de {membershipToRevoke?.name} se revoca de inmediato
              y no se puede deshacer. Volver a invitar a la persona crea una
              Membresía nueva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isRevoking}
              onClick={() => {
                if (Predicate.isNull(membershipToRevoke)) return;

                void revokeMembership(membershipToRevoke);
              }}
            >
              Revocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MembershipListItem({
  membership,
  groupingWord,
  isOwnMembership,
  now,
  onRevoke,
}: {
  membership: MembershipSummary;
  groupingWord: GroupingWord;
  isOwnMembership: boolean;
  now: number;
  onRevoke: (membership: MembershipSummary) => void;
}) {
  const resendInvitation = useMutation(
    refs.public.memberships.resendInvitation
  );
  const withdrawInvitation = useMutation(
    refs.public.memberships.withdrawInvitation
  );
  const updateOccupancyType = useMutation(
    refs.public.memberships.updateOccupancyType
  );
  const [isBusy, setIsBusy] = useState(false);

  const isPending = membership.status === 'pending';
  const isActive = membership.status === 'active';
  const isRevoked = membership.status === 'revoked';
  // The backend refuses it too: an Administrador cannot revoke their own Administrador Membresía.
  const isOwnAdministratorMembership =
    isOwnMembership && membership.role === 'administrator';
  const canRevoke = isActive && !isOwnAdministratorMembership;
  const canEditOccupancyType =
    isActive &&
    membership.role === 'resident' &&
    Predicate.isNotUndefined(membership.occupancyType);

  const resend = async () => {
    setIsBusy(true);
    const result = await resendInvitation({ membershipId: membership._id });
    setIsBusy(false);

    if (Result.isFailure(result)) {
      toast.error(formatUnitAccessError(result.failure));
      return;
    }

    toast.success('Invitación reenviada.');
  };

  const withdraw = async () => {
    setIsBusy(true);
    const result = await withdrawInvitation({ membershipId: membership._id });
    setIsBusy(false);

    if (Result.isFailure(result)) {
      toast.error(formatUnitAccessError(result.failure));
      return;
    }

    toast.success('Invitación retirada.');
  };

  const changeOccupancyType = async (occupancyType: OccupancyType) => {
    setIsBusy(true);
    const result = await updateOccupancyType({
      membershipId: membership._id,
      occupancyType,
    });
    setIsBusy(false);

    if (Result.isFailure(result)) {
      toast.error(formatUnitAccessError(result.failure));
      return;
    }

    toast.success('Tipo de ocupación actualizado.');
  };

  return (
    <li className="flex flex-col gap-3 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">
            {formatMemberName(membership)}
          </span>
          <span className="truncate text-sm text-muted-foreground">
            {membership.email}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatRoleWithApartment(membership, groupingWord)}
          </span>
        </div>
        {isRevoked ? null : (
          <Badge variant={isActive ? 'default' : 'outline'}>
            {formatMembershipStatus(membership, now)}
          </Badge>
        )}
      </div>

      {isPending ? (
        <p className="text-xs text-muted-foreground">
          {formatInvitationDelivery(membership.invitationDelivery)}
        </p>
      ) : null}

      {canEditOccupancyType ? (
        <OptionSelect
          label="Tipo de ocupación"
          value={membership.occupancyType ?? null}
          options={OCCUPANCY_TYPE_OPTIONS}
          onValueChange={(occupancyType) =>
            void changeOccupancyType(occupancyType)
          }
          disabled={isBusy}
        />
      ) : null}

      {isPending ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => void withdraw()}
          >
            Retirar
          </Button>
          <Button size="sm" disabled={isBusy} onClick={() => void resend()}>
            Reenviar
          </Button>
        </div>
      ) : null}

      {canRevoke ? (
        <div className="flex justify-end">
          <Button
            variant="destructive"
            size="sm"
            disabled={isBusy}
            onClick={() => onRevoke(membership)}
          >
            Revocar
          </Button>
        </div>
      ) : null}
    </li>
  );
}
