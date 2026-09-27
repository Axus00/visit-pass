import { useState } from 'react';

import { QueryResult } from '@confect/react';
import { createFileRoute } from '@tanstack/react-router';
import * as Predicate from 'effect/Predicate';
import { Plus, Ticket } from 'lucide-react';

import refs from '@repo/backend/refs';
import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui';

import * as CommonUI from '#modules/common-ui';
import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';
import * as ResidenteRouteFeat from '#routes/_authenticated/app/m/$membershipId/residente/-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/residente/autorizaciones/'
)({
  component: ResidenteAutorizacionesPage,
});

const EMPTY_TAB_COPY = {
  current: {
    title: 'No tienes Autorizaciones vigentes',
    description: 'Autoriza una visita y comparte el Pase con tu Visitante.',
  },
  past: {
    title: 'Sin Autorizaciones pasadas',
    description: 'Aquí verás las Autorizaciones cuya fecha ya terminó.',
  },
  cancelled: {
    title: 'Sin Autorizaciones canceladas',
    description: 'Las Autorizaciones que canceles aparecerán aquí.',
  },
} as const satisfies Record<
  ResidenteRouteFeat.AuthorizationTab,
  { title: string; description: string }
>;

function ResidenteAutorizacionesPage() {
  const membership = MembershipRouteFeat.useCurrentMembership();
  // The query and the tabs only use the calendar day, so an hourly clock keeps
  // the heavy query from re-running every minute. Its ticks land on hour
  // boundaries, which include local midnight in whole-hour zones like Bogotá.
  const hourlyNow = VisitPass.useNow(3_600_000);
  const authorizations = VisitPass.useStableQuery(
    refs.public.authorizations.listForApartment,
    {
      membershipId: membership.membershipId,
      now: hourlyNow,
    }
  );
  const today = VisitPass.todayIn(
    membership.residentialUnitTimeZone,
    hourlyNow
  );
  const [tab, setTab] =
    useState<ResidenteRouteFeat.AuthorizationTab>('current');
  const share = ResidenteRouteFeat.usePassShare();
  const byTab = QueryResult.isSuccess(authorizations)
    ? ResidenteRouteFeat.groupAuthorizationsByTab(authorizations.value, today)
    : null;

  return (
    <>
      <VisitPass.PageHeader
        eyebrow={membership.apartmentLabel}
        title="Autorizaciones"
        description="Las visitas que autorizaste y sus Pases."
        actions={
          <CommonUI.NavLinkButton
            to="/app/m/$membershipId/residente"
            params={{ membershipId: membership.membershipId }}
            variant="default"
          >
            <Plus data-icon="inline-start" />
            Autorizar visita
          </CommonUI.NavLinkButton>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(next) => {
          const nextTab = ResidenteRouteFeat.AUTHORIZATION_TABS.find(
            (candidate) => candidate === next
          );
          if (Predicate.isNotUndefined(nextTab)) setTab(nextTab);
        }}
      >
        <TabsList className="w-full sm:w-fit">
          {ResidenteRouteFeat.AUTHORIZATION_TABS.map((candidate) => (
            <TabsTrigger key={candidate} value={candidate} className="px-3">
              {ResidenteRouteFeat.AUTHORIZATION_TAB_LABELS[candidate]}
              {Predicate.isNotNull(byTab) ? (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {byTab[candidate].length}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
        {ResidenteRouteFeat.AUTHORIZATION_TABS.map((candidate) => (
          <TabsContent
            key={candidate}
            value={candidate}
            className="mt-4 flex flex-col gap-4"
          >
            {Predicate.isNull(byTab) ? (
              <>
                <Skeleton className="h-44 w-full rounded-xl" />
                <Skeleton className="h-44 w-full rounded-xl" />
              </>
            ) : byTab[candidate].length === 0 ? (
              <VisitPass.EmptyState
                icon={Ticket}
                title={EMPTY_TAB_COPY[candidate].title}
                description={EMPTY_TAB_COPY[candidate].description}
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {byTab[candidate].map((authorization) => (
                  <ResidenteRouteFeat.AuthorizationCard
                    key={authorization._id}
                    authorization={authorization}
                    tab={candidate}
                    onShare={share.show}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <ResidenteRouteFeat.PassShareSheet {...share.sheetProps} />
    </>
  );
}
