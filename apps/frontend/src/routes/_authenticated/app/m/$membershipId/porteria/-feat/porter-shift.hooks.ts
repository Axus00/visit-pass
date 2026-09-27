import { useState } from 'react';

import { QueryResult, useMutation, useQuery } from '@confect/react';
import * as Result from 'effect/Result';

import refs from '@repo/backend/refs';
import { toast } from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import type { PorterShiftState } from './porteria.models';

/**
 * The Portero's open Turno, its counters and upcoming planned Turnos; `null`
 * while loading. Every portería page shares this one subscription.
 */
export function usePorterShiftState(): PorterShiftState | null {
  const { membershipId } = MembershipRouteFeat.useCurrentMembership();
  const now = VisitPass.useNow();
  const state = useQuery(refs.public.shifts.getMyState, { membershipId, now });

  return QueryResult.isSuccess(state) ? state.value : null;
}

/** Starts (planned or unplanned) and ends the Portero's Turno with toasts. */
export function useShiftActions() {
  const { membershipId } = MembershipRouteFeat.useCurrentMembership();
  const start = useMutation(refs.public.shifts.start);
  const end = useMutation(refs.public.shifts.end);
  const [isPending, setIsPending] = useState(false);

  const startShift = async (shiftId?: VisitPass.ShiftSummary['_id']) => {
    setIsPending(true);
    const result = await AppRouteFeat.settleMutation(
      start({ membershipId, shiftId })
    );
    setIsPending(false);

    if (Result.isFailure(result)) {
      toast.error(VisitPass.describeBackendError(result.failure));
      return;
    }

    toast.success('Turno iniciado');
  };

  const endShift = async (shiftId: VisitPass.ShiftSummary['_id']) => {
    setIsPending(true);
    const result = await AppRouteFeat.settleMutation(
      end({ membershipId, shiftId })
    );
    setIsPending(false);

    if (Result.isFailure(result)) {
      toast.error(VisitPass.describeBackendError(result.failure));
      return false;
    }

    toast.success('Turno terminado');
    return true;
  };

  return { startShift, endShift, isPending };
}
