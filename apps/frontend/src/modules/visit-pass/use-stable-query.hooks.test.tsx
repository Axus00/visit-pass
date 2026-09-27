// @vitest-environment jsdom
import { QueryResult, useQuery } from '@confect/react';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import refs from '@repo/backend/refs';

import { useStableQuery } from './use-stable-query.hooks';

vi.mock('@confect/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@confect/react')>()),
  useQuery: vi.fn(),
}));

const ref = refs.public.shifts.getMyState;
type Args = { membershipId: string; now: number } | 'skip';

/** What the fake server has answered, keyed by the exact args. */
let answered: Map<string, QueryResult.QueryResult<unknown, unknown>>;

const answer = (args: Args, value: unknown) =>
  answered.set(JSON.stringify(args), QueryResult.succeed(value));

beforeEach(() => {
  answered = new Map();
  vi.mocked(useQuery).mockImplementation(
    ((_ref: unknown, args: Args) =>
      answered.get(JSON.stringify(args)) ??
      QueryResult.load(args === 'skip')) as never
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderStableQuery(initialArgs: Args) {
  return renderHook(({ args }) => useStableQuery(ref, args as never), {
    initialProps: { args: initialArgs },
  });
}

describe('useStableQuery', () => {
  it('keeps the previous Success while a new `now` is loading', () => {
    answer({ membershipId: 'm1', now: 0 }, 'state at 0');
    const { result, rerender } = renderStableQuery({
      membershipId: 'm1',
      now: 0,
    });

    rerender({ args: { membershipId: 'm1', now: 60_000 } });

    expect(result.current).toMatchObject({
      _tag: 'Success',
      value: 'state at 0',
    });
  });

  it('switches to the fresh Success once the new `now` answers', () => {
    answer({ membershipId: 'm1', now: 0 }, 'state at 0');
    const { result, rerender } = renderStableQuery({
      membershipId: 'm1',
      now: 0,
    });

    answer({ membershipId: 'm1', now: 60_000 }, 'state at 60000');
    rerender({ args: { membershipId: 'm1', now: 60_000 } });

    expect(result.current).toMatchObject({ value: 'state at 60000' });
  });

  it('reads as Loading when another arg changes, not the previous data', () => {
    answer({ membershipId: 'm1', now: 0 }, 'state of m1');
    const { result, rerender } = renderStableQuery({
      membershipId: 'm1',
      now: 0,
    });

    rerender({ args: { membershipId: 'm2', now: 0 } });

    expect(QueryResult.isLoading(result.current)).toBe(true);
  });

  it('does not bring back an old identity after switching away and back', () => {
    answer({ membershipId: 'm1', now: 0 }, 'state of m1');
    answer({ membershipId: 'm2', now: 0 }, 'state of m2');
    const { result, rerender } = renderStableQuery({
      membershipId: 'm1',
      now: 0,
    });

    rerender({ args: { membershipId: 'm2', now: 0 } });
    rerender({ args: { membershipId: 'm1', now: 60_000 } });

    expect(QueryResult.isLoading(result.current)).toBe(true);
  });

  it('reads as Loading after skipping, even with a previous Success', () => {
    answer({ membershipId: 'm1', now: 0 }, 'state of m1');
    const { result, rerender } = renderStableQuery({
      membershipId: 'm1',
      now: 0,
    });

    rerender({ args: 'skip' });

    expect(result.current).toMatchObject({ _tag: 'Loading', skipped: true });
  });

  it('reads as Loading before the first answer', () => {
    const { result } = renderStableQuery({ membershipId: 'm1', now: 0 });

    expect(QueryResult.isLoading(result.current)).toBe(true);
  });
});
