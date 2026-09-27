import * as CalendarDomain from '../../calendar/domain';
import * as ResidentialUnitsDomain from '../../residentialUnits/domain';

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

/** Retention months are counted as 30-day blocks, close enough for Habeas Data. */
export const DAYS_PER_RETENTION_MONTH = 30;

/** A never-used Pase outlives its Autorización's last day by this much. */
export const UNUSED_PASS_RETENTION_DAYS = 30;

/**
 * Days before `toUnusedPassCutoffDate` an ended Autorización still needs the
 * Pase sweep. Its Pases admit no one after its `endDate`, so a kept Pase's
 * last Ingreso ages out within the longest Visita retention; older
 * Autorizaciones hold nothing left to delete or anonymize.
 */
export const PASS_SWEEP_WINDOW_DAYS =
  ResidentialUnitsDomain.MAX_VISIT_RETENTION_MONTHS * DAYS_PER_RETENTION_MONTH +
  UNUSED_PASS_RETENTION_DAYS;

/** Reportes de turno and their files are kept this long after being requested. */
export const SHIFT_REPORT_RETENTION_DAYS = 30;

/** Replaces the Visitante's name once a Visita's retention elapses. */
export const ANONYMIZED_VISITOR_NAME = 'Visitante anonimizado';

/** Visitas that entered before this instant are anonymized. */
export function toVisitRetentionCutoff(args: {
  readonly now: number;
  readonly visitRetentionMonths: number;
}) {
  return (
    args.now -
    args.visitRetentionMonths * DAYS_PER_RETENTION_MONTH * MILLIS_PER_DAY
  );
}

/** Autorizaciones whose `endDate` falls before this unit-local day are expired for retention. */
export function toUnusedPassCutoffDate(args: {
  readonly now: number;
  readonly timeZone: string;
}) {
  return CalendarDomain.addDays(
    CalendarDomain.toLocalDate(args.now, args.timeZone),
    -UNUSED_PASS_RETENTION_DAYS
  );
}

/** Reportes de turno created before this instant are deleted with their file. */
export function toShiftReportRetentionCutoff(now: number) {
  return now - SHIFT_REPORT_RETENTION_DAYS * MILLIS_PER_DAY;
}
