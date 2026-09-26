import { useEffect } from 'react';

import { QueryResult, useMutation, useQuery } from '@confect/react';

import refs from '@repo/backend/refs';

/** Pending invitations only need claiming once per page load. */
let hasActivatedPending = false;

/**
 * The caller's Membresías, after claiming any invitation sent to their email.
 * Every page under `/app` reads access through this hook.
 */
export function useMyAccess() {
  const activatePending = useMutation(refs.public.memberships.activatePending);
  const access = useQuery(refs.public.memberships.listMine, {});

  useEffect(() => {
    if (hasActivatedPending) return;
    hasActivatedPending = true;

    void activatePending({});
  }, [activatePending]);

  return QueryResult.isSuccess(access) ? access.value : null;
}
