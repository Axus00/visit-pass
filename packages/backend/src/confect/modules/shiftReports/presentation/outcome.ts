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
