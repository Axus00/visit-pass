/** Formats an instant as `26/09/2026 14:05` in the unit's time zone. */
export function formatLocalDateTime(epochMillis: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(epochMillis);
  // Zero-padded wall-clock part of the instant in `timeZone`.
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';

  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`;
}

/** Formats an instant as `2026-09-26-1405` in the unit's time zone. */
export function formatFileTimestamp(epochMillis: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(epochMillis);
  // Zero-padded wall-clock part of the instant in `timeZone`.
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')}-${part('hour')}${part('minute')}`;
}
