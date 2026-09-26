import { useState } from 'react';

import { QueryResult, useQuery } from '@confect/react';
import { createFileRoute } from '@tanstack/react-router';
import * as Predicate from 'effect/Predicate';
import { CalendarClock, ChevronRight, FileSpreadsheet } from 'lucide-react';

import refs from '@repo/backend/refs';
import { Badge, Button, Skeleton } from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import * as PorteriaRouteFeat from '../-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/porteria/turnos/'
)({
  component: PorteriaShiftsPage,
});

function PorteriaShiftsPage() {
  const { membershipId, residentialUnitTimeZone } =
    MembershipRouteFeat.useCurrentMembership();
  const shiftState = PorteriaRouteFeat.usePorterShiftState();
  const now = VisitPass.useNow();
  const history = useQuery(refs.public.shifts.listMine, { membershipId });
  const [selectedShift, setSelectedShift] =
    useState<VisitPass.ShiftSummary | null>(null);
  const openShift = shiftState?.openShift ?? null;

  return (
    <>
      <VisitPass.PageHeader
        eyebrow="Portería"
        title="Turnos y reportes"
        description="Consulta tus Turnos y descarga o envía su Reporte de turno."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <section className="flex flex-col gap-4" aria-label="Turno actual">
          {Predicate.isNull(shiftState) ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : (
            <PorteriaRouteFeat.ShiftPanel state={shiftState} />
          )}
          {Predicate.isNull(openShift) ? null : (
            <Button
              variant="outline"
              className="h-12 text-base"
              onClick={() => setSelectedShift(openShift)}
            >
              <FileSpreadsheet data-icon="inline-start" />
              Visitas y reporte del Turno en curso
            </Button>
          )}
        </section>

        <section
          className="flex flex-col gap-3"
          aria-labelledby="shift-history"
        >
          <h2 id="shift-history" className="text-xl font-semibold">
            Turnos anteriores
          </h2>
          {QueryResult.isSuccess(history) ? (
            history.value.length === 0 ? (
              <VisitPass.EmptyState
                icon={CalendarClock}
                title="Aún no tienes Turnos cerrados"
                description="Cuando termines un Turno aparecerá aquí con su Reporte de turno."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {history.value.map((shift) => (
                  <li key={shift._id}>
                    <button
                      type="button"
                      onClick={() => setSelectedShift(shift)}
                      className="flex min-h-16 w-full items-center gap-3 rounded-xl bg-card px-4 py-3 text-left shadow-xs ring-1 ring-foreground/10 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                        <CalendarClock className="size-5" aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate font-medium">
                          {PorteriaRouteFeat.describeShiftWindow(
                            shift,
                            residentialUnitTimeZone
                          )}
                        </span>
                        <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {VisitPass.formatDuration(
                            PorteriaRouteFeat.shiftElapsedMillis(shift, now)
                          )}
                          {shift.closedByAdministrator ? (
                            <Badge variant="warning">
                              Cerrado por administración
                            </Badge>
                          ) : null}
                        </span>
                      </span>
                      <ChevronRight
                        className="size-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : QueryResult.isFailure(history) ? (
            <p className="text-sm text-destructive">
              {VisitPass.describeBackendError(history.error)}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          )}
        </section>
      </div>

      <PorteriaRouteFeat.ShiftDetailSheet
        shift={selectedShift}
        onClose={() => setSelectedShift(null)}
      />
    </>
  );
}
