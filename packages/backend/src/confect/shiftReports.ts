import { vResultValidator, vWorkflowId } from '@convex-dev/workflow';
import { v } from 'convex/values';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import { internal } from '#convex/_generated/api';
import { internalMutation } from '#convex/_generated/server';

import * as ConvexInterop from './modules/convexInterop';
import * as ShiftReports from './modules/shiftReports';
import * as Workflows from './modules/workflows';

export const shiftReportWorkflow = Workflows.workflowManager
  .define({
    args: ShiftReports.ShiftReportWorkflowDto,
    returns: v.union(
      v.literal('notRequested'),
      v.literal('sent'),
      v.literal('notConfigured')
    ),
  })
  .handler(
    async (
      step,
      args
    ): Promise<ShiftReports.CompletedShiftReportEmailStatus> => {
      const workflow = ShiftReports.shiftReportWorkflow(step, args);

      return await Effect.runPromise(
        workflow.pipe(
          Effect.catchTags({
            'ShiftReports/ShiftReportEmailError':
              ConvexInterop.dieWithConvexError(
                ShiftReports.ShiftReportEmailError
              ),
            'Workflows/UnknownError': ConvexInterop.dieWithConvexError(
              Workflows.UnknownError
            ),
          })
        )
      );
    }
  );

/** Kept outside Confect to avoid a self-referential codegen type cycle. */
export const startShiftReportWorkflow = internalMutation({
  args: { shiftReportId: v.id('shiftReports') },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const workflowId = await Workflows.workflowManager.start(
      ctx,
      internal.shiftReports.shiftReportWorkflow,
      { shiftReportId: args.shiftReportId },
      {
        startAsync: true,
        onComplete: internal.shiftReports.handleShiftReportWorkflowComplete,
        context: { shiftReportId: args.shiftReportId },
      }
    );

    await ctx.db.patch('shiftReports', args.shiftReportId, { workflowId });

    return null;
  },
});

/**
 * `@convex-dev/workflow` records a throwing `onComplete` in its
 * `onCompleteFailures` table and does not retry it, so a report whose
 * terminalization fails stays without `completedAt` over a terminal workflow.
 * After terminalizing, it deletes the finished workflow and its step journal,
 * which the component otherwise keeps forever; cleanup runs as its own
 * subtransaction, so a failed cleanup is logged and leaves the report terminal.
 */
export const handleShiftReportWorkflowComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object({ shiftReportId: v.id('shiftReports') }),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const outcome: ShiftReports.ShiftReportOutcome = Match.value(
      args.result
    ).pipe(
      Match.when(
        { kind: 'success' },
        (result) =>
          ({
            type: 'completed',
            emailStatus:
              result.returnValue as ShiftReports.CompletedShiftReportEmailStatus,
          }) as const
      ),
      Match.when(
        { kind: 'failed' },
        (result) =>
          ({
            type: 'failed',
            serializedRawWorkflowError: result.error,
          }) as const
      ),
      Match.when({ kind: 'canceled' }, () => ({ type: 'canceled' }) as const),
      Match.exhaustive
    );

    await ctx.runMutation(internal.shiftReports.terminalize, {
      shiftReportId: args.context.shiftReportId,
      outcome,
    });

    await Effect.runPromise(
      Effect.tryPromise(() =>
        Workflows.workflowManager.cleanup(ctx, args.workflowId)
      ).pipe(
        Effect.ignore({
          log: 'Warn',
          message: 'Could not clean up the Reporte de turno workflow',
        })
      )
    );

    return null;
  },
});
