import type { ReactNode } from 'react';

import * as Predicate from 'effect/Predicate';
import { Ban, Car, EllipsisVertical, Search, UserRound, X } from 'lucide-react';

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  cn,
} from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';

/** Search box for Visitas by Visitante name or plate. */
export function VisitSearchField({
  text,
  onTextChange,
  className,
}: {
  text: string;
  onTextChange: (text: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder="Buscar por nombre o placa…"
        aria-label="Buscar Visitas por nombre o placa"
        className="h-14 rounded-xl bg-card pr-12 pl-12 text-base shadow-xs md:text-base [&::-webkit-search-cancel-button]:hidden"
      />
      {text.length > 0 ? (
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Limpiar búsqueda"
          className="absolute top-1/2 right-2 -translate-y-1/2"
          onClick={() => onTextChange('')}
        >
          <X />
        </Button>
      ) : null}
    </div>
  );
}

/**
 * One Visita with a status accent: green for a normal Ingreso, amber for an
 * Ingreso forced after a rejected Pase, grey once voided.
 */
export function VisitCard({
  visit,
  timeZone,
  now,
  meta,
  actions,
  footer,
}: {
  visit: VisitPass.VisitSummary;
  timeZone: string;
  now: number;
  /** Replaces the relative Ingreso time under the Apartamento. */
  meta?: ReactNode;
  actions?: ReactNode;
  /** Full-width row under the Visita, for primary actions on small screens. */
  footer?: ReactNode;
}) {
  const isForced = Predicate.isNotUndefined(visit.overriddenRejection);
  const hasPlate = Predicate.isNotUndefined(visit.plate);

  return (
    <li
      className={cn(
        'relative flex flex-col gap-3 overflow-hidden rounded-xl bg-card py-3 pr-2 pl-5 shadow-xs ring-1 ring-foreground/10 sm:pr-3',
        visit.voided && 'bg-muted/50'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          visit.voided
            ? 'bg-muted-foreground/40'
            : isForced
              ? 'bg-warning'
              : 'bg-success'
        )}
      />
      <div className="flex items-center gap-3">
        <VisitPass.InitialsAvatar
          initials={VisitPass.initialsOf(visit.visitorName)}
          className={cn('size-11', visit.voided && 'opacity-60')}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p
              className={cn(
                'truncate font-semibold',
                visit.voided && 'text-muted-foreground line-through'
              )}
            >
              {visit.visitorName}
            </p>
            {visit.voided ? <Badge variant="secondary">Anulada</Badge> : null}
            {isForced && !visit.voided ? (
              <Badge variant="warning">Ingreso forzado</Badge>
            ) : null}
          </div>
          <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
            {hasPlate ? (
              <Car className="size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">
              {VisitPass.VISIT_TYPE_LABELS[visit.visitType]}
              {' · '}
              {VisitPass.VISIT_ORIGIN_LABELS[visit.origin]}
              {hasPlate ? ` · ${visit.plate}` : null}
            </span>
          </p>
          {visit.voided && Predicate.isNotUndefined(visit.voidReason) ? (
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <Ban className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{visit.voidReason}</span>
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
          <p
            className={cn(
              'text-sm font-bold sm:text-base',
              visit.voided ? 'text-muted-foreground' : 'text-primary'
            )}
          >
            {visit.apartmentLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            {meta ?? VisitPass.formatRelative(visit.enteredAt, now, timeZone)}
          </p>
        </div>
        {actions}
      </div>
      {footer}
    </li>
  );
}

/** Overflow menu for a Visita; only offers voiding while it is not voided. */
export function VisitActionsMenu({
  visit,
  onVoid,
}: {
  visit: VisitPass.VisitSummary;
  onVoid: (visit: VisitPass.VisitSummary) => void;
}) {
  if (visit.voided) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11 shrink-0"
            aria-label={`Acciones para la Visita de ${visit.visitorName}`}
          />
        }
      >
        <EllipsisVertical />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          variant="destructive"
          className="min-h-11"
          onClick={() => onVoid(visit)}
        >
          <Ban />
          Anular visita
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
