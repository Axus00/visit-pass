import { describe, it } from '@effect/vitest';
import * as EffectVitestUtils from '@effect/vitest/utils';
import { NotFoundException } from '@workos-inc/node';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { vi } from 'vitest';

import * as Application from '../application';
import * as Domain from '../domain';
import { WorkOSClient } from './client';
import { workOSLayerNoDeps } from './workOS';

const makeWorkOSServiceLayer = (
  userManagement: Record<string, (...args: any[]) => Promise<unknown>>
) =>
  workOSLayerNoDeps.pipe(
    Layer.provide(
      Layer.succeed(
        WorkOSClient,
        WorkOSClient.of({
          use: (fn) =>
            Effect.tryPromise({
              try: async () => (await fn({ userManagement } as never)) as never,
              catch: (cause) =>
                new Domain.WorkOSError({
                  message: 'WorkOS call failed',
                  cause,
                }),
            }),
        })
      )
    )
  );

const notFound = new NotFoundException({
  path: '/user_management/users/user_gone',
  requestID: 'request_test',
});

describe('WorkOSService.users', () => {
  it.effect('finds a user by address regardless of case', () =>
    Effect.gen(function* () {
      const workos = yield* Application.WorkOSService;

      const user = yield* workos.users.getOneByEmail({
        email: 'Rosa@Example.test',
      });

      EffectVitestUtils.strictEqual(user?.id, 'user_rosa');
    }).pipe(
      Effect.provide(
        makeWorkOSServiceLayer({
          listUsers: () =>
            Promise.resolve({
              data: [{ id: 'user_rosa', email: 'rosa@example.test' }],
            }),
        })
      )
    )
  );

  it.effect('reuses the user an address already resolves to', () => {
    const createUser = vi.fn();

    return Effect.gen(function* () {
      const workos = yield* Application.WorkOSService;

      const result = yield* workos.users.createIfNotExists({
        email: 'rosa@example.test',
      });

      EffectVitestUtils.strictEqual(result.outcome, 'existing');
      EffectVitestUtils.strictEqual(createUser.mock.calls.length, 0);
    }).pipe(
      Effect.provide(
        makeWorkOSServiceLayer({
          listUsers: () =>
            Promise.resolve({
              data: [{ id: 'user_rosa', email: 'rosa@example.test' }],
            }),
          createUser,
        })
      )
    );
  });

  it.effect('reuses a user created concurrently after a failed create', () => {
    const listUsers = vi
      .fn()
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [{ id: 'user_rosa', email: 'rosa@example.test' }],
      });

    return Effect.gen(function* () {
      const workos = yield* Application.WorkOSService;

      const result = yield* workos.users.createIfNotExists({
        email: 'rosa@example.test',
      });

      EffectVitestUtils.strictEqual(result.user.id, 'user_rosa');
      EffectVitestUtils.strictEqual(result.outcome, 'existing');
    }).pipe(
      Effect.provide(
        makeWorkOSServiceLayer({
          listUsers,
          createUser: () => Promise.reject(new Error('conflict')),
        })
      )
    );
  });

  it.effect('answers null for a user this environment never had', () =>
    Effect.gen(function* () {
      const workos = yield* Application.WorkOSService;

      const user = yield* workos.users.getOneById({
        externalUserId: 'user_gone',
      });

      EffectVitestUtils.strictEqual(user, null);
    }).pipe(
      Effect.provide(
        makeWorkOSServiceLayer({ getUser: () => Promise.reject(notFound) })
      )
    )
  );

  it.effect('treats deleting an absent user as done', () =>
    Effect.gen(function* () {
      const workos = yield* Application.WorkOSService;

      const result = yield* Effect.result(
        workos.users.deleteById({ externalUserId: 'user_gone' })
      );

      EffectVitestUtils.strictEqual(result._tag, 'Success');
    }).pipe(
      Effect.provide(
        makeWorkOSServiceLayer({ deleteUser: () => Promise.reject(notFound) })
      )
    )
  );
});

const pair = {
  externalUserId: 'user_rosa',
  externalOrganizationId: 'org_north',
};

