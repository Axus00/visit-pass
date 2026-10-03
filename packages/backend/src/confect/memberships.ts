import { vResultValidator, vWorkflowId } from '@convex-dev/workflow';
import { v } from 'convex/values';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import { internal } from '#convex/_generated/api';
import { env, internalMutation } from '#convex/_generated/server';

import * as CommonErrors from './modules/commonErrors';
import * as ConvexInterop from './modules/convexInterop';
import * as Memberships from './modules/memberships';
import * as ResendModule from './modules/resend';
import * as Workflows from './modules/workflows';

const vEmailOutcome = v.union(v.literal('sent'), v.literal('skipped'));

export const invitationDeliveryWorkflow = Workflows.workflowManager
  .define({
    args: Memberships.InvitationDeliveryDto,
    returns: vEmailOutcome,
  })
  .handler(async (step, args): Promise<'sent' | 'skipped'> => {
    const workflow = Memberships.invitationDeliveryWorkflow(step, args);

    return await Effect.runPromise(
      workflow.pipe(
        Effect.catchTags({
          ExternalProviderError: ConvexInterop.dieWithConvexError(
            CommonErrors.ExternalProviderError
          ),
          'Workflows/UnknownError': ConvexInterop.dieWithConvexError(
            Workflows.UnknownError
          ),
        })
      )
    );
  });

/** Kept outside Confect to avoid a self-referential codegen type cycle. */
export const startInvitationDelivery = internalMutation({
  args: { membershipId: v.id('memberships') },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await Workflows.workflowManager.start(
      ctx,
      internal.memberships.invitationDeliveryWorkflow,
      { membershipId: args.membershipId },
      {
        startAsync: true,
        onComplete: internal.memberships.handleInvitationDeliveryComplete,
        context: { membershipId: args.membershipId },
      }
    );

    return null;
  },
});

export const handleInvitationDeliveryComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object({ membershipId: v.id('memberships') }),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const outcome: Memberships.InvitationDeliveryOutcome =
      args.result.kind === 'success'
        ? (args.result.returnValue as 'sent' | 'skipped')
        : 'failed';

    await ctx.runMutation(internal.memberships.terminalizeInvitationDelivery, {
      membershipId: args.context.membershipId,
      outcome,
    });

    return null;
  },
});

/** Hands the Invitación to the Resend component, which delivers it durably. */
export const sendInvitationEmail = internalMutation({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.string(),
  },
  returns: vEmailOutcome,
  handler: async (ctx, args): Promise<'sent' | 'skipped'> => {
    const from = env.RESEND_FROM_EMAIL;

    // The Membresía records `skipped`, which the Administrador's list shows.
    if (Predicate.isUndefined(from)) return 'skipped';

    await ResendModule.resend.sendEmail(ctx, { from, ...args });

    return 'sent';
  },
});
