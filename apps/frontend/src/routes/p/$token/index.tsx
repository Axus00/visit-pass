import { QueryResult, useQuery } from '@confect/react';
import { createFileRoute } from '@tanstack/react-router';
import * as Predicate from 'effect/Predicate';

import refs from '@repo/backend/refs';

import * as PassRouteFeat from '#routes/p/$token/-feat';

export const Route = createFileRoute('/p/$token/')({
  component: PublicPassPage,
});

/** The page a Pase's QR and shared link open, with no session. */
function PublicPassPage() {
  const { token } = Route.useParams();
  const pass = useQuery(refs.public.authorizations.getPublicPass, { token });

  PassRouteFeat.usePrivatePageHead();

  if (!QueryResult.isSuccess(pass))
    return (
      <PassRouteFeat.PublicPassFrame>
        <PassRouteFeat.PublicPassSkeleton />
      </PassRouteFeat.PublicPassFrame>
    );

  if (Predicate.isNull(pass.value))
    return (
      <PassRouteFeat.PublicPassFrame>
        <PassRouteFeat.PassNotFound />
      </PassRouteFeat.PublicPassFrame>
    );

  return (
    <PassRouteFeat.PublicPassFrame>
      <PassRouteFeat.PublicPassTicket pass={pass.value} />
    </PassRouteFeat.PublicPassFrame>
  );
}
