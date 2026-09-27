import { useEffect, useMemo, useRef, useState } from 'react';

import { QueryResult, useQuery } from '@confect/react';
import * as Predicate from 'effect/Predicate';
import { Bell } from 'lucide-react';

import refs from '@repo/backend/refs';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  toast,
} from '@repo/ui';

import * as CommonUI from '#modules/common-ui';
import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import { visitorDisplayName } from './visits.utils';

/**
 * Puts the arrivals bell in the top bar while the Residente panel is mounted,
 * one per Membresía. Renders nothing itself.
 */
export function ArrivalsNotifier() {
  const { membershipId } = MembershipRouteFeat.useCurrentMembership();
  const { setTopBarActions } = MembershipRouteFeat.useTopBarActionsSlot();

  // Keyed by Membresía so switching Apartamentos starts a fresh baseline.
  useEffect(() => {
    setTopBarActions(<ArrivalsBell key={membershipId} />);

    return () => setTopBarActions(null);
  }, [membershipId, setTopBarActions]);

  return null;
}

const ARRIVALS_SHOWN = 5;

/**
 * Watches the Apartamento's Visitas and announces each Ingreso newer than the
 * latest one seen when the panel opened; the badge counts the unseen ones.
 */
function ArrivalsBell() {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const timeZone = membership.residentialUnitTimeZone;
  const visits = useQuery(refs.public.visits.listForApartment, {
    membershipId: membership.membershipId,
  });
  const loadedVisits = QueryResult.isSuccess(visits) ? visits.value : null;
  const [baseline, setBaseline] = useState<number | null>(null);
  const [seenUpTo, setSeenUpTo] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const announcedIds = useRef(new Set<string>());

  // Record the baseline on the first load, during render, so the first list is never announced.
  const needsBaseline =
    Predicate.isNull(baseline) && Predicate.isNotNull(loadedVisits);
  if (needsBaseline)
    setBaseline(
      loadedVisits.reduce(
        (newest, visit) => Math.max(newest, visit.enteredAt),
        0
      )
    );

  const arrivals = useMemo(() => {
    const isWaitingForVisits =
      Predicate.isNull(baseline) || Predicate.isNull(loadedVisits);

    // Newest first; a voided Visita is not an arrival.
    return isWaitingForVisits
      ? []
      : loadedVisits
          .filter((visit) => visit.enteredAt > baseline && !visit.voided)
          .sort((a, b) => b.enteredAt - a.enteredAt);
  }, [baseline, loadedVisits]);
  const unseenCount = arrivals.filter(
    (arrival) => arrival.enteredAt > seenUpTo
  ).length;

  useEffect(() => {
    const unannounced = arrivals
      .filter((arrival) => !announcedIds.current.has(arrival._id))
      .reverse();

    for (const arrival of unannounced) {
      announcedIds.current.add(arrival._id);
      toast.success('Llegó tu visitante', {
        description: `${visitorDisplayName(arrival)} ingresó a las ${VisitPass.formatTime(arrival.enteredAt, timeZone)}`,
      });
    }
  }, [arrivals, timeZone]);

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setSeenUpTo(arrivals[0]?.enteredAt ?? 0);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={
              unseenCount > 0
                ? `Llegadas: ${unseenCount} sin ver`
                : 'Llegadas de visitantes'
            }
          />
        }
      >
        <Bell className="size-5" />
        {unseenCount > 0 ? (
          <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[0.65rem] leading-none font-semibold text-white tabular-nums">
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-3">
        <PopoverHeader>
          <PopoverTitle>Llegadas recientes</PopoverTitle>
          <PopoverDescription>
            Ingresos a tu Apartamento desde que abriste la app.
          </PopoverDescription>
        </PopoverHeader>
        {arrivals.length === 0 ? (
          <p className="rounded-lg bg-muted/60 px-3 py-4 text-center text-sm text-muted-foreground">
            Te avisaremos aquí cuando llegue tu visitante.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {arrivals.slice(0, ARRIVALS_SHOWN).map((arrival) => (
              <li
                key={arrival._id}
                className="flex items-center gap-3 rounded-lg px-2 py-2"
              >
                <VisitPass.InitialsAvatar
                  initials={VisitPass.initialsOf(arrival.visitorName)}
                  className="size-8 text-xs"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-sm font-medium">
                    {visitorDisplayName(arrival)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ingresó a las{' '}
                    {VisitPass.formatTime(arrival.enteredAt, timeZone)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <CommonUI.NavLinkButton
          to="/app/m/$membershipId/residente/historial"
          params={{ membershipId: membership.membershipId }}
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(false)}
        >
          Ver historial
        </CommonUI.NavLinkButton>
      </PopoverContent>
    </Popover>
  );
}
