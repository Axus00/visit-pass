import { useState } from 'react';

import { QueryResult, useQuery } from '@confect/react';
import { createFileRoute } from '@tanstack/react-router';
import * as Predicate from 'effect/Predicate';
import { History, SearchX } from 'lucide-react';

import refs from '@repo/backend/refs';
import * as VisitsShared from '@repo/backend/shared/visits';
import { Card, Skeleton } from '@repo/ui';

import * as CommonUI from '#modules/common-ui';
import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';
import * as ResidenteRouteFeat from '#routes/_authenticated/app/m/$membershipId/residente/-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/residente/historial/'
)({
  component: ResidenteHistorialPage,
});

function ResidenteHistorialPage() {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const timeZone = membership.residentialUnitTimeZone;
  const visits = useQuery(refs.public.visits.listForApartment, {
    membershipId: membership.membershipId,
  });
  const today = VisitPass.todayIn(timeZone, VisitPass.useNow());
  const [searchText, setSearchText] = useState('');

  const loadedVisits = QueryResult.isSuccess(visits) ? visits.value : null;
  const matchingVisits =
    loadedVisits?.filter((visit) =>
      ResidenteRouteFeat.matchesVisitSearch(visit, searchText)
    ) ?? [];
  const dayGroups = ResidenteRouteFeat.groupVisitsByDay(
    matchingVisits,
    today,
    timeZone
  );
  const hasNoVisits =
    Predicate.isNotNull(loadedVisits) && loadedVisits.length === 0;
  const isListTruncated =
    Predicate.isNotNull(loadedVisits) &&
    loadedVisits.length >= VisitsShared.APARTMENT_HISTORY_LIMIT;
  const hasNoMatches =
    Predicate.isNotNull(loadedVisits) &&
    !hasNoVisits &&
    matchingVisits.length === 0;

  return (
    <>
      <VisitPass.PageHeader
        eyebrow={membership.apartmentLabel}
        title="Historial de visitas"
        description="Ingresos y Salidas registrados en portería para tu Apartamento."
      />

      <CommonUI.SearchField
        text={searchText}
        onTextChange={setSearchText}
        onClear={() => setSearchText('')}
        placeholder="Buscar por nombre o placa"
        ariaLabel="Buscar Visitas por nombre o placa"
        className="sm:max-w-sm"
      />

      {Predicate.isNull(loadedVisits) ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : null}

      {hasNoVisits ? (
        <VisitPass.EmptyState
          icon={History}
          title="Aún no hay Visitas"
          description="Cuando portería registre el Ingreso de un Visitante a tu Apartamento, aparecerá aquí."
        />
      ) : null}

      {hasNoMatches ? (
        <VisitPass.EmptyState
          icon={SearchX}
          title="Sin resultados"
          description={`Ninguna Visita coincide con “${searchText.trim()}”.`}
        />
      ) : null}

      {dayGroups.map((group) => (
        <section
          key={group.localDate}
          aria-labelledby={`dia-${group.localDate}`}
          className="flex flex-col gap-2"
        >
          <h2
            id={`dia-${group.localDate}`}
            className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
          >
            {group.label} · {group.visits.length}
          </h2>
          <Card className="py-0">
            <ul className="divide-y">
              {group.visits.map((visit) => (
                <ResidenteRouteFeat.VisitRow
                  key={visit._id}
                  visit={visit}
                  today={today}
                  timeZone={timeZone}
                />
              ))}
            </ul>
          </Card>
        </section>
      ))}

      {isListTruncated ? (
        <p className="text-center text-sm text-muted-foreground">
          Mostrando las {VisitsShared.APARTMENT_HISTORY_LIMIT} Visitas más
          recientes.
        </p>
      ) : null}
    </>
  );
}
