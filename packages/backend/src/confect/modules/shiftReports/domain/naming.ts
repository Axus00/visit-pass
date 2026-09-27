/** Stands in for the Portero of a report whose Turno no longer exists. */
export const DELETED_SHIFT_PORTER_NAME = 'Turno eliminado';

/** `reporte-turno-<unit-slug>-<YYYY-MM-DD>-<HHmm>.xlsx`, local to the unit. */
export function toShiftReportFileName(args: {
  readonly residentialUnitName: string;
  readonly shiftStart: number;
  readonly timeZone: string;
}) {
  // Lowercase ASCII words joined by dashes, so the name is safe on any disk.
  const unitSlug = args.residentialUnitName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const slug = unitSlug.length > 0 ? unitSlug : 'unidad';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: args.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(args.shiftStart);
  // Zero-padded wall-clock part of the shift start in the unit's time zone.
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  const timestamp = `${part('year')}-${part('month')}-${part('day')}-${part('hour')}${part('minute')}`;

  return `reporte-turno-${slug}-${timestamp}.xlsx`;
}
