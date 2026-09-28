import { useState } from 'react';

import { QueryResult, useQuery } from '@confect/react';
import { Link, createFileRoute } from '@tanstack/react-router';
import * as Predicate from 'effect/Predicate';
import { DoorOpen, History, ScanLine, SearchX, UserPlus } from 'lucide-react';

import refs from '@repo/backend/refs';
import { Skeleton } from '@repo/ui';

import * as CommonUI from '#modules/common-ui';
import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import * as PorteriaRouteFeat from './-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/porteria/'
)({
  component: PorteriaHomePage,
});

function PorteriaHomePage() {
  const { membershipId, residentialUnitName, residentialUnitTimeZone } =
    MembershipRouteFeat.useCurrentMembership();
  const shiftState = PorteriaRouteFeat.usePorterShiftState();
  const now = VisitPass.useNow();
  const recentVisits = useQuery(refs.public.visits.listRecentForUnit, {
    membershipId,
  });
  const [searchText, setSearchText] = useState('');
  const [visitToVoid, setVisitToVoid] = useState<VisitPass.VisitSummary | null>(
    null
  );
  const isSearching = searchText.trim().length > 0;

  return (
    <>
      <VisitPass.PageHeader eyebrow={residentialUnitName} title="Portería" />

      <PorteriaRouteFeat.VisitSearchField
        text={searchText}
        onTextChange={setSearchText}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <aside className="order-first flex flex-col gap-4 lg:order-last">
          {Predicate.isNull(shiftState) ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : (
            <PorteriaRouteFeat.ShiftPanel state={shiftState} />
          )}
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          <Link
            to="/app/m/$membershipId/porteria/escanear"
            params={{ membershipId }}
            className="group flex flex-col items-center gap-4 rounded-3xl bg-primary px-6 py-9 text-center text-primary-foreground shadow-lg shadow-primary/25 transition-transform outline-none hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/60 active:scale-[0.99]"
          >
            <span className="grid size-24 place-items-center rounded-full bg-white text-primary shadow-md transition-transform group-hover:scale-105">
              <ScanLine className="size-11" aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-2xl font-bold tracking-tight sm:text-3xl">
                Escanear Visitante
              </span>
              <span className="text-base opacity-90">
                Pulsa para abrir la cámara
              </span>
            </span>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <CommonUI.NavLinkButton
              to="/app/m/$membershipId/porteria/registro"
              params={{ membershipId }}
              variant="outline"
              className="h-auto min-h-14 flex-col gap-1.5 rounded-xl py-3 text-sm font-semibold sm:flex-row sm:gap-2 sm:text-base"
            >
              <UserPlus className="size-5 text-primary" aria-hidden="true" />
              Registro manual
            </CommonUI.NavLinkButton>
            <CommonUI.NavLinkButton
              to="/app/m/$membershipId/porteria/dentro"
              params={{ membershipId }}
              variant="outline"
              className="h-auto min-h-14 flex-col gap-1.5 rounded-xl py-3 text-sm font-semibold sm:flex-row sm:gap-2 sm:text-base"
            >
              <DoorOpen className="size-5 text-primary" aria-hidden="true" />
              Visitantes dentro
            </CommonUI.NavLinkButton>
          </div>

          <section
            className="flex flex-col gap-3"
            aria-labelledby="recent-entries"
          >
            <h2 id="recent-entries" className="text-xl font-semibold">
              {isSearching ? 'Resultados de la búsqueda' : 'Ingresos recientes'}
            </h2>
            {QueryResult.isSuccess(recentVisits) ? (
              <RecentVisitList
                visits={PorteriaRouteFeat.filterVisitsBySearch(
                  recentVisits.value,
                  searchText
                )}
                isSearching={isSearching}
                timeZone={residentialUnitTimeZone}
                now={now}
                onVoid={setVisitToVoid}
              />
            ) : QueryResult.isFailure(recentVisits) ? (
              <p className="text-sm text-destructive">
                {VisitPass.describeBackendError(recentVisits.error)}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-18 w-full rounded-xl" />
                <Skeleton className="h-18 w-full rounded-xl" />
                <Skeleton className="h-18 w-full rounded-xl" />
              </div>
            )}
          </section>
        </div>
      </div>

      <PorteriaRouteFeat.VoidVisitSheet
        visit={visitToVoid}
        onClose={() => setVisitToVoid(null)}
      />
    </>
  );
}

function RecentVisitList({
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
        description="Ninguna Visita reciente coincide con ese nombre o placa."
      />
    ) : (
      <VisitPass.EmptyState
        icon={History}
        title="Aún no hay Ingresos"
        description="Los Ingresos que registres aparecerán aquí."
      />
    );

  return (
    <ul className="flex flex-col gap-2">
      {visits.map((visit) => (
        <PorteriaRouteFeat.VisitCard
          key={visit._id}
          visit={visit}
          timeZone={timeZone}
          now={now}
          actions={
            <PorteriaRouteFeat.VisitActionsMenu visit={visit} onVoid={onVoid} />
          }
        />
      ))}
    </ul>
  );
}
