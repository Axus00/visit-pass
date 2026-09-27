import * as Schema from 'effect/Schema';

import * as CalendarDomain from '../../calendar/domain';
import type { Authorization, Pass } from './models';

/** Why the Portero cannot register an Ingreso with a Pase. */
export const PassRejectionReason = Schema.Literals([
  'notFound',
  'cancelled',
  'replaced',
  'alreadyUsed',
  'notYetValid',
  'expired',
  'weekdayNotAllowed',
  'apartmentWithoutResident',
  'alreadyInside',
]);

export type PassRejectionReason = typeof PassRejectionReason.Type;

export type PassAdmission =
  | { readonly admissible: true }
  | { readonly admissible: false; readonly reason: PassRejectionReason };

/**
 * Checks, in order, the rules that reject a Pase at portería. `today` is the
 * calendar day in the unit's time zone; the Pase is valid the whole day.
 */
export function evaluatePassAdmission(args: {
  pass: Pick<Pass, 'status'>;
  authorization: Pick<
    Authorization,
    'status' | 'startDate' | 'endDate' | 'weekdays'
  >;
  today: CalendarDomain.LocalDate;
  apartmentHasActiveResident: boolean;
  visitorIsInside: boolean;
}): PassAdmission {
  const reject = (reason: PassRejectionReason): PassAdmission => ({
    admissible: false,
    reason,
  });

  const isCancelled =
    args.authorization.status === 'cancelled' ||
    args.pass.status === 'cancelled';
  if (isCancelled) return reject('cancelled');

  if (args.pass.status === 'replaced') return reject('replaced');

  if (args.pass.status === 'used') return reject('alreadyUsed');

  if (args.today < args.authorization.startDate) return reject('notYetValid');

  if (args.today > args.authorization.endDate) return reject('expired');

  const isAllowedWeekday = args.authorization.weekdays.includes(
    CalendarDomain.weekdayOf(args.today)
  );
  if (!isAllowedWeekday) return reject('weekdayNotAllowed');

  if (!args.apartmentHasActiveResident)
    return reject('apartmentWithoutResident');

  if (args.visitorIsInside) return reject('alreadyInside');

  return { admissible: true };
}

export const ALL_WEEKDAYS: ReadonlyArray<CalendarDomain.Weekday> = [
  0, 1, 2, 3, 4, 5, 6,
];
