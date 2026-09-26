/** Wall-clock parts of an instant in `timeZone`, zero-padded. */
function toLocalDateTimeParts(epochMillis: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(epochMillis);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';

  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
  };
}

/** Formats an instant as `26/09/2026 14:05` in the unit's time zone. */
export function formatLocalDateTime(epochMillis: number, timeZone: string) {
  const { year, month, day, hour, minute } = toLocalDateTimeParts(
    epochMillis,
    timeZone
  );

  return `${day}/${month}/${year} ${hour}:${minute}`;
}

/** Formats an instant as `2026-09-26-1405` in the unit's time zone. */
export function formatFileTimestamp(epochMillis: number, timeZone: string) {
  const { year, month, day, hour, minute } = toLocalDateTimeParts(
    epochMillis,
    timeZone
  );

  return `${year}-${month}-${day}-${hour}${minute}`;
}
