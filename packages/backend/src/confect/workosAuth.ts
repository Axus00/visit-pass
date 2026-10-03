import { type AuthFunctions, AuthKit } from '@convex-dev/workos-authkit';

import { internal } from '#convex/_generated/api';
import type { DataModel } from '#convex/_generated/dataModel';

import { components } from './_generated/components';

const authFunctions: AuthFunctions = internal.workosAuth;

export const authKit = new AuthKit<DataModel>(components.workOSAuthKit, {
  authFunctions,
  additionalEventTypes: [
    'organization_membership.created',
    'organization_membership.updated',
    'organization_membership.deleted',
    'invitation.accepted',
    'invitation.revoked',
  ],
});

export const { authKitEvent } = authKit.events({
  'user.created': async (ctx, event): Promise<void> => {
    await ctx.runMutation(internal.users.upsertFromWorkOS, {
      workosUser: event.data,
    });
  },
  'user.updated': async (ctx, event): Promise<void> => {
    await ctx.runMutation(internal.users.upsertFromWorkOS, {
      workosUser: event.data,
    });
  },
  'user.deleted': async (ctx, event): Promise<void> => {
    await ctx.runMutation(internal.users.softDeleteByExternalId, {
      externalId: event.data.id,
    });
  },
  // Convex owns Membresías (ADR 0008): a WorkOS membership that changed is
  // only checked against them and put back when it drifted.
  'organization_membership.created': async (ctx, event): Promise<void> => {
    await ctx.runMutation(internal.memberships.handleExternalMembershipChange, {
      externalUserId: event.data.userId,
      externalOrganizationId: event.data.organizationId,
      hasAccess: event.data.status === 'active',
    });
  },
  'organization_membership.updated': async (ctx, event): Promise<void> => {
    await ctx.runMutation(internal.memberships.handleExternalMembershipChange, {
      externalUserId: event.data.userId,
      externalOrganizationId: event.data.organizationId,
      hasAccess: event.data.status === 'active',
    });
  },
  'organization_membership.deleted': async (ctx, event): Promise<void> => {
    await ctx.runMutation(internal.memberships.handleExternalMembershipChange, {
      externalUserId: event.data.userId,
      externalOrganizationId: event.data.organizationId,
      hasAccess: false,
    });
  },
  'invitation.accepted': async (ctx, event): Promise<void> => {
    await ctx.runMutation(internal.memberships.detachExternalInvitation, {
      externalInvitationId: event.data.id,
    });
  },
  'invitation.revoked': async (ctx, event): Promise<void> => {
    await ctx.runMutation(internal.memberships.detachExternalInvitation, {
      externalInvitationId: event.data.id,
    });
  },
});
