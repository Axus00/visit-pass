import * as Result from 'effect/Result';

/**
 * Folds an unexpected rejection (network, server bug) of a Confect mutation
 * call into its `Result`, so callers handle every failure in one branch and
 * show it with `VisitPass.describeBackendError`.
 */
export function settleMutation<A, E>(
  call: Promise<Result.Result<A, E>>
): Promise<Result.Result<A, unknown>> {
  return call.catch((error: unknown) => Result.fail(error));
}
