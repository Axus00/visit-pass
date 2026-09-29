import { useState } from 'react';

import { QueryResult, useMutation, useQuery } from '@confect/react';
import { createFileRoute } from '@tanstack/react-router';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';
import { DoorOpen, LogOut, SearchX } from 'lucide-react';

import refs from '@repo/backend/refs';
import { Button, Skeleton, toast } from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';
import * as PorteriaRouteFeat from '#routes/_authenticated/app/m/$membershipId/porteria/-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/porteria/dentro/'
)({
  component: PorteriaInsidePage,
});

function PorteriaInsidePage() {
  const { membershipId, residentialUnitTimeZone } =
    MembershipRouteFeat.useCurrentMembership();
  const now = VisitPass.useNow();
  const inside = useQuery(refs.public.visits.listInside, { membershipId });
  const [searchText, setSearchText] = useState('');
  const [visitToVoid, setVisitToVoid] = useState<VisitPass.VisitSummary | null>(
    null
  );
  const insideCount = QueryResult.isSuccess(inside)
    ? inside.value.length
    : null;

  return (
    <>
      <VisitPass.PageHeader
        eyebrow="Portería"
        title="Visitantes dentro"
        description={
          Predicate.isNull(insideCount)
            ? 'Visitas con Ingreso y sin Salida registrada.'
            : `${insideCount} ${insideCount === 1 ? 'Visitante sigue' : 'Visitantes siguen'} dentro de la unidad.`
        }
      />

      <PorteriaRouteFeat.VisitSearchField
        text={searchText}
        onTextChange={setSearchText}
      />

      {QueryResult.isSuccess(inside) ? (
        <InsideVisitList
          visits={PorteriaRouteFeat.filterVisitsBySearch(
            inside.value,
            searchText
          )}
          isSearching={searchText.trim().length > 0}
          timeZone={residentialUnitTimeZone}
          now={now}
          onVoid={setVisitToVoid}
        />
      ) : QueryResult.isFailure(inside) ? (
        <p className="text-sm text-destructive">
          {VisitPass.describeBackendError(inside.error)}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      )}

      <PorteriaRouteFeat.VoidVisitSheet
        visit={visitToVoid}
        onClose={() => setVisitToVoid(null)}
      />
    </>
  );
}

function InsideVisitList({
  visits,
  isSearching,
  timeZone,
  now,
  onVoid,
}: {
  visits: ReadonlyArray<VisitPass.VisitSummary>;
  isSearching: boolean;
  timeZone: string;
  now: number;
  onVoid: (visit: VisitPass.VisitSummary) => void;
}) {
  if (visits.length === 0)
    return isSearching ? (
      <VisitPass.EmptyState
        icon={SearchX}
        title="Sin coincidencias"
        description="Ningún Visitante dentro coincide con ese nombre o placa."
      />
    ) : (
      <VisitPass.EmptyState
        icon={DoorOpen}
        title="No hay Visitantes dentro"
        description="Cuando registres un Ingreso, el Visitante aparecerá aquí hasta su Salida."
      />
    );

  return (
    <ul className="grid grid-cols-1 gap-2 xl:grid-cols-2">
      {visits.map((visit) => (
        <PorteriaRouteFeat.VisitCard
          key={visit._id}
          visit={visit}
          timeZone={timeZone}
          now={now}
          meta={
            <>
              Ingreso {VisitPass.formatTime(visit.enteredAt, timeZone)}
              <span className="block font-medium text-foreground">
                {VisitPass.formatDuration(now - visit.enteredAt)} dentro
              </span>
            </>
          }
          actions={
            <PorteriaRouteFeat.VisitActionsMenu visit={visit} onVoid={onVoid} />
          }
          footer={<RegisterExitButton visit={visit} />}
        />
      ))}
    </ul>
  );
}

function RegisterExitButton({ visit }: { visit: VisitPass.VisitSummary }) {
  const { membershipId } = MembershipRouteFeat.useCurrentMembership();
  const registerExit = useMutation(refs.public.visits.registerExit);
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      variant="outline"
      className="h-12 w-full text-base font-semibold"
      disabled={isPending}
      onClick={async () => {
        setIsPending(true);
        const result = await AppRouteFeat.settleMutation(
          registerExit({ membershipId, visitId: visit._id })
        );

        if (Result.isFailure(result)) {
          setIsPending(false);
          toast.error(VisitPass.describeBackendError(result.failure));
          return;
        }

        toast.success('Salida registrada', { description: visit.visitorName });
      }}
    >
      <LogOut data-icon="inline-start" />
      {isPending ? 'Registrando salida…' : 'Registrar salida'}
    </Button>
  );
}
