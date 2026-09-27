import { useEffect } from 'react';

import { QueryResult, useMutation, useQuery } from '@confect/react';
import * as Predicate from 'effect/Predicate';

import refs from '@repo/backend/refs';

/**
 * The caller's Membresías, after claiming any invitation sent to their email.
 * Every page under `/app` reads access through this hook; each mount claims
 * pending invitations once the Usuario's row exists, and again when a
 * brand-new Usuario's row first appears.
 */
export function useMyAccess() {
  const activatePending = useMutation(refs.public.memberships.activatePending);
  const me = useQuery(refs.public.users.me, {});
  const access = useQuery(refs.public.memberships.listMine, {});
  const userId = QueryResult.isSuccess(me) ? (me.value?._id ?? null) : null;

  useEffect(() => {
    if (Predicate.isNull(userId)) return;

    // Best effort: a failed claim is retried on the next mount.
    void activatePending({}).catch(() => undefined);
  }, [activatePending, userId]);

  return QueryResult.isSuccess(access) ? access.value : null;
}