describe('WorkOSService.organizationMemberships.grant', () => {
  it.effect(
    'creates the membership for someone new to the organization',
    () => {
      const createOrganizationMembership = vi.fn().mockResolvedValue({});

      return Effect.gen(function* () {
        const workos = yield* Application.WorkOSService;

        yield* workos.organizationMemberships.grant({
          ...pair,
          roleSlugs: ['residente'],
          current: null,
        });

        EffectVitestUtils.deepStrictEqual(
          createOrganizationMembership.mock.calls,
          [
            [
              {
                userId: 'user_rosa',
                organizationId: 'org_north',
                roleSlug: 'residente',
              },
            ],
          ]
        );
      }).pipe(
        Effect.provide(makeWorkOSServiceLayer({ createOrganizationMembership }))
      );
    }
  );

  it.effect('replaces the pending membership a WorkOS invitation left', () => {
    const calls: Array<string> = [];

    return Effect.gen(function* () {
      const workos = yield* Application.WorkOSService;

      yield* workos.organizationMemberships.grant({
        ...pair,
        roleSlugs: ['residente'],
        current: { id: 'om_pending', status: 'pending', roleSlugs: ['member'] },
      });

      EffectVitestUtils.deepStrictEqual(calls, ['delete om_pending', 'create']);
    }).pipe(
      Effect.provide(
        makeWorkOSServiceLayer({
          deleteOrganizationMembership: (id: string) => {
            calls.push(`delete ${id}`);
            return Promise.resolve();
          },
          createOrganizationMembership: () => {
            calls.push('create');
            return Promise.resolve({});
          },
        })
      )
    );
  });

  it.effect(
    'reactivates an inactive membership before setting its roles',
    () => {
      const calls: Array<string> = [];

      return Effect.gen(function* () {
        const workos = yield* Application.WorkOSService;

        yield* workos.organizationMemberships.grant({
          ...pair,
          roleSlugs: ['portero'],
          current: { id: 'om_1', status: 'inactive', roleSlugs: ['residente'] },
        });

        EffectVitestUtils.deepStrictEqual(calls, [
          'reactivate om_1',
          'update om_1 portero',
        ]);
      }).pipe(
        Effect.provide(
          makeWorkOSServiceLayer({
            reactivateOrganizationMembership: (id: string) => {
              calls.push(`reactivate ${id}`);
              return Promise.resolve({});
            },
            updateOrganizationMembership: (
              id: string,
              options: { roleSlug?: string }
            ) => {
              calls.push(`update ${id} ${options.roleSlug}`);
              return Promise.resolve({});
            },
          })
        )
      );
    }
  );

  it.effect(
    'keeps the widest Rol where the environment lacks Multiple Roles',
    () => {
      const updateOrganizationMembership = vi
        .fn()
        .mockRejectedValueOnce(new Error('multiple roles are not enabled'))
        .mockResolvedValueOnce({});

      return Effect.gen(function* () {
        const workos = yield* Application.WorkOSService;

        yield* workos.organizationMemberships.grant({
          ...pair,
          roleSlugs: ['administrador', 'residente'],
          current: { id: 'om_1', status: 'active', roleSlugs: ['residente'] },
        });

        EffectVitestUtils.deepStrictEqual(
          updateOrganizationMembership.mock.calls,
          [
            ['om_1', { roleSlugs: ['administrador', 'residente'] }],
            ['om_1', { roleSlug: 'administrador' }],
          ]
        );
      }).pipe(
        Effect.provide(makeWorkOSServiceLayer({ updateOrganizationMembership }))
      );
    }
  );
});

describe('WorkOSService.invitations', () => {
  it.effect('answers null when WorkOS refuses to invite', () =>
    Effect.gen(function* () {
      const workos = yield* Application.WorkOSService;

      const invitation = yield* workos.invitations.send({
        email: 'rosa@example.test',
        externalOrganizationId: 'org_north',
        expiresInDays: 30,
      });

      EffectVitestUtils.strictEqual(invitation, null);
    }).pipe(
      Effect.provide(
        makeWorkOSServiceLayer({
          sendInvitation: () =>
            Promise.reject(new Error('user is already a member')),
        })
      )
    )
  );

  it.effect('revokes only an invitation that is still pending', () => {
    const revokeInvitation = vi.fn().mockResolvedValue({});

    return Effect.gen(function* () {
      const workos = yield* Application.WorkOSService;

      yield* workos.invitations.revoke({ externalInvitationId: 'inv_done' });
      yield* workos.invitations.revoke({ externalInvitationId: 'inv_gone' });
      yield* workos.invitations.revoke({ externalInvitationId: 'inv_open' });

      EffectVitestUtils.deepStrictEqual(revokeInvitation.mock.calls, [
        ['inv_open'],
      ]);
    }).pipe(
      Effect.provide(
        makeWorkOSServiceLayer({
          getInvitation: (id: string) =>
            id === 'inv_gone'
              ? Promise.reject(notFound)
              : Promise.resolve({
                  id,
                  state: id === 'inv_open' ? 'pending' : 'accepted',
                }),
          revokeInvitation,
        })
      )
    );
  });
});
