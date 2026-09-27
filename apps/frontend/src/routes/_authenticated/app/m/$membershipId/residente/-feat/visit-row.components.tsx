import * as Predicate from 'effect/Predicate';
import { UserRound } from 'lucide-react';

import * as CalendarShared from '@repo/backend/shared/calendar';
import { Badge, cn, tw } from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';

import {
  type VisitPresence,
  dayLabel,
  visitPresence,
  visitorDisplayName,
} from './visits.utils';

const PRESENCE_BADGE = {
  inside: { label: 'Dentro', variant: 'success' },
  left: { label: 'Salió', variant: 'secondary' },
  voided: { label: 'Anulada', variant: 'destructive' },
} as const satisfies Record<
  VisitPresence,
  { label: string; variant: 'success' | 'secondary' | 'destructive' }
>;

const PRESENCE_STRIPE = {
  inside: tw`bg-success`,
  left: tw`bg-border`,
  voided: tw`bg-destructive`,
} as const satisfies Record<VisitPresence, string>;

/**
 * One Visita of the Apartamento: who, how they came in, Ingreso and Salida.
 * `withDay` prefixes the Ingreso with `Hoy`, `Ayer` or the date.
 */
export function VisitRow({
  visit,
  today,
  timeZone,
  withDay = false,
}: {
  visit: VisitPass.VisitSummary;
  today: string;
  timeZone: string;
  withDay?: boolean;
}) {
  const presence = visitPresence(visit);
  const showsVoidReason =
    presence === 'voided' && Predicate.isNotUndefined(visit.voidReason);
  const badge = PRESENCE_BADGE[presence];
  const entryDay = CalendarShared.toLocalDate(visit.enteredAt, timeZone);
  const entryTime = VisitPass.formatTime(visit.enteredAt, timeZone);
  const entryLabel = withDay
    ? `${dayLabel(entryDay, today)} · ${entryTime}`
    : entryTime;
  const exitLabel = Predicate.isUndefined(visit.exitedAt)
    ? null
    : CalendarShared.toLocalDate(visit.exitedAt, timeZone) === entryDay
      ? VisitPass.formatTime(visit.exitedAt, timeZone)
      : VisitPass.formatDateTime(visit.exitedAt, timeZone);
  const details = [
    visit.visitorDocument,
    visit.plate ? `Placa ${visit.plate}` : undefined,
    VisitPass.VISIT_ORIGIN_LABELS[visit.origin],
  ].filter(Predicate.isNotUndefined);

  return (
    <li className="relative flex items-start gap-3 py-3 pr-4 pl-5">
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-3 left-0 w-1 rounded-r-full',
          PRESENCE_STRIPE[presence]
        )}
      />
      {visit.anonymized ? (
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
        >
          <UserRound className="size-5" />
        </span>
      ) : (
        <VisitPass.InitialsAvatar
          initials={VisitPass.initialsOf(visit.visitorName)}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={cn(
              'truncate font-medium',
              visit.anonymized && 'text-muted-foreground italic',
              presence === 'voided' && 'line-through decoration-1'
            )}
          >
            {visitorDisplayName(visit)}
          </p>
          <Badge variant="outline">
            {VisitPass.VISIT_TYPE_LABELS[visit.visitType]}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {details.join(' · ')}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          <span className="font-medium text-foreground">Ingreso</span>{' '}
          {entryLabel}
          {Predicate.isNull(exitLabel) ? null : (
            <>
              {' · '}
              <span className="font-medium text-foreground">Salida</span>{' '}
              {exitLabel}
            </>
          )}
        </p>
        {showsVoidReason ? (
          <p className="text-xs text-destructive">
            Anulada: {visit.voidReason}
          </p>
        ) : null}
      </div>
      <Badge variant={badge.variant} className="mt-0.5">
        {badge.label}
      </Badge>
    </li>
  );
}
