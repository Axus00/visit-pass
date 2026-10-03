import type { Invitation, OrganizationMembership } from '@workos-inc/node';
import { Effect, Layer, Predicate } from 'effect';

import * as Application from '../application';
import * as Domain from '../domain';
import { WorkOSClient, workOSClientLayer } from './client';
import { mapNotFoundEntityError } from './errorMapping';

type WorkOSServiceTestOverrides = {
  users?: Partial<Application.WorkOSService['Service']['users']>;
};

const toExternalOrganizationMembership = (
  membership: OrganizationMembership
): Application.ExternalOrganizationMembership => ({
  id: membership.id,
  status: membership.status,
  roleSlugs: (membership.roles ?? [membership.role]).map((role) => role.slug),
});

const toExternalInvitation = (
  invitation: Invitation
): Application.ExternalInvitation => ({
  id: invitation.id,
  state: invitation.state,
  acceptInvitationUrl: invitation.acceptInvitationUrl,
});

/** One slug travels as `roleSlug`, which every environment accepts. */
const toRoleOptions = (roleSlugs: ReadonlyArray<string>) =>
  roleSlugs.length === 1
    ? { roleSlug: roleSlugs[0] }
    : { roleSlugs: [...roleSlugs] };

export const makeWorkOSUserFixture = (
  overrides: Partial<Domain.WorkOSUser> = {}
): Domain.WorkOSUser => ({
  object: 'user',
  id: 'user_test',
  email: 'user@example.test',
  emailVerified: false,
  profilePictureUrl: null,
  name: null,
  firstName: null,
  lastName: null,
  lastSignInAt: null,
  locale: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  externalId: null,
  metadata: {},
  ...overrides,
});

export const makeWorkOSTestLayer = (
  overrides: WorkOSServiceTestOverrides = {}
) =>
  Layer.succeed(
    Application.WorkOSService,
    Application.WorkOSService.of({
      users: {
        createIfNotExists:
          overrides.users?.createIfNotExists ??
          ((input) =>
            Effect.succeed({
              user: makeWorkOSUserFixture({
                id: input.externalId ?? 'user_test',
                email: input.email,
                emailVerified: input.emailVerified ?? false,
                firstName: input.firstName ?? null,
                lastName: input.lastName ?? null,
                externalId: input.externalId ?? null,
              }),
              outcome: 'existing' as const,
            })),
        getOneById: overrides.users?.getOneById ?? (() => Effect.succeed(null)),
        getOneByEmail:
          overrides.users?.getOneByEmail ?? (() => Effect.succeed(null)),
        deleteById: overrides.users?.deleteById ?? (() => Effect.void),
      },
      organizations: {
        createIfNotExists: (input) =>
          Effect.succeed({ id: `org_${input.externalId}` }),
      },
      organizationMemberships: {
        getOne: () => Effect.succeed(null),
        grant: () => Effect.void,
        deactivate: () => Effect.void,
      },
      invitations: {
        send: () => Effect.succeed(null),
        getOne: () => Effect.succeed(null),
        revoke: () => Effect.void,
      },
    })
  );

