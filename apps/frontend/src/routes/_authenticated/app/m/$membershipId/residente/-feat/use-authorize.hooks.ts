import { useState } from 'react';

import { useMutation } from '@confect/react';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';

import refs from '@repo/backend/refs';
import { toast } from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import {
  type CreateAuthorizationPayload,
  type CreateFavoritePayload,
  type FavoriteSummary,
  type SharedAuthorization,
  resolveSharedValidity,
} from './authorize.models';

/**
 * Creates an Autorización for the current Apartamento. Resolves to what the
 * "Pase listo" sheet shows, or `null` after toasting the failure.
 */
export function useCreateAuthorization() {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const create = useMutation(refs.public.authorizations.create);

  return async (
    payload: CreateAuthorizationPayload
  ): Promise<SharedAuthorization | null> => {
    const result = await AppRouteFeat.settleMutation(
      create({
        membershipId: membership.membershipId,
        ...payload,
      })
    );

    if (Result.isFailure(result)) {
      toast.error(VisitPass.describeBackendError(result.failure));
      return null;
    }

    const today = VisitPass.todayIn(membership.residentialUnitTimeZone);

    return {
      ...resolveSharedValidity(payload, today),
      eventName: payload.eventName,
      passes: result.success.passes,
    };
  };
}

/**
 * One tap: a Temporal Autorización for today with the Favorito's data, handed
 * to `onShared` for the share sheet. `pendingFavoriteId` disables its button.
 */
export function useAuthorizeFavorite(
  onShared: (shared: SharedAuthorization) => void
) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const createAuthorization = useCreateAuthorization();
  const [pendingFavoriteId, setPendingFavoriteId] = useState<
    FavoriteSummary['_id'] | null
  >(null);

  const authorize = async (favorite: FavoriteSummary) => {
    setPendingFavoriteId(favorite._id);
    const shared = await createAuthorization({
      type: 'temporary',
      startDate: VisitPass.todayIn(membership.residentialUnitTimeZone),
      visitors: [
        {
          name: favorite.visitorName,
          document: favorite.visitorDocument,
          favoriteId: favorite._id,
        },
      ],
    });
    setPendingFavoriteId(null);

    if (Predicate.isNotNull(shared)) onShared(shared);
  };

  return { authorize, pendingFavoriteId };
}

/** Saves a Favorito; resolves to its id, or `null` after toasting the failure. */
export function useCreateFavorite() {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const createFavorite = useMutation(refs.public.authorizations.createFavorite);

  return async (favorite: CreateFavoritePayload) => {
    const result = await AppRouteFeat.settleMutation(
      createFavorite({
        membershipId: membership.membershipId,
        ...favorite,
      })
    );

    if (Result.isFailure(result)) {
      toast.error(VisitPass.describeBackendError(result.failure));
      return null;
    }

    return result.success;
  };
}
