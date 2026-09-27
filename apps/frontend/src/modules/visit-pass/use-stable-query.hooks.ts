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
 * Any other arg change, such as another membership or Pase token, still reads
 * as Loading instead of showing the previous identity's data.
 */
export function useStableQuery<Query extends Ref.AnyPublicQuery>(
  ref: Query,
  args: ArgsOrSkip<Query>
): Result<Query> {
  const result = useConfectQuery(ref, args);
  const identity = identityOf(args);
  const [kept, setKept] = useState<KeptSuccess<Query> | null>(null);

  // Remembers each new Success during render, React's pattern for storing
  // information from previous renders. Confect keeps a Success's identity until
  // its value changes, so this settles after one extra render.
  const isNewSuccess =
    QueryResult.isSuccess(result) &&
    (Predicate.isNull(kept) ||
      kept.result !== result ||
      kept.identity !== identity);
  if (isNewSuccess) setKept({ identity, result });

  const canKeepPrevious =
    QueryResult.isLoading(result) &&
    Predicate.isNotNull(kept) &&
    kept.identity === identity;

  return canKeepPrevious ? kept.result : result;
}

/** The args as a comparable key, with the ticking `now` left out. */
function identityOf(args: unknown) {
  if (!Predicate.isObject(args)) return JSON.stringify(args);

  const { now: _now, ...identity } = args as Record<string, unknown>;
  return JSON.stringify(identity);
}
