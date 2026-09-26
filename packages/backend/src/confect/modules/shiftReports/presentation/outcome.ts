import * as Match from 'effect/Match';

import * as WorkflowsPresentation from '../../workflows/presentation';
import * as Domain from '../domain';

export function toTerminalShiftReportOutcome(
  outcome: Domain.ShiftReportOutcome
): Domain.TerminalShiftReportOutcome {
  return Match.value(outcome).pipe(
    Match.when(
      { type: 'completed' },
      (completed) =>
        ({ type: 'completed', emailStatus: completed.emailStatus }) as const
    ),
    Match.when(
      { type: 'failed' },
      (failed) =>
        ({
          type: 'failed',
          reason: WorkflowsPresentation.classifyWorkflowError({
            cases: Domain.ShiftReportWorkflowError.cases,
            serializedError: failed.serializedRawWorkflowError,
          }),
        }) as const
    ),
    Match.when(
      { type: 'canceled' },
      () => ({ type: 'failed', reason: 'canceled' }) as const
    ),
    Match.exhaustive
  );
}

/**
 * The Spanish explanation stored on a report whose workflow failed. A stored
 * file means only the email went wrong, so the copy points at the download.
 */
export function deriveShiftReportFailureMessage(args: {
  readonly reason: Domain.ShiftReportWorkflowErrorTag | 'canceled';
  readonly hasFile: boolean;
}) {
  if (args.reason === 'canceled')
    return 'Se canceló la generación del reporte.';

  if (args.hasFile)
    return 'No se pudo enviar el correo a la administración. Descarga el archivo y compártelo manualmente.';

  return 'No se pudo generar el archivo del reporte. Intenta de nuevo.';
}
