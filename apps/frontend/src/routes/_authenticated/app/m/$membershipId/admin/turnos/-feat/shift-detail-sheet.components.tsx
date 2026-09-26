import { useState } from 'react';

import { useMutation, useQuery } from '@confect/react';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';
import { ClipboardList, FileDown, Send } from 'lucide-react';

import refs from '@repo/backend/refs';
import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  toast,
  useIsMobile,
} from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';
import * as AdminRouteFeat from '#routes/_authenticated/app/m/$membershipId/admin/-feat';

/** A Turno's times as one line: real ones when marked, else the planned ones. */
export function describeShiftWindow(
  shift: VisitPass.ShiftSummary,
  timeZone: string
) {
  const start = shift.startedAt ?? shift.plannedStart;
  const end = shift.endedAt ?? shift.plannedEnd;

  if (Predicate.isUndefined(start)) return 'Sin horario';

  const startLabel = VisitPass.formatDateTime(start, timeZone);

  return Predicate.isUndefined(end)
    ? `Desde ${startLabel}`
    : `${startLabel} – ${VisitPass.formatDateTime(end, timeZone)}`;
}

/**
 * One Turno in detail: its Visitas and its Reportes de turno, which the
 * Administrador can generate for download or send by email.
 */
export function ShiftDetailSheet({
  shift,
  onClose,
}: {
  shift: VisitPass.ShiftSummary | null;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();

  return (
    <Sheet
      open={Predicate.isNotNull(shift)}
      onOpenChange={(open) => (open ? undefined : onClose())}
    >
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="gap-0 data-[side=bottom]:max-h-[calc(100dvh-2.5rem)] data-[side=bottom]:rounded-t-2xl data-[side=right]:sm:max-w-xl"
      >
        {shift ? <ShiftDetail shift={shift} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function ShiftDetail({ shift }: { shift: VisitPass.ShiftSummary }) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const timeZone = membership.residentialUnitTimeZone;
  const now = VisitPass.useNow();
  const hasStarted = shift.status !== 'scheduled';

  return (
    <>
      <SheetHeader className="shrink-0 border-b pr-14">
        <SheetTitle className="flex flex-wrap items-center gap-2 text-lg">
          Turno de {shift.porterName}
          <Badge variant={shift.status === 'open' ? 'success' : 'secondary'}>
            {AdminRouteFeat.SHIFT_STATUS_LABELS[shift.status]}
          </Badge>
        </SheetTitle>
        <SheetDescription>
          {describeShiftWindow(shift, timeZone)}
          {Predicate.isNotUndefined(shift.startedAt)
            ? ` · ${VisitPass.formatDuration((shift.endedAt ?? now) - shift.startedAt)}`
            : null}
          {shift.closedByAdministrator ? ' · Cerrado por administración' : null}
        </SheetDescription>
      </SheetHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {hasStarted ? (
          <ShiftReportsSection shift={shift} />
        ) : (
          <p className="rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
            Este Turno aún no empieza. Cuando el Portero lo inicie, aquí verás
            sus Visitas y podrás generar el Reporte de turno.
          </p>
        )}
        {hasStarted ? <ShiftVisitsSection shift={shift} now={now} /> : null}
      </div>
    </>
  );
}

function ShiftReportsSection({ shift }: { shift: VisitPass.ShiftSummary }) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const requestReport = useMutation(refs.public.shiftReports.request);
  const reports = useQuery(refs.public.shiftReports.listForShift, {
    membershipId: membership.membershipId,
    shiftId: shift._id,
  });
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequest = async (sendEmail: boolean) => {
    setIsRequesting(true);
    const result = await requestReport({
      membershipId: membership.membershipId,
      shiftId: shift._id,
      sendEmail,
    });
    setIsRequesting(false);

    if (Result.isFailure(result)) {
      toast.error(VisitPass.describeBackendError(result.failure));
      return;
    }

    toast.success(
      sendEmail
        ? 'Generando el Reporte de turno para enviarlo por correo.'
        : 'Generando el Reporte de turno. Podrás descargarlo en unos segundos.'
    );
  };

  return (
    <section
      aria-labelledby="shift-reports-title"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h3 id="shift-reports-title" className="font-semibold">
          Reporte de turno
        </h3>
        <p className="text-sm text-muted-foreground">
          Un Excel con las Visitas del Turno. El correo llega a los
          Administradores activos de la unidad.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          variant="outline"
          disabled={isRequesting}
          onClick={() => void handleRequest(false)}
        >
          <FileDown aria-hidden="true" />
          Generar para descargar
        </Button>
        <Button
          disabled={isRequesting}
          onClick={() => void handleRequest(true)}
        >
          <Send aria-hidden="true" />
          Enviar por correo
        </Button>
      </div>
      <AdminRouteFeat.QueryView
        result={reports}
        loading={<Skeleton className="h-16" />}
      >
        {(value) =>
          value.length === 0 ? null : (
            <div className="flex flex-col gap-2">
              {value.map((report) => (
                <AdminRouteFeat.ShiftReportItem
                  key={report._id}
                  report={report}
                  timeZone={membership.residentialUnitTimeZone}
                  showPorter={false}
                />
              ))}
            </div>
          )
        }
      </AdminRouteFeat.QueryView>
    </section>
  );
}

function ShiftVisitsSection({
  shift,
  now,
}: {
  shift: VisitPass.ShiftSummary;
  now: number;
}) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const visits = useQuery(refs.public.visits.listForShift, {
    membershipId: membership.membershipId,
    shiftId: shift._id,
  });

  return (
    <section
      aria-labelledby="shift-visits-title"
      className="flex flex-col gap-3"
    >
      <h3 id="shift-visits-title" className="font-semibold">
        Visitas del Turno
      </h3>
      <AdminRouteFeat.QueryView
        result={visits}
        loading={
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        }
      >
        {(value) =>
          value.length === 0 ? (
            <VisitPass.EmptyState
              icon={ClipboardList}
              title="Sin Visitas en este Turno"
            />
          ) : (
            <div className="-mx-4">
              <AdminRouteFeat.VisitList
                visits={value}
                timeZone={membership.residentialUnitTimeZone}
                now={now}
                layout="cards"
              />
            </div>
          )
        }
      </AdminRouteFeat.QueryView>
    </section>
  );
}
