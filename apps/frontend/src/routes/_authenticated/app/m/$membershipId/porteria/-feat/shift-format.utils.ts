import * as Predicate from 'effect/Predicate';

import * as VisitPass from '#modules/visit-pass';

type ShiftTimes = Pick<
  VisitPass.ShiftSummary,
  'startedAt' | 'endedAt' | 'plannedStart' | 'plannedEnd'
>;

/**
 * `26 sep, 06:00 – 14:00` from the real marks, else the planned schedule. An
 * open Turno reads `… – en curso`.
 */
export function describeShiftWindow(shift: ShiftTimes, timeZone: string) {
  const start = shift.startedAt ?? shift.plannedStart;
  const end =
    shift.endedAt ??
    (Predicate.isUndefined(shift.startedAt) ? shift.plannedEnd : undefined);

  if (Predicate.isUndefined(start)) return 'Sin horario';

  const startLabel = VisitPass.formatDateTime(start, timeZone);
  const endLabel = Predicate.isUndefined(end)
    ? 'en curso'
    : VisitPass.formatTime(end, timeZone);

  return `${startLabel} – ${endLabel}`;
}

/** How long the Turno has run: to its end, or to `now` while open. */
export function shiftElapsedMillis(shift: ShiftTimes, now: number) {
  if (Predicate.isUndefined(shift.startedAt)) return 0;

  return Math.max(0, (shift.endedAt ?? now) - shift.startedAt);
}
