import { Link } from '@tanstack/react-router';
import * as Predicate from 'effect/Predicate';

import { cn } from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import { usePorterShiftState } from './porter-shift.hooks';
import { shiftElapsedMillis } from './shift-format.utils';

/** Top bar pill with the Turno status, linking to the portería home. */
export function ShiftStatusChip() {
  const { membershipId } = MembershipRouteFeat.useCurrentMembership();
  const state = usePorterShiftState();
  const now = VisitPass.useNow(30_000);
  const openShift = state?.openShift ?? null;
  const isOnShift = Predicate.isNotNull(openShift);

  if (Predicate.isNull(state)) return null;

  return (
    <Link
      to="/app/m/$membershipId/porteria"
      params={{ membershipId }}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isOnShift
          ? 'border-success/30 bg-success/10 text-success'
          : 'border-border bg-muted text-muted-foreground'
      )}
      aria-label={
        isOnShift
          ? `En turno desde hace ${VisitPass.formatDuration(shiftElapsedMillis(openShift, now))}`
          : 'Sin turno abierto'
      }
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-2 rounded-full',
          isOnShift ? 'animate-pulse bg-success' : 'bg-muted-foreground/60'
        )}
      />
      {isOnShift ? (
        <span>
          En turno
          <span className="hidden font-medium sm:inline">
            {' · '}
            {VisitPass.formatDuration(shiftElapsedMillis(openShift, now))}
          </span>
        </span>
      ) : (
        <span>Sin turno</span>
      )}
    </Link>
  );
}
