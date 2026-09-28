import * as Predicate from 'effect/Predicate';

import type * as Domain from '../domain';

/** Stands in for the Portero of a report whose Turno no longer exists. */
export const DELETED_SHIFT_PORTER_NAME = 'Turno eliminado';

/**
 * The Spanish explanation of a report whose workflow failed, or undefined. A
 * failed report that is still `ready` stored its file, so only the email went
 * wrong and the copy points at the download.
 */
export function deriveShiftReportFailureMessage(
  report: Pick<Domain.ShiftReport, 'status' | 'failureReason'>
) {
  if (Predicate.isUndefined(report.failureReason)) return undefined;

  if (report.failureReason === 'canceled')
    return 'Se canceló la generación del reporte.';

  if (report.status === 'ready')
    return 'No se pudo enviar el correo a la administración. Descarga el archivo y compártelo manualmente.';

  return 'No se pudo generar el archivo del reporte. Intenta de nuevo.';
}

/**
 * Words a loaded report for the client: a null `porterName` means its Turno was
 * deleted, and `failureReason` becomes `failureMessage`.
 */
export function presentShiftReportSummary({
  porterName,
  failureReason,
  ...summary
}: Omit<Domain.ShiftReportSummary, 'porterName' | 'failureMessage'> & {
  readonly porterName: string | null;
  readonly failureReason?: Domain.ShiftReportFailureReason;
}): Domain.ShiftReportSummary {
  return {
    ...summary,
    porterName: porterName ?? DELETED_SHIFT_PORTER_NAME,
    failureMessage: deriveShiftReportFailureMessage({
      status: summary.status,
      failureReason,
    }),
  };
}
