import type * as Ref from '@confect/core/Ref';
import * as Predicate from 'effect/Predicate';

import type refs from '@repo/backend/refs';
import * as CalendarShared from '@repo/backend/shared/calendar';

import * as VisitPass from '#modules/visit-pass';

export type PublicPass = NonNullable<
  Ref.Returns<typeof refs.public.authorizations.getPublicPass>
>;

export type PublicPassState =
  | { kind: 'valid' }
  | { kind: 'notYetValid'; validFrom: string }
  | { kind: 'notToday'; nextDate: string }
  | { kind: 'expired' }
  | { kind: 'cancelled' }
  | { kind: 'used' }
  | { kind: 'replaced' };

/**
 * What the Pase page tells the Visitante today, `today` being the calendar day
 * in the unit's time zone. Mirrors the portería rules the Visitante can act on.
 */
export function derivePublicPassState(
  pass: Pick<
    PublicPass,
    'status' | 'authorizationStatus' | 'startDate' | 'endDate' | 'weekdays'
  >,
  today: string
): PublicPassState {
  const isCancelled =
    pass.authorizationStatus === 'cancelled' || pass.status === 'cancelled';
  if (isCancelled) return { kind: 'cancelled' };
  if (pass.status === 'replaced') return { kind: 'replaced' };
  if (pass.status === 'used') return { kind: 'used' };

  const firstCandidate = today > pass.startDate ? today : pass.startDate;
  // A weekday pattern repeats every 7 days, so a week of candidates suffices.
  const nextValidDay = Array.from({ length: 7 }, (_, offset) =>
    CalendarShared.addDays(firstCandidate, offset)
  ).find(
    (day) =>
      day <= pass.endDate &&
      pass.weekdays.includes(CalendarShared.weekdayOf(day))
  );

  if (Predicate.isUndefined(nextValidDay)) return { kind: 'expired' };
  if (nextValidDay === today) return { kind: 'valid' };
  if (today < pass.startDate)
    return { kind: 'notYetValid', validFrom: nextValidDay };

  return { kind: 'notToday', nextDate: nextValidDay };
}

/** Monday-first weekday summary: `Lun a Vie`, `Todos los días`, `Lun, Mié, Vie`. */
export function formatWeekdays(weekdays: ReadonlyArray<number>) {
  const mondayFirst = [...new Set(weekdays)].sort(
    (a, b) => ((a + 6) % 7) - ((b + 6) % 7)
  );
  const key = mondayFirst.join(',');

  if (mondayFirst.length === 7) return 'Todos los días';
  if (key === '1,2,3,4,5') return 'Lun a Vie';
  if (key === '1,2,3,4,5,6') return 'Lun a Sáb';
  if (key === '6,0') return 'Fines de semana';

  return mondayFirst
    .map((weekday) => VisitPass.WEEKDAY_SHORT_LABELS[weekday] ?? '')
    .join(', ');
}
