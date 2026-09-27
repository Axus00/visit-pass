import { useState } from 'react';

import { useMutation } from '@confect/react';
import * as Result from 'effect/Result';
import { CalendarDays, RefreshCw, Share2, XCircle } from 'lucide-react';

import refs from '@repo/backend/refs';
import { Badge, Button, Card, toast } from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import {
  type AuthorizationTab,
  describePassBadge,
  formatEntryCount,
  partitionReplacedPasses,
} from './authorizations.utils';
import type { PassSummary, SharedAuthorization } from './authorize.models';
import { ConfirmActionDialog } from './confirm-action-dialog.components';
import { describePassValidity } from './pass-share.utils';

const COLLAPSED_PASSES = 5;

/**
 * One Autorización with its Pases: share or regenerate each Pase, or cancel
 * the whole Autorización while it is vigente.
 */
export function AuthorizationCard({
  authorization,
  tab,
  onShare,
}: {
  authorization: VisitPass.AuthorizationSummary;
  tab: AuthorizationTab;
  onShare: (shared: SharedAuthorization) => void;
}) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const cancel = useMutation(refs.public.authorizations.cancel);
  const regeneratePass = useMutation(refs.public.authorizations.regeneratePass);
  const [showAllPasses, setShowAllPasses] = useState(false);
  const now = VisitPass.useNow();

  const isCurrent = tab === 'current';
  const isAuthorizationPast =
    tab === 'past' ||
    authorization.endDate <
      VisitPass.todayIn(membership.residentialUnitTimeZone, now);
  const { live, replaced } = partitionReplacedPasses(authorization.passes);
  const activePasses = live.filter((pass) => pass.status === 'active');
  const visiblePasses = showAllPasses ? live : live.slice(0, COLLAPSED_PASSES);
  const hiddenPassCount = live.length - visiblePasses.length;
  const canShareAll = isCurrent && activePasses.length > 1;
  const title =
    authorization.eventName ??
    (authorization.type === 'event'
      ? `${live.length} Visitantes`
      : (live[0]?.visitorName ?? 'Autorización'));

  const shareWith = (passes: ReadonlyArray<PassSummary>) =>
    onShare({
      type: authorization.type,
      startDate: authorization.startDate,
      endDate: authorization.endDate,
      weekdays: authorization.weekdays,
      eventName: authorization.eventName,
      passes,
    });

  const handleCancel = async () => {
    const result = await AppRouteFeat.settleMutation(
      cancel({
        membershipId: membership.membershipId,
        authorizationId: authorization._id,
      })
    );

    if (Result.isFailure(result)) {
      toast.error(VisitPass.describeBackendError(result.failure));
      return false;
    }

    toast.success('Autorización cancelada');
    return true;
  };

  const handleRegenerate = async (pass: PassSummary) => {
    const result = await AppRouteFeat.settleMutation(
      regeneratePass({
        membershipId: membership.membershipId,
        passId: pass._id,
      })
    );

    if (Result.isFailure(result)) {
      toast.error(VisitPass.describeBackendError(result.failure));
      return false;
    }

    toast.success('Pase regenerado. Comparte el nuevo enlace.');
    shareWith([result.success]);
    return true;
  };

  return (
    <Card className="gap-4 px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {VisitPass.VISIT_TYPE_LABELS[authorization.type]}
            </Badge>
            {authorization.status === 'cancelled' ? (
              <Badge variant="destructive">Cancelada</Badge>
            ) : null}
          </div>
          <p className="truncate text-base font-semibold">{title}</p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            {describePassValidity(authorization)}
          </p>
          <p className="text-xs text-muted-foreground">
            {authorization.createdByName
              ? `Creada por ${authorization.createdByName}`
              : 'Creada'}{' '}
            ·{' '}
            {VisitPass.formatRelative(
              authorization._creationTime,
              now,
              membership.residentialUnitTimeZone
            ).toLowerCase()}
          </p>
        </div>
        {canShareAll ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => shareWith(activePasses)}
          >
            <Share2 data-icon="inline-start" />
            Compartir Pases
          </Button>
        ) : null}
      </div>

      <ul className="flex flex-col divide-y rounded-xl border">
        {visiblePasses.map((pass) => {
          const canManagePass = isCurrent && pass.status === 'active';
          const badge = describePassBadge(pass.status, isAuthorizationPast);

          return (
            <li key={pass._id} className="flex items-center gap-3 px-3 py-2.5">
              <VisitPass.InitialsAvatar
                initials={VisitPass.initialsOf(pass.visitorName)}
                className="size-9 text-xs"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate text-sm font-medium">
                  {pass.visitorName}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatEntryCount(pass.entryCount)}
                  </span>
                </div>
              </div>
              {canManagePass ? (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Compartir el Pase de ${pass.visitorName}`}
                    onClick={() => shareWith([pass])}
                  >
                    <Share2 />
                  </Button>
                  <ConfirmActionDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Regenerar el Pase de ${pass.visitorName}`}
                      />
                    }
                    triggerContent={<RefreshCw />}
                    title="¿Regenerar este Pase?"
                    description={`Se creará un Pase nuevo para ${pass.visitorName}. El enlace y el código QR anteriores dejarán de funcionar en portería, así que deberás enviarle el nuevo.`}
                    confirmLabel="Regenerar Pase"
                    onConfirm={() => handleRegenerate(pass)}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {hiddenPassCount > 0 ? (
        <Button
          variant="link"
          size="sm"
          className="self-start px-0"
          onClick={() => setShowAllPasses(true)}
        >
          Ver los {live.length} Pases
        </Button>
      ) : null}

      {replaced.length > 0 ? (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">
            {replaced.length === 1
              ? '1 Pase reemplazado'
              : `${replaced.length} Pases reemplazados`}
          </summary>
          <ul className="mt-2 flex flex-col gap-1 pl-4">
            {replaced.map((pass) => (
              <li key={pass._id}>
                {pass.visitorName} · {formatEntryCount(pass.entryCount)}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {isCurrent ? (
        <ConfirmActionDialog
          trigger={
            <Button variant="destructive" size="sm" className="self-start" />
          }
          triggerContent={
            <>
              <XCircle data-icon="inline-start" />
              Cancelar autorización
            </>
          }
          title="¿Cancelar esta Autorización?"
          description="Todos sus Pases dejarán de funcionar en portería. Esta acción no se puede deshacer."
          confirmLabel="Cancelar autorización"
          destructive
          onConfirm={handleCancel}
        />
      ) : null}
    </Card>
  );
}
