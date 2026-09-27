import * as Match from 'effect/Match';
import * as Predicate from 'effect/Predicate';

import type {
  ShiftReport,
  ShiftReportEmailStatus,
  ShiftReportFailureReason,
  ShiftReportStatus,
  TerminalShiftReportOutcome,
} from './models';

/**
 * The fields `onComplete` writes. A failure after the file was stored keeps the
 * report `ready`, so the Administrador can still download what the email could
 * not deliver.
 */
export function toTerminalShiftReport(args: {
  readonly report: Pick<ShiftReport, 'fileId' | 'emailStatus'>;
  readonly outcome: TerminalShiftReportOutcome;
  readonly now: number;
}): {
  readonly status: ShiftReportStatus;
  readonly emailStatus: ShiftReportEmailStatus;
  readonly failureReason?: ShiftReportFailureReason;
  readonly completedAt: number;
} {
  return Match.value(args.outcome).pipe(
    Match.when({ type: 'completed' }, (completed) => ({
      status: 'ready' as const,
      emailStatus: completed.emailStatus,
      completedAt: args.now,
    })),
    Match.when({ type: 'failed' }, (failed) => {
      const hasFile = Predicate.isNotUndefined(args.report.fileId);
      const wasEmailPending = args.report.emailStatus === 'pending';

      return {
        status: hasFile ? ('ready' as const) : ('failed' as const),
        emailStatus: wasEmailPending
          ? ('failed' as const)
          : args.report.emailStatus,
        failureReason: failed.reason,
        completedAt: args.now,
      };
    }),
    Match.exhaustive
  );
}

/**
 * The Spanish explanation of a report whose workflow failed, or undefined. A
 * failed report that is still `ready` stored its file, so only the email went
 * wrong and the copy points at the download.
 */
export function deriveShiftReportFailureMessage(
  report: Pick<ShiftReport, 'status' | 'failureReason'>
) {
  if (Predicate.isUndefined(report.failureReason)) return undefined;

  if (report.failureReason === 'canceled')
    return 'Se canceló la generación del reporte.';

  if (report.status === 'ready')
    return 'No se pudo enviar el correo a la administración. Descarga el archivo y compártelo manualmente.';

  return 'No se pudo generar el archivo del reporte. Intenta de nuevo.';
}
