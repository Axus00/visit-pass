import * as Predicate from 'effect/Predicate';
import { Ban, ShieldAlert } from 'lucide-react';

import * as CalendarShared from '@repo/backend/shared/calendar';
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';

import { visitStatusOf } from './visit-filters.utils';

export function VisitStatusBadge({
  visit,
  timeZone,
}: {
  visit: VisitPass.VisitSummary;
  timeZone: string;
}) {
  const status = visitStatusOf(visit);

  if (status === 'voided') return <Badge variant="destructive">Anulada</Badge>;
  if (status === 'inside') return <Badge variant="success">Dentro</Badge>;

  return (
    <Badge variant="secondary">
      Salió
      {Predicate.isUndefined(visit.exitedAt)
        ? null
        : ` ${VisitPass.formatTime(visit.exitedAt, timeZone)}`}
    </Badge>
  );
}

function OriginCell({ visit }: { visit: VisitPass.VisitSummary }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span>{VisitPass.VISIT_ORIGIN_LABELS[visit.origin]}</span>
      {Predicate.isUndefined(visit.overriddenRejection) ? null : (
        <Badge
          variant="warning"
          title={VisitPass.PASS_REJECTION_LABELS[visit.overriddenRejection]}
        >
          <ShieldAlert aria-hidden="true" />
          Ingreso forzado
        </Badge>
      )}
    </span>
  );
}

function VisitorCell({ visit }: { visit: VisitPass.VisitSummary }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <VisitPass.InitialsAvatar
        initials={VisitPass.initialsOf(visit.visitorName)}
        className={cn('size-9', visit.voided && 'opacity-60')}
      />
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            'truncate font-medium',
            visit.voided && 'text-muted-foreground line-through'
          )}
        >
          {visit.visitorName}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {visit.anonymized
            ? 'Datos anonimizados'
            : (visit.visitorDocument ?? 'Sin documento')}
          {Predicate.isUndefined(visit.plate) ? null : ` · ${visit.plate}`}
        </span>
      </span>
    </span>
  );
}

function VoidReason({ visit }: { visit: VisitPass.VisitSummary }) {
  if (!visit.voided) return null;

  return (
    <p className="text-xs text-muted-foreground">
      Motivo: {visit.voidReason ?? 'Sin motivo registrado'}
    </p>
  );
}

/**
 * The Visitas of the unit as a table on desktop and cards on mobile; narrow
 * containers such as a Sheet pass `layout="cards"`. Pass `onVoid` to offer
 * "Anular" on the Visitas that are not voided yet.
 */
export function VisitList({
  visits,
  timeZone,
  now,
  onVoid,
  showPorter = false,
  layout = 'responsive',
}: {
  visits: ReadonlyArray<VisitPass.VisitSummary>;
  timeZone: string;
  now: number;
  onVoid?: (visit: VisitPass.VisitSummary) => void;
  showPorter?: boolean;
  layout?: 'responsive' | 'cards';
}) {
  const today = VisitPass.todayIn(timeZone, now);
  // Today's Visitas show only the time; older ones carry their date.
  const entryLabels = new Map(
    visits.map((visit) => {
      const isToday =
        CalendarShared.toLocalDate(visit.enteredAt, timeZone) === today;
      const label = isToday
        ? VisitPass.formatTime(visit.enteredAt, timeZone)
        : VisitPass.formatDateTime(visit.enteredAt, timeZone);

      return [visit._id, label];
    })
  );
  const hasActions = Predicate.isNotUndefined(onVoid);
  const isResponsive = layout === 'responsive';

  return (
    <>
      <div className={cn('hidden', isResponsive && 'md:block')}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Ingreso</TableHead>
              <TableHead>Visitante</TableHead>
              <TableHead>Apartamento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origen</TableHead>
              {showPorter ? <TableHead>Portero</TableHead> : null}
              <TableHead>Estado</TableHead>
              {hasActions ? (
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.map((visit) => (
              <TableRow key={visit._id}>
                <TableCell className="pl-4 text-muted-foreground tabular-nums">
                  {entryLabels.get(visit._id)}
                </TableCell>
                <TableCell className="max-w-64">
                  <VisitorCell visit={visit} />
                </TableCell>
                <TableCell>{visit.apartmentLabel}</TableCell>
                <TableCell>
                  {VisitPass.VISIT_TYPE_LABELS[visit.visitType]}
                </TableCell>
                <TableCell>
                  <OriginCell visit={visit} />
                </TableCell>
                {showPorter ? (
                  <TableCell className="text-muted-foreground">
                    {visit.entryPorterName ?? '—'}
                  </TableCell>
                ) : null}
                <TableCell className="max-w-56 whitespace-normal">
                  <div className="flex flex-col gap-1">
                    <VisitStatusBadge visit={visit} timeZone={timeZone} />
                    <VoidReason visit={visit} />
                  </div>
                </TableCell>
                {hasActions ? (
                  <TableCell className="pr-4 text-right">
                    {visit.voided ? null : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onVoid(visit)}
                      >
                        <Ban aria-hidden="true" />
                        Anular
                      </Button>
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className={cn('flex flex-col divide-y', isResponsive && 'md:hidden')}>
        {visits.map((visit) => {
          const showsPorterName =
            showPorter && Predicate.isNotUndefined(visit.entryPorterName);
          const canVoid = hasActions && !visit.voided;

          return (
            <li key={visit._id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <VisitorCell visit={visit} />
                <VisitStatusBadge visit={visit} timeZone={timeZone} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-12 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {entryLabels.get(visit._id)}
                </span>
                <span>{visit.apartmentLabel}</span>
                <span>{VisitPass.VISIT_TYPE_LABELS[visit.visitType]}</span>
                {showsPorterName ? (
                  <span>Portero: {visit.entryPorterName}</span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pl-12 text-xs">
                <OriginCell visit={visit} />
                {canVoid ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onVoid(visit)}
                  >
                    <Ban aria-hidden="true" />
                    Anular
                  </Button>
                ) : null}
              </div>
              <div className="pl-12">
                <VoidReason visit={visit} />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
