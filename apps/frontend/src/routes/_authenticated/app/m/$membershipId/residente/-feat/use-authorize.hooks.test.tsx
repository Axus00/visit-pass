// @vitest-environment jsdom
import type { ReactNode } from 'react';

import { act, cleanup, renderHook } from '@testing-library/react';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { installFrontendStubs } from '#/test-harness';

import type * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import type { FavoriteSummary } from './authorize.models';
import { useAuthorizeFavorite } from './use-authorize.hooks';

vi.mock('@confect/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@confect/react')>()),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));
vi.mock('convex/react', () => ({ useConvexAuth: vi.fn() }));
vi.mock('@workos-inc/authkit-react', () => ({ useAuth: vi.fn() }));

const MEMBERSHIP = {
  membershipId: 'membership_a',
  residentialUnitTimeZone: 'America/Bogota',
} as unknown as VisitPass.MembershipSummary;

const favorite = (id: string, visitorName: string) =>
  ({
    _id: id,
    visitorName,
    visitorDocument: undefined,
  }) as unknown as FavoriteSummary;

function renderAuthorizeFavorite() {
  const stubs = installFrontendStubs();
  const onShared = vi.fn();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <stubs.Wrapper>
      <MembershipRouteFeat.MembershipProvider
        membership={MEMBERSHIP}
        memberships={[MEMBERSHIP]}
        isSuperadmin={false}
      >
        {children}
      </MembershipRouteFeat.MembershipProvider>
    </stubs.Wrapper>
  );
  const view = renderHook(() => useAuthorizeFavorite(onShared), {
    wrapper: Wrapper,
  });

  return { stubs, onShared, view };
}

/** A mutation call the test settles by hand. */
function deferredCreate(visitorName: string) {
  const settled = Result.succeed({
    passes: [{ token: `token_${visitorName}`, visitorName }],
  });
  const deferred = Deferred.makeUnsafe<typeof settled>();

  return {
    promise: Effect.runPromise(Deferred.await(deferred)),
    settle: () => Deferred.doneUnsafe(deferred, Effect.succeed(settled)),
  };
}

afterEach(cleanup);

describe('useAuthorizeFavorite', () => {
  it('stays authorizing until every started one-tap authorization settles', async () => {
    const { stubs, onShared, view } = renderAuthorizeFavorite();
    const first = deferredCreate('Ana');
    const second = deferredCreate('Luis');
    stubs.mutation
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    expect(view.result.current.isAuthorizing).toBe(false);

    const firstRun = view.result.current.authorize(
      favorite('favorite_a', 'Ana')
    );
    const secondRun = view.result.current.authorize(
      favorite('favorite_b', 'Luis')
    );

    await act(async () => {
      first.settle();
      await firstRun;
    });

    expect(onShared).toHaveBeenCalledOnce();
    expect(view.result.current.isAuthorizing).toBe(true);

    await act(async () => {
      second.settle();
      await secondRun;
    });

    expect(onShared).toHaveBeenCalledTimes(2);
    expect(view.result.current.isAuthorizing).toBe(false);
  });
});
