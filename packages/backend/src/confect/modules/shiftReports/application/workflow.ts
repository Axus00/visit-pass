import type { WorkflowCtx } from '@convex-dev/workflow';
import { type Infer, v } from 'convex/values';
import * as Effect from 'effect/Effect';

import refs from '../../../_generated/refs';
import * as WorkflowsApplication from '../../workflows/application';
import type * as Domain from '../domain';

const ShiftReportWorkflowDto = {
  shiftReportId: v.id('shiftReports'),
};

const vShiftReportWorkflowDto = v.object(ShiftReportWorkflowDto);
type ShiftReportWorkflowDto = Infer<typeof vShiftReportWorkflowDto>;

export { ShiftReportWorkflowDto };

/**
 * Resend answers 429 when its rate limit is hit, so the email step backs off
 * for about 15 s in total (1 s, 2 s, 4 s, 8 s) instead of the default ~300 ms.
 */
const SEND_EMAIL_RETRY = { maxAttempts: 5, initialBackoffMs: 1000, base: 2 };

/**
 * Stores the workbook, records it on the report so it is downloadable at once,
 * then emails it when requested. Steps pass storage ids, never bytes, and each
 * is journaled: a restarted workflow does not regenerate or resend.
 */
export const shiftReportWorkflow = Effect.fn('shiftReportWorkflow')(function* (
  step: WorkflowCtx,
  args: ShiftReportWorkflowDto
): Effect.fn.Return<
  Domain.CompletedShiftReportEmailStatus,
  Domain.ShiftReportWorkflowError
> {
  const workflowRunner = WorkflowsApplication.makeConfectWorkflowRunner(step);

  const fileId = yield* workflowRunner
    .runAction(refs.internal.shiftReports.generateFile, {
      shiftReportId: args.shiftReportId,
    })
    .pipe(Effect.catchTag('SchemaError', Effect.die));

  const emailStatus = yield* workflowRunner
    .runMutation(refs.internal.shiftReports.recordFile, {
      shiftReportId: args.shiftReportId,
      fileId,
    })
    .pipe(Effect.catchTag('SchemaError', Effect.die));

  if (emailStatus !== 'pending') return 'notRequested';

  // `onComplete` persists the email outcome, so this step stays side-effect
  // free on the database.
  return yield* workflowRunner
    .runAction(
      refs.internal.shiftReports.sendEmail,
      { shiftReportId: args.shiftReportId },
      { retry: SEND_EMAIL_RETRY }
    )
    .pipe(Effect.catchTag('SchemaError', Effect.die));
});
