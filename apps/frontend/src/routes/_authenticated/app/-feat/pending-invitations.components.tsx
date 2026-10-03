import { useState } from 'react';

import { useMutation } from '@confect/react';
import * as Result from 'effect/Result';

import refs from '@repo/backend/refs';
import * as MembershipsShared from '@repo/backend/shared/memberships';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  toast,
} from '@repo/ui';

import {
  type PendingInvitation,
  formatRoleWithApartment,
  formatUnitAccessError,
} from './unit-access.models';

/** The Membresías pendientes the signed-in Usuario still has to answer. */
export function PendingInvitations({
  invitations,
  now,
}: {
  invitations: ReadonlyArray<PendingInvitation>;
  now: number;
}) {
  return (
    <section className="flex flex-col gap-3" aria-label="Invitaciones">
      {invitations.map((invitation) => (
        <PendingInvitationCard
          key={invitation._id}
          invitation={invitation}
          now={now}
        />
      ))}
    </section>
  );
}

function PendingInvitationCard({
  invitation,
  now,
}: {
  invitation: PendingInvitation;
  now: number;
}) {
  const accept = useMutation(refs.public.memberships.accept);
  const reject = useMutation(refs.public.memberships.reject);
  const [isAnswering, setIsAnswering] = useState(false);

  const isExpired = MembershipsShared.isInvitationExpired(invitation, now);
  const { residentialUnit } = invitation;

  const acceptInvitation = async () => {
    setIsAnswering(true);
    const result = await accept({ membershipId: invitation._id });
    setIsAnswering(false);

    if (Result.isFailure(result)) {
      toast.error(formatUnitAccessError(result.failure));
      return;
    }

    toast.success(`Aceptaste la Invitación a ${residentialUnit.name}.`);
  };

  const rejectInvitation = async () => {
    setIsAnswering(true);
    const result = await reject({ membershipId: invitation._id });
    setIsAnswering(false);

    if (Result.isFailure(result)) {
      toast.error(formatUnitAccessError(result.failure));
      return;
    }

    toast.success('Rechazaste la Invitación.');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Te invitaron a {residentialUnit.name} como{' '}
          {formatRoleWithApartment(invitation, residentialUnit.groupingWord)}
        </CardTitle>
      </CardHeader>
      {isExpired ? (
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">Caducada</Badge>
          <p>
            Esta Invitación caducó. Pide a la administración de la unidad que la
            reenvíe.
          </p>
        </CardContent>
      ) : null}
      <CardFooter className="flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          disabled={isAnswering}
          onClick={() => void rejectInvitation()}
        >
          No soy yo
        </Button>
        {isExpired ? null : (
          <Button
            disabled={isAnswering}
            onClick={() => void acceptInvitation()}
          >
            Aceptar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
