import type { ReactNode } from 'react';

import { QueryResult } from '@confect/react';
import { ShieldAlert } from 'lucide-react';

import * as VisitPass from '#modules/visit-pass';

/**
 * Renders a query's value once it arrives, `loading` until then, and the typed
 * backend error (such as a revoked Membresía) in Spanish if it fails.
 */
export function QueryView<A, E>({
  result,
  loading,
  children,
}: {
  result: QueryResult.QueryResult<A, E>;
  loading: ReactNode;
  children: (value: A) => ReactNode;
}) {
  if (QueryResult.isSuccess(result)) return <>{children(result.value)}</>;
  if (QueryResult.isLoading(result)) return <>{loading}</>;

  return (
    <VisitPass.EmptyState
      icon={ShieldAlert}
      title="No pudimos cargar esta información"
      description={VisitPass.describeBackendError(result.error)}
    />
  );
}
