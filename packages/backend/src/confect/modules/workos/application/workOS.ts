import { Context, type Effect } from 'effect';

import type * as Domain from '../domain';

export type CreateExternalUserDto = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  externalId?: string;
  password?: string;
  emailVerified?: boolean;
};

export type IdempotentCreationOutcome = 'created' | 'existing';

export type CreatedExternalUserResult = {
  user: Domain.WorkOSUser;
  outcome: IdempotentCreationOutcome;
};

/** The WorkOS organization membership of one user in one organization. */
export type ExternalOrganizationMembership = {
  id: string;
  status: 'active' | 'inactive' | 'pending';
  roleSlugs: ReadonlyArray<string>;
};

export type ExternalInvitation = {
  id: string;
  state: 'pending' | 'accepted' | 'expired' | 'revoked';
  acceptInvitationUrl: string;
};

export class WorkOSService extends Context.Service<
  WorkOSService,
  {
    users: {
      createIfNotExists(
        args: CreateExternalUserDto
      ): Effect.Effect<CreatedExternalUserResult, Domain.WorkOSError>;
      getOneById(args: {
        externalUserId: string;
      }): Effect.Effect<Domain.WorkOSUser | null, Domain.WorkOSError>;
      getOneByEmail(args: {
        email: string;
      }): Effect.Effect<Domain.WorkOSUser | null, Domain.WorkOSError>;
      /**
       * Permanently deletes the user. Succeeds when the user is already absent:
       * the caller asks for an end state, not for an event.
       */
      deleteById(args: {
        externalUserId: string;
      }): Effect.Effect<void, Domain.WorkOSError>;
    };
    organizations: {
      /** Reuses the organization that already carries `externalId`. */
      createIfNotExists(args: {
        name: string;
        externalId: string;
      }): Effect.Effect<{ id: string }, Domain.WorkOSError>;
    };
    organizationMemberships: {
      /** WorkOS holds at most one per user and organization, in any status. */
      getOne(args: {
        externalUserId: string;
        externalOrganizationId: string;
      }): Effect.Effect<
        ExternalOrganizationMembership | null,
        Domain.WorkOSError
      >;
      /**
       * Leaves the membership active with `roleSlugs`, creating or
       * reactivating it as needed. An environment without Multiple Roles keeps
       * only the first slug.
       */
      grant(args: {
        externalUserId: string;
        externalOrganizationId: string;
        roleSlugs: ReadonlyArray<string>;
        current: ExternalOrganizationMembership | null;
      }): Effect.Effect<void, Domain.WorkOSError>;
      /** Deactivates the membership, which revokes the user's sessions in it. */
      deactivate(args: {
        externalMembershipId: string;
      }): Effect.Effect<void, Domain.WorkOSError>;
    };
    invitations: {
      /**
       * Answers null when WorkOS refuses, as it does for someone already in
       * the organization. WorkOS never emails it: the app sends its own.
       */
      send(args: {
        email: string;
        externalOrganizationId: string;
        expiresInDays: number;
      }): Effect.Effect<ExternalInvitation | null, Domain.WorkOSError>;
      getOne(args: {
        externalInvitationId: string;
      }): Effect.Effect<ExternalInvitation | null, Domain.WorkOSError>;
      /** Succeeds when the invitation is already gone, accepted or revoked. */
      revoke(args: {
        externalInvitationId: string;
      }): Effect.Effect<void, Domain.WorkOSError>;
    };
  }
>()('@repo/backend/confect/modules/workos/application/WorkOSService') {}
