import * as Predicate from 'effect/Predicate';

import * as CalendarShared from '@repo/backend/shared/calendar';

import * as VisitPass from '#modules/visit-pass';

export const ANONYMIZED_VISITOR_LABEL = 'Visitante anonimizado';

export type VisitPresence = 'voided' | 'inside' | 'left';

/** Anulada wins over Dentro: a voided Visita never counts as inside. */
export function visitPresence(
  visit: Pick<VisitPass.VisitSummary, 'voided' | 'exitedAt'>
): VisitPresence {
  if (visit.voided) return 'voided';
  if (Predicate.isUndefined(visit.exitedAt)) return 'inside';

  return 'left';
}

export function visitorDisplayName(
  visit: Pick<VisitPass.VisitSummary, 'anonymized' | 'visitorName'>
) {
  return visit.anonymized ? ANONYMIZED_VISITOR_LABEL : visit.visitorName;
}

/** `Hoy`, `Ayer`, else `Jueves, 24 de septiembre`. */
export function dayLabel(localDate: string, today: string) {
  if (localDate === today) return 'Hoy';
  if (localDate === CalendarShared.addDays(today, -1)) return 'Ayer';

  const formatted = VisitPass.formatLocalDate(localDate, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export type VisitDayGroup = {
  localDate: string;
  label: string;
  visits: ReadonlyArray<VisitPass.VisitSummary>;
};

/** Groups Visitas by their Ingreso day in the unit's time zone, latest first. */
export function groupVisitsByDay(
  visits: ReadonlyArray<VisitPass.VisitSummary>,
  today: string,
  timeZone: string
): ReadonlyArray<VisitDayGroup> {
  const sorted = [...visits].sort((a, b) => b.enteredAt - a.enteredAt);
  const byDay = new Map<string, Array<VisitPass.VisitSummary>>();

  for (const visit of sorted) {
    const localDate = CalendarShared.toLocalDate(visit.enteredAt, timeZone);
    byDay.set(localDate, [...(byDay.get(localDate) ?? []), visit]);
  }

  return [...byDay].map(([localDate, dayVisits]) => ({
    localDate,
    label: dayLabel(localDate, today),
    visits: dayVisits,
  }));
}

/** Accent- and space-insensitive match on the Visitante's name or the plate. */
export function matchesVisitSearch(
  visit: Pick<VisitPass.VisitSummary, 'anonymized' | 'visitorName' | 'plate'>,
  term: string
) {
  const [needle = '', ...haystacks] = [
    term,
    visitorDisplayName(visit),
    visit.plate ?? '',
  ].map((text) =>
    text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[\s-]+/g, '')
  );

  if (needle.length === 0) return true;

  return haystacks.some((haystack) => haystack.includes(needle));
}
