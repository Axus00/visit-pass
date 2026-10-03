import type { WorkflowCtx } from '@convex-dev/workflow';
import { type Infer, v } from 'convex/values';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import refs from '../../../_generated/refs';
import type * as CommonErrorsDomain from '../../commonErrors/domain';
import * as WorkflowsApplication from '../../workflows/application';
import type * as WorkflowsDomain from '../../workflows/domain';

const InvitationDeliveryDto = {
  membershipId: v.id('memberships'),
};

const vInvitationDeliveryDto = v.object(InvitationDeliveryDto);
type InvitationDeliveryDto = Infer<typeof vInvitationDeliveryDto>;

export { InvitationDeliveryDto };

/**
 * Delivers one Invitación: asks WorkOS for a sign-up link when the person is
 * not in the unit yet, records it, and hands the email to Resend. `onComplete`
 * writes the outcome on the Membresía pendiente.
 */
export const invitationDeliveryWorkflow = Effect.fn(
  'invitationDeliveryWorkflow'
)(function* (
  step: WorkflowCtx,
  args: InvitationDeliveryDto
): Effect.fn.Return<
  'sent' | 'skipped',
  CommonErrorsDomain.ExternalProviderError | WorkflowsDomain.UnknownError
> {
  const workflowRunner = WorkflowsApplication.makeConfectWorkflowRunner(step);

  const externalInvitation = yield* workflowRunner
    .runAction(refs.internal.memberships.prepareExternalInvitation, args)
    .pipe(Effect.catchTag('SchemaError', Effect.die));

  const email = yield* workflowRunner
    .runMutation(refs.internal.memberships.recordExternalInvitation, {
      membershipId: args.membershipId,
      externalInvitation,
    })
    .pipe(Effect.catchTag('SchemaError', Effect.die));

  if (Predicate.isNull(email)) return 'skipped';

  return yield* workflowRunner
    .runMutation(refs.internal.memberships.sendInvitationEmail, email)
    .pipe(Effect.catchTag('SchemaError', Effect.die));
});
