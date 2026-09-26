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

/** Planned Turnos the Portero can still start at `now`, soonest first. */
export function listStartableShifts<S extends ScheduledShift>(
  shifts: ReadonlyArray<S>,
  now: number
): Array<S> {
  return shifts
    .filter(
      (shift) =>
        shift.status === 'scheduled' &&
        (shift.plannedEnd ?? 0) + OVERDUE_START_HOURS * MILLIS_PER_HOUR > now
    )
    .toSorted((a, b) => (a.plannedStart ?? 0) - (b.plannedStart ?? 0));
}

/**
 * The planned Turno that "Iniciar turno" starts instead of opening an
 * unplanned one: among those already startable (from an hour before their
 * start to the overdue grace after their end), the latest planned start, so
 * the current Turno wins over an overdue one.
 */
export function findPlannedShiftToStart<S extends ScheduledShift>(
  shifts: ReadonlyArray<S>,
  now: number
): S | undefined {
  return listStartableShifts(shifts, now)
    .filter(
      (shift) =>
        (shift.plannedStart ?? 0) - EARLY_START_HOURS * MILLIS_PER_HOUR <= now
    )
    .at(-1);
}
