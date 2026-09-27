import { useState } from 'react';

import type * as Ref from '@confect/core/Ref';
import { QueryResult, useQuery } from '@confect/react';
import * as Predicate from 'effect/Predicate';

type ArgsOrSkip<Query extends Ref.AnyPublicQuery> = Ref.Args<Query> | 'skip';

type Result<Query extends Ref.AnyPublicQuery> = QueryResult.QueryResult<
  Ref.Returns<Query>,
  Ref.Error<Query>
>;

type KeptSuccess<Query extends Ref.AnyPublicQuery> = {
  readonly identity: string;
  readonly result: Result<Query>;
};

/**
 * Confect's rest-tuple `useQuery` signature only resolves for a concrete ref,
 * so the generic hook below calls it through this plain two-argument view.
 */
const useConfectQuery = useQuery as <Query extends Ref.AnyPublicQuery>(
  ref: Query,
  args: ArgsOrSkip<Query>
) => Result<Query>;

/**
 * `useQuery` for queries that take the ticking `now` from `useNow`. Each tick
 * opens a new subscription that reads as Loading until the server answers;
 * this keeps returning the last Success for the same args (ignoring `now`)
 * meanwhile, so pages neither flash skeletons nor remount forms and dialogs.
 * The kept Success only bridges consecutive renders with the same args: a
 * skip, a Failure or any other arg change (another membership or Pase token)
 * forgets it, so those read as Loading instead of showing stale data.
 */
export function useStableQuery<Query extends Ref.AnyPublicQuery>(
  ref: Query,
  args: ArgsOrSkip<Query>
): Result<Query> {
  const result = useConfectQuery(ref, args);
  const identity = identityOf(args);
  const [kept, setKept] = useState<KeptSuccess<Query> | null>(null);

  const isSkipped = args === 'skip';
  const isSameIdentity =
    Predicate.isNotNull(kept) && kept.identity === identity;
  const isKeptResult = isSameIdentity && kept.result === result;
  const nextKept = ((): KeptSuccess<Query> | null => {
    if (QueryResult.isSuccess(result))
      return isKeptResult ? kept : { identity, result };

    const canBridgeLoading =
      QueryResult.isLoading(result) && !isSkipped && isSameIdentity;
    return canBridgeLoading ? kept : null;
  })();

  // Stores the kept Success during render, React's pattern for storing
  // information from previous renders. Confect keeps a Success's identity until
  // its value changes, so this settles after one extra render.
  if (nextKept !== kept) setKept(nextKept);

  const canKeepPrevious =
    QueryResult.isLoading(result) && Predicate.isNotNull(nextKept);

  return canKeepPrevious ? nextKept.result : result;
}

/** The args as a comparable key, with the ticking `now` left out. */
function identityOf(args: unknown) {
  if (!Predicate.isObject(args)) return JSON.stringify(args);

  const { now: _now, ...identity } = args as Record<string, unknown>;
  return JSON.stringify(identity);
}
