import { FunctionSpec, GroupSpec } from '@confect/core';
import * as Schema from 'effect/Schema';

import { Id } from './_generated/id';
import type {
  handleInvitationDeliveryComplete,
  invitationDeliveryWorkflow,
  sendInvitationEmail,
  startInvitationDelivery,
} from './memberships';
import RequireUnitMembership from './middleware/RequireUnitMembership.spec';
import RequireUserIdentity from './middleware/RequireUserIdentity.spec';
import * as ApartmentsDomain from './modules/apartments/domain';
import * as AuthenticationDomain from './modules/authentication/domain';
import * as CommonErrorsDomain from './modules/commonErrors/domain';
import * as MembershipsDomain from './modules/memberships/domain';

const ExternalInvitationLink = Schema.Struct({
  externalInvitationId: Schema.String,
  acceptInvitationUrl: Schema.String,
});

export default GroupSpec.make()
  // -*******************************************************************************-
  // Public: any signed-in Usuario
  // -*******************************************************************************-
  .addFunction(
    /** Answers null until the WorkOS webhook has synced the signed-in person. */
    FunctionSpec.publicQuery({
      name: 'myAccess',
      args: () => ({}),
      returns: () => Schema.NullOr(MembershipsDomain.MyAccess),
      error: () => Schema.Never,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: 'accept',
      args: () => ({ membershipId: Id('memberships') }),
      returns: () => Schema.Null,
      error: () =>
        Schema.Union([
          MembershipsDomain.InvitationNotFoundError,
          MembershipsDomain.InvitationExpiredError,
          MembershipsDomain.EmailNotVerifiedError,
        ]),
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** "No soy yo": the Membresía pendiente is rejected for good. */
    FunctionSpec.publicMutation({
      name: 'reject',
      args: () => ({ membershipId: Id('memberships') }),
      returns: () => Schema.Null,
      error: () => MembershipsDomain.InvitationNotFoundError,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /**
     * Brings WorkOS in line with the caller's Membresías in a unit and answers
     * the Organization to switch the session to. Call it before switching.
     */
    FunctionSpec.publicAction({
      name: 'ensureUnitAccess',
      args: () => ({ residentialUnitId: Id('residentialUnits') }),
      returns: () => Schema.String,
      error: () =>
        Schema.Union([
          AuthenticationDomain.NoUserIdentityFoundError,
          MembershipsDomain.MembershipRequiredError,
          CommonErrorsDomain.ExternalProviderError,
        ]),
    })
  )

  // -*******************************************************************************-
  // Public: the Administrador of the active Unidad residencial
  // -*******************************************************************************-
  .addFunction(
    FunctionSpec.publicQuery({
      name: 'list',
      args: () => ({}),
      returns: () => Schema.Array(MembershipsDomain.MembershipSummary),
      error: () => MembershipsDomain.RoleRequiredError,
    }).middleware(RequireUnitMembership)
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: 'invite',
      args: () => MembershipsDomain.InviteMembershipDto.fields,
      returns: () => Id('memberships'),
      error: () =>
        Schema.Union([
          MembershipsDomain.RoleRequiredError,
          MembershipsDomain.InvalidResidentAssignmentError,
          MembershipsDomain.DuplicateMembershipError,
          ApartmentsDomain.ApartmentNotFoundError,
        ]),
    }).middleware(RequireUnitMembership)
  )
  .addFunction(
    /** Sends the Invitación again; an expired one gets another 30 days. */
    FunctionSpec.publicMutation({
      name: 'resendInvitation',
      args: () => ({ membershipId: Id('memberships') }),
      returns: () => Schema.Null,
      error: () =>
        Schema.Union([
          MembershipsDomain.RoleRequiredError,
          MembershipsDomain.MembershipNotFoundError,
        ]),
    }).middleware(RequireUnitMembership)
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: 'withdrawInvitation',
      args: () => ({ membershipId: Id('memberships') }),
      returns: () => Schema.Null,
      error: () =>
        Schema.Union([
          MembershipsDomain.RoleRequiredError,
          MembershipsDomain.MembershipNotFoundError,
        ]),
    }).middleware(RequireUnitMembership)
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: 'revoke',
      args: () => ({ membershipId: Id('memberships') }),
      returns: () => Schema.Null,
      error: () =>
        Schema.Union([
          MembershipsDomain.RoleRequiredError,
          MembershipsDomain.MembershipNotFoundError,
          MembershipsDomain.CannotRevokeOwnMembershipError,
        ]),
    }).middleware(RequireUnitMembership)
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: 'updateOccupancyType',
      args: () => MembershipsDomain.UpdateOccupancyTypeDto.fields,
      returns: () => Schema.Null,
      error: () =>
        Schema.Union([
          MembershipsDomain.RoleRequiredError,
          MembershipsDomain.MembershipNotFoundError,
        ]),
    }).middleware(RequireUnitMembership)
  )

  // -*******************************************************************************-
  // Internal: WorkOS access
  // -*******************************************************************************-
  .addFunction(
    FunctionSpec.internalQuery({
      name: 'getUnitAccessTarget',
      args: () => ({
        userId: Id('users'),
        residentialUnitId: Id('residentialUnits'),
      }),
      returns: () => Schema.NullOr(MembershipsDomain.UnitAccessTarget),
      error: () => Schema.Never,
    })
  )
  .addFunction(
    FunctionSpec.internalAction({
      name: 'syncUnitAccess',
      args: () => ({
        userId: Id('users'),
        residentialUnitId: Id('residentialUnits'),
        releasedExternalInvitationId: Schema.optional(Schema.String),
      }),
      returns: () => Schema.Null,
      error: () => CommonErrorsDomain.ExternalProviderError,
    })
  )
  .addFunction(
    /** A WorkOS membership changed outside the app: reconcile it back. */
    FunctionSpec.internalMutation({
      name: 'handleExternalMembershipChange',
      args: () => ({
        externalUserId: Schema.String,
        externalOrganizationId: Schema.String,
        /** Whether WorkOS now holds an active membership for the pair. */
        hasAccess: Schema.Boolean,
      }),
      returns: () => Schema.Null,
      error: () => Schema.Never,
    })
  )

  // -*******************************************************************************-
  // Internal: Invitación delivery
  // -*******************************************************************************-
  .addFunction(
    FunctionSpec.internalQuery({
      name: 'getInvitationDeliveryTarget',
      args: () => ({ membershipId: Id('memberships') }),
      returns: () =>
        Schema.NullOr(
          Schema.Struct({
            email: Schema.String,
            externalOrganizationId: Schema.String,
            externalInvitationId: Schema.NullOr(Schema.String),
          })
        ),
      error: () => Schema.Never,
    })
  )
  .addFunction(
    /** Answers null when the Invitación should link to the app instead of WorkOS. */
    FunctionSpec.internalAction({
      name: 'prepareExternalInvitation',
      args: () => ({ membershipId: Id('memberships') }),
      returns: () => Schema.NullOr(ExternalInvitationLink),
      error: () => CommonErrorsDomain.ExternalProviderError,
    })
  )
  .addFunction(
    /** Answers the email to send, or null when the Membresía is no longer pending. */
    FunctionSpec.internalMutation({
      name: 'recordExternalInvitation',
      args: () => ({
        membershipId: Id('memberships'),
        externalInvitation: Schema.NullOr(ExternalInvitationLink),
      }),
      returns: () => Schema.NullOr(MembershipsDomain.InvitationEmail),
      error: () => Schema.Never,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: 'terminalizeInvitationDelivery',
      args: () => ({
        membershipId: Id('memberships'),
        outcome: MembershipsDomain.InvitationDeliveryOutcome,
      }),
      returns: () => Schema.Null,
      error: () => Schema.Never,
    })
  )
  .addFunction(
    FunctionSpec.internalAction({
      name: 'releaseExternalInvitation',
      args: () => ({ externalInvitationId: Schema.String }),
      returns: () => Schema.Null,
      error: () => CommonErrorsDomain.ExternalProviderError,
    })
  )
  .addFunction(
    /** WorkOS accepted or revoked the invitation, so its link no longer works. */
    FunctionSpec.internalMutation({
      name: 'detachExternalInvitation',
      args: () => ({ externalInvitationId: Schema.String }),
      returns: () => Schema.Null,
      error: () => Schema.Never,
    })
  )
  .addFunction(
    FunctionSpec.convexInternalMutation<typeof invitationDeliveryWorkflow>()(
      'invitationDeliveryWorkflow'
    )
  )
  .addFunction(
    FunctionSpec.convexInternalMutation<typeof startInvitationDelivery>()(
      'startInvitationDelivery'
    )
  )
  .addFunction(
    FunctionSpec.convexInternalMutation<
      typeof handleInvitationDeliveryComplete
    >()('handleInvitationDeliveryComplete')
  )
  .addFunction(
    FunctionSpec.convexInternalMutation<typeof sendInvitationEmail>()(
      'sendInvitationEmail'
    )
  );