export const workOSLayerNoDeps = Layer.effect(
  Application.WorkOSService,
  Effect.gen(function* () {
    const workos = yield* WorkOSClient;

    const getOneUserByEmail = Effect.fn('WorkOSService.getOneUserByEmail')(
      function* (email: string) {
        const users = yield* workos.use((client) =>
          client.userManagement.listUsers({ email })
        );
        const normalizedEmail = email.toLowerCase();

        return (
          users.data.find(
            (user) => user.email.toLowerCase() === normalizedEmail
          ) ?? null
        );
      }
    );

    return Application.WorkOSService.of({
      users: {
        createIfNotExists: Effect.fn(
          'WorkOSService.users.createUserIfNotExists'
        )(function* (input: Application.CreateExternalUserDto) {
          const existingUser = yield* getOneUserByEmail(input.email);

          if (existingUser)
            return {
              user: existingUser,
              outcome: 'existing' as const,
            };

          const createdUser = yield* workos
            .use((client) =>
              client.userManagement.createUser({
                email: input.email,
                emailVerified: input.emailVerified,
                firstName: input.firstName ?? undefined,
                lastName: input.lastName ?? undefined,
                externalId: input.externalId,
                password: input.password,
              })
            )
            .pipe(
              Effect.map((createdUser) => ({
                outcome: 'created' as const,
                user: createdUser,
              })),
              Effect.catch((createError) =>
                getOneUserByEmail(input.email).pipe(
                  Effect.flatMap((concurrentlyCreatedUser) =>
                    concurrentlyCreatedUser
                      ? Effect.succeed({
                          outcome: 'reused-after-race' as const,
                          user: concurrentlyCreatedUser,
                        })
                      : Effect.fail(createError)
                  )
                )
              )
            );

          return {
            user: createdUser.user,
            outcome:
              createdUser.outcome === 'created'
                ? ('created' as const)
                : ('existing' as const),
          };
        }),
        getOneById: Effect.fn('WorkOSService.users.getOneById')(
          function* (args) {
            return yield* workos
              .use((client) =>
                client.userManagement.getUser(args.externalUserId)
              )
              .pipe(
                mapNotFoundEntityError('user'),
                Effect.catchTag('WorkOSNotFoundEntity', () =>
                  Effect.succeed(null)
                )
              );
          }
        ),
        getOneByEmail: Effect.fn('WorkOSService.users.getOneByEmail')(
          function* (args) {
            return yield* getOneUserByEmail(args.email);
          }
        ),
        deleteById: Effect.fn('WorkOSService.users.deleteById')(
          function* (args) {
            yield* workos
              .use((client) =>
                client.userManagement.deleteUser(args.externalUserId)
              )
              .pipe(
                mapNotFoundEntityError('user'),
                Effect.catchTag('WorkOSNotFoundEntity', () => Effect.void)
              );
          }
        ),
      },
      organizations: {
        createIfNotExists: Effect.fn(
          'WorkOSService.organizations.createIfNotExists'
        )(function* (args) {
          const existing = yield* workos
            .use((client) =>
              client.organizations.getOrganizationByExternalId(args.externalId)
            )
            .pipe(
              mapNotFoundEntityError('organization'),
              Effect.catchTag('WorkOSNotFoundEntity', () =>
                Effect.succeed(null)
              )
            );

          if (Predicate.isNotNull(existing)) return { id: existing.id };

          const created = yield* workos.use((client) =>
            client.organizations.createOrganization({
              name: args.name,
              externalId: args.externalId,
            })
          );

          return { id: created.id };
        }),
      },
      organizationMemberships: {
        getOne: Effect.fn('WorkOSService.organizationMemberships.getOne')(
          function* (args) {
            const memberships = yield* workos.use((client) =>
              client.userManagement.listOrganizationMemberships({
                userId: args.externalUserId,
                organizationId: args.externalOrganizationId,
                statuses: ['active', 'inactive', 'pending'],
              })
            );
            const [membership] = memberships.data;

            return Predicate.isUndefined(membership)
              ? null
              : toExternalOrganizationMembership(membership);
          }
        ),
        grant: Effect.fn('WorkOSService.organizationMemberships.grant')(
          function* (args) {
            const { current, roleSlugs } = args;
            const [widestRoleSlug] = roleSlugs;

            // Multiple Roles is a dashboard setting worktrees cannot carry.
            const withSingleRoleFallback = <A>(
              write: (
                roleOptions: ReturnType<typeof toRoleOptions>
              ) => Effect.Effect<A, Domain.WorkOSError>
            ) =>
              write(toRoleOptions(roleSlugs)).pipe(
                Effect.catch((error) =>
                  roleSlugs.length > 1 &&
                  Predicate.isNotUndefined(widestRoleSlug)
                    ? write(toRoleOptions([widestRoleSlug]))
                    : Effect.fail(error)
                )
              );

            // A WorkOS invitation leaves a pending membership behind that can be
            // neither updated nor deactivated, only replaced.
            const isAwaitingInvitation =
              Predicate.isNotNull(current) && current.status === 'pending';

            if (isAwaitingInvitation)
              yield* workos.use((client) =>
                client.userManagement.deleteOrganizationMembership(current.id)
              );

            if (Predicate.isNull(current) || isAwaitingInvitation) {
              yield* withSingleRoleFallback((roleOptions) =>
                workos.use((client) =>
                  client.userManagement.createOrganizationMembership({
                    userId: args.externalUserId,
                    organizationId: args.externalOrganizationId,
                    ...roleOptions,
                  })
                )
              );
              return;
            }

            if (current.status === 'inactive')
              yield* workos.use((client) =>
                client.userManagement.reactivateOrganizationMembership(
                  current.id
                )
              );

            yield* withSingleRoleFallback((roleOptions) =>
              workos.use((client) =>
                client.userManagement.updateOrganizationMembership(
                  current.id,
                  roleOptions
                )
              )
            );
          }
        ),
        deactivate: Effect.fn(
          'WorkOSService.organizationMemberships.deactivate'
        )(function* (args) {
          yield* workos
            .use((client) =>
              client.userManagement.deactivateOrganizationMembership(
                args.externalMembershipId
              )
            )
            .pipe(
              mapNotFoundEntityError('organization membership'),
              Effect.catchTag('WorkOSNotFoundEntity', () => Effect.void)
            );
        }),
      },
      invitations: {
        send: Effect.fn('WorkOSService.invitations.send')(function* (args) {
          return yield* workos
            .use((client) =>
              client.userManagement.sendInvitation({
                email: args.email,
                organizationId: args.externalOrganizationId,
                expiresInDays: args.expiresInDays,
              })
            )
            .pipe(
              Effect.map(toExternalInvitation),
              Effect.catch((error) =>
                Effect.logInfo(
                  '[WorkOSService.invitations.send] WorkOS refused the invitation',
                  { cause: error.cause }
                ).pipe(Effect.as(null))
              )
            );
        }),
        getOne: Effect.fn('WorkOSService.invitations.getOne')(function* (args) {
          return yield* workos
            .use((client) =>
              client.userManagement.getInvitation(args.externalInvitationId)
            )
            .pipe(
              Effect.map(toExternalInvitation),
              mapNotFoundEntityError('invitation'),
              Effect.catchTag('WorkOSNotFoundEntity', () =>
                Effect.succeed(null)
              )
            );
        }),
        revoke: Effect.fn('WorkOSService.invitations.revoke')(function* (args) {
          const invitation = yield* workos
            .use((client) =>
              client.userManagement.getInvitation(args.externalInvitationId)
            )
            .pipe(
              mapNotFoundEntityError('invitation'),
              Effect.catchTag('WorkOSNotFoundEntity', () =>
                Effect.succeed(null)
              )
            );

          const isRevocable =
            Predicate.isNotNull(invitation) && invitation.state === 'pending';

          if (!isRevocable) return;

          yield* workos.use((client) =>
            client.userManagement.revokeInvitation(args.externalInvitationId)
          );
        }),
      },
    });
  })
);

export const workOSLayer = workOSLayerNoDeps.pipe(
  Layer.provide(workOSClientLayer)
);
