import * as CalendarShared from '@repo/backend/shared/calendar';

const LOCALE = 'es-CO';

/** `2026-09-26` → `26 sep 2026`, read as a calendar day with no time zone. */
export function formatLocalDate(
  localDate: string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }
) {
  return new Intl.DateTimeFormat(LOCALE, {
    ...options,
    timeZone: 'UTC',
  }).format(new Date(`${localDate}T00:00:00Z`));
}

export function formatLocalDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) return formatLocalDate(startDate);

  return `${formatLocalDate(startDate)} – ${formatLocalDate(endDate)}`;
}

export function formatTime(epochMillis: number, timeZone: string) {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(epochMillis));
}

export function formatDateTime(epochMillis: number, timeZone: string) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(epochMillis));
}

/** `Hace 5 min`, `Hace 2 h`, then the date and time. */
export function formatRelative(
  epochMillis: number,
  now: number,
  timeZone: string
) {
  const minutes = Math.max(0, Math.round((now - epochMillis) / 60_000));

  if (minutes < 1) return 'Justo ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (minutes < 60 * 12) return `Hace ${Math.round(minutes / 60)} h`;

  return formatDateTime(epochMillis, timeZone);
}

/** Elapsed time as `3 h 05 min`. */
export function formatDuration(millis: number) {
  const totalMinutes = Math.max(0, Math.floor(millis / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;

  return `${hours} h ${String(minutes).padStart(2, '0')} min`;
}

/** Today's calendar day in the Unidad residencial's time zone. */
export function todayIn(timeZone: string, now = Date.now()) {
  return CalendarShared.toLocalDate(now, timeZone);
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  return initials.toUpperCase() || '?';
}
