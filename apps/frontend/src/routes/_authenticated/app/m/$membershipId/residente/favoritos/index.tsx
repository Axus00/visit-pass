import { useState } from 'react';

import { QueryResult, useQuery } from '@confect/react';
import { createFileRoute } from '@tanstack/react-router';
import { Star, UserPlus } from 'lucide-react';

import refs from '@repo/backend/refs';
import { Button, Skeleton } from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';
import * as ResidenteRouteFeat from '#routes/_authenticated/app/m/$membershipId/residente/-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/residente/favoritos/'
)({
  component: ResidenteFavoritosPage,
});

function ResidenteFavoritosPage() {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const favorites = useQuery(refs.public.authorizations.listFavorites, {
    membershipId: membership.membershipId,
  });
  const share = ResidenteRouteFeat.usePassShare();
  const { authorize, pendingFavoriteId } =
    ResidenteRouteFeat.useAuthorizeFavorite(share.show);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const addButton = (
    <Button onClick={() => setIsAddOpen(true)}>
      <UserPlus data-icon="inline-start" />
      Agregar Favorito
    </Button>
  );

  return (
    <>
      <VisitPass.PageHeader
        eyebrow={membership.apartmentLabel}
        title="Favoritos"
        description="Tus Visitantes frecuentes. Autorízalos para hoy con un toque."
        actions={addButton}
      />

      {QueryResult.isSuccess(favorites) ? (
        favorites.value.length === 0 ? (
          <VisitPass.EmptyState
            icon={Star}
            title="Aún no tienes Favoritos"
            description="Guarda a familiares, amigos o personal de servicio para autorizarlos sin volver a escribir sus datos."
            action={addButton}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {favorites.value.map((favorite) => (
              <ResidenteRouteFeat.FavoriteCard
                key={favorite._id}
                favorite={favorite}
                isAuthorizing={pendingFavoriteId === favorite._id}
                onAuthorize={() => void authorize(favorite)}
              />
            ))}
          </div>
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      )}

      <ResidenteRouteFeat.AddFavoriteDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
      />
      <ResidenteRouteFeat.PassShareSheet {...share.sheetProps} />
    </>
  );
}
