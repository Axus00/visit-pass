import { QueryResult, useQuery } from '@confect/react';
import { History } from 'lucide-react';

import refs from '@repo/backend/refs';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@repo/ui';

import * as CommonUI from '#modules/common-ui';
import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import { VisitRow } from './visit-row.components';

const RECENT_VISITS = 5;

/** Inicio's "Historial reciente": the Apartamento's last Visitas. */
export function RecentVisitsCard() {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const timeZone = membership.residentialUnitTimeZone;
  const visits = useQuery(refs.public.visits.listForApartment, {
    membershipId: membership.membershipId,
  });
  const today = VisitPass.todayIn(timeZone, VisitPass.useNow());

  return (
    <Card className="gap-0 pb-2">
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <History className="size-5 text-primary" aria-hidden="true" />
          Historial reciente
        </CardTitle>
        <CardDescription>
          Visitas del Apartamento {membership.apartmentLabel ?? ''}
        </CardDescription>
        <CardAction>
          <CommonUI.NavLinkButton
            to="/app/m/$membershipId/residente/historial"
            params={{ membershipId: membership.membershipId }}
            variant="link"
            size="sm"
          >
            Ver historial
          </CommonUI.NavLinkButton>
        </CardAction>
      </CardHeader>
      {QueryResult.isSuccess(visits) ? (
        visits.value.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            Aún no hay Visitas registradas para tu Apartamento.
          </p>
        ) : (
          <ul className="divide-y">
            {visits.value.slice(0, RECENT_VISITS).map((visit) => (
              <VisitRow
                key={visit._id}
                visit={visit}
                today={today}
                timeZone={timeZone}
                withDay
              />
            ))}
          </ul>
        )
      ) : (
        <div className="flex flex-col gap-2 px-6 py-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}
    </Card>
  );
}
