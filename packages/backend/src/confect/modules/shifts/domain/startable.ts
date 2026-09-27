import * as Predicate from 'effect/Predicate';

import type { Shift } from './models';

const MILLIS_PER_HOUR = 60 * 60 * 1000;

/** A Portero may start a planned Turno this long before its planned start. */
export const EARLY_START_HOURS = 1;

/**
 * A planned Turno the Portero never started stays startable this long after
 * its planned end, so a late start still counts against the plan.
 */
export const OVERDUE_START_HOURS = 12;

type ScheduledShift = Pick<Shift, 'status' | 'plannedStart' | 'plannedEnd'>;

/**
 * A planned Turno ending at or before this instant is past its overdue grace
 * at `now`; scans for startable Turnos read planned ends after it.
 */
export function earliestStartablePlannedEnd(now: number): number {
  return now - OVERDUE_START_HOURS * MILLIS_PER_HOUR;
}

/**
 * Whether the Portero can start the planned Turno at `now`: from
 * `EARLY_START_HOURS` before its planned start until `OVERDUE_START_HOURS`
 * after its planned end.
 */
export function isStartableAt(shift: ScheduledShift, now: number): boolean {
  const { plannedStart, plannedEnd } = shift;
  const isPlanned =
    shift.status === 'scheduled' &&
    Predicate.isNotUndefined(plannedStart) &&
    Predicate.isNotUndefined(plannedEnd);
  if (!isPlanned) return false;

  const hasWindowOpened =
    plannedStart - EARLY_START_HOURS * MILLIS_PER_HOUR <= now;
  const hasWindowClosed = plannedEnd <= earliestStartablePlannedEnd(now);

  return hasWindowOpened && !hasWindowClosed;
}

/**
 * Planned Turnos the Portero can start now or later (their window has not
 * closed), soonest first. For display: a future one is not startable yet.
 */
export function listStartableShifts<S extends ScheduledShift>(
  shifts: ReadonlyArray<S>,
  now: number
): Array<S> {
  return shifts
    .filter(
      (shift) =>
        shift.status === 'scheduled' &&
        (shift.plannedEnd ?? 0) > earliestStartablePlannedEnd(now)
    )
    .toSorted((a, b) => (a.plannedStart ?? 0) - (b.plannedStart ?? 0));
}

/**
 * The planned Turno that "Iniciar turno" starts instead of opening an
 * unplanned one, among those startable at `now`: the one running now (its
 * planned start is past and its planned end is not), else the soonest upcoming
 * one inside its early window, else the most recently ended overdue one.
 */
export function findPlannedShiftToStart<S extends ScheduledShift>(
  shifts: ReadonlyArray<S>,
  now: number
): S | undefined {
  const startable = listStartableShifts(shifts, now).filter((shift) =>
    isStartableAt(shift, now)
  );

  const running = startable.findLast(
    (shift) => (shift.plannedStart ?? 0) <= now && now < (shift.plannedEnd ?? 0)
  );
  if (Predicate.isNotUndefined(running)) return running;

  const upcoming = startable.find((shift) => (shift.plannedStart ?? 0) > now);
  if (Predicate.isNotUndefined(upcoming)) return upcoming;

  return startable
    .toSorted((a, b) => (a.plannedEnd ?? 0) - (b.plannedEnd ?? 0))
    .at(-1);
}
