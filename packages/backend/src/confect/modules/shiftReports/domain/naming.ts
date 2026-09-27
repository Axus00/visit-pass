import { formatFileTimestamp } from './localDateTime';

/** Stands in for the Portero of a report whose Turno no longer exists. */
export const DELETED_SHIFT_PORTER_NAME = 'Turno eliminado';

/**
 * Names a Membresía the way reports show it: the signed-in Usuario's full
 * name, else the name the Administrador typed, else the email.
 */
export function toMemberDisplayName(args: {
  readonly membership: {
    readonly email: string;
    readonly displayName?: string | undefined;
  };
  readonly user: {
    readonly firstName: string | null;
    readonly lastName: string | null;
  } | null;
}) {
  const fullName = [args.user?.firstName, args.user?.lastName]
    .map((part) => part?.trim() ?? '')
    .filter((part) => part.length > 0)
    .join(' ');

  if (fullName.length > 0) return fullName;

  return args.membership.displayName ?? args.membership.email;
}

/** Lowercase ASCII words joined by dashes, so the name is safe on any disk. */
function toSlug(text: string) {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug.length > 0 ? slug : 'unidad';
}

/** `reporte-turno-<unit-slug>-<YYYY-MM-DD>-<HHmm>.xlsx`, local to the unit. */
export function toShiftReportFileName(args: {
  readonly residentialUnitName: string;
  readonly shiftStart: number;
  readonly timeZone: string;
}) {
  const slug = toSlug(args.residentialUnitName);
  const timestamp = formatFileTimestamp(args.shiftStart, args.timeZone);

  return `reporte-turno-${slug}-${timestamp}.xlsx`;
}

/** When a Turno began: its real start, else its planned start, else its creation. */
export function toShiftStart(shift: {
  readonly startedAt?: number | undefined;
  readonly plannedStart?: number | undefined;
  readonly _creationTime: number;
}) {
  return shift.startedAt ?? shift.plannedStart ?? shift._creationTime;
}
