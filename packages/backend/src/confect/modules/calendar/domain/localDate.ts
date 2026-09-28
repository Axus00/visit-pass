import * as DateTime from 'effect/DateTime';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

/**
 * A calendar day in a Unidad residencial's own time zone, as `YYYY-MM-DD`.
 * Days a month does not have, such as `2026-02-31`, are rejected.
 */
export const LocalDate = Schema.String.check(
  Schema.isPattern(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/),
  Schema.makeFilter(
    (value: string) =>
      Option.exists(
        DateTime.make(`${value}T00:00:00Z`),
        (dateTime) => DateTime.formatIsoDateUtc(dateTime) === value
      ) || 'Not an existing calendar day'
  )
);

export type LocalDate = typeof LocalDate.Type;

/** Day of the week, `0` for Sunday through `6` for Saturday. */
export const Weekday = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(0),
  Schema.isLessThanOrEqualTo(6)
);

export type Weekday = typeof Weekday.Type;

/** Colombian copropiedades share one offset without daylight saving. */
export const DEFAULT_TIME_ZONE = 'America/Bogota';

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

/** The calendar day an instant falls on in `timeZone`. */
export function toLocalDate(epochMillis: number, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(epochMillis));

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Weekdays are calendar facts, so the UTC reading of the date is exact. */
export function weekdayOf(localDate: LocalDate): Weekday {
  return new Date(`${localDate}T00:00:00Z`).getUTCDay();
}

export function addDays(localDate: LocalDate, days: number): LocalDate {
  const shifted = Date.parse(`${localDate}T00:00:00Z`) + days * MILLIS_PER_DAY;

  return new Date(shifted).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`; negative when `to` comes first. */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      MILLIS_PER_DAY
  );
}
