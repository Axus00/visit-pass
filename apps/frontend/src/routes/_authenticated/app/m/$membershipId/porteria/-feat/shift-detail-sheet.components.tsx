import { useState } from 'react';

import { QueryResult, useMutation, useQuery } from '@confect/react';
import * as Match from 'effect/Match';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';
import {
  Download,
  FileDown,
  FileSpreadsheet,
  LoaderCircle,
  Mail,
  TriangleAlert,
  Users,
} from 'lucide-react';

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
  cn,
  toast,
  useIsMobile,
} from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import { describeShiftWindow, shiftElapsedMillis } from './shift-format.utils';
import { VisitCard } from './visit-list.components';

/**
 * A Turno's Visitas and its Reportes de turno: generate the Excel to download
 * from the list, or send it to the Administrador. Open it by passing the Turno; `null` closes it.
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
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="max-h-[92dvh] rounded-t-2xl data-[side=right]:w-full data-[side=right]:sm:max-w-lg md:rounded-none"
      >
        {Predicate.isNull(shift) ? null : (
          <ShiftDetail key={shift._id} shift={shift} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ShiftDetail({ shift }: { shift: VisitPass.ShiftSummary }) {
  const { membershipId, residentialUnitTimeZone } =
    MembershipRouteFeat.useCurrentMembership();
  const now = VisitPass.useNow();
  const visits = useQuery(refs.public.visits.listForShift, {
    membershipId,
    shiftId: shift._id,
  });
  const isOpen = shift.status === 'open';

  return (
    <>
      <SheetHeader className="pr-12">
        <SheetTitle className="text-lg font-semibold">
          {isOpen ? 'Turno en curso' : 'Turno'}
        </SheetTitle>
        <SheetDescription>
          {describeShiftWindow(shift, residentialUnitTimeZone)}
          {' · '}
          {VisitPass.formatDuration(shiftElapsedMillis(shift, now))}
        </SheetDescription>
        {shift.closedByAdministrator ? (
          <Badge variant="warning">Cerrado por administración</Badge>
        ) : null}
      </SheetHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6">
        <ShiftReportsSection shift={shift} />
        <section className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <Users
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            Visitas del turno
            {QueryResult.isSuccess(visits) ? (
              <span className="text-muted-foreground">
                ({visits.value.length})
              </span>
            ) : null}
          </h3>
          {QueryResult.isSuccess(visits) ? (
            visits.value.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No se registraron Visitas en este Turno.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {visits.value.map((visit) => (
                  <VisitCard
                    key={visit._id}
                    visit={visit}
                    timeZone={residentialUnitTimeZone}
                    now={now}
                    meta={
                      <>
                        {VisitPass.formatTime(
                          visit.enteredAt,
                          residentialUnitTimeZone
                        )}
                        {Predicate.isNotUndefined(visit.exitedAt)
                          ? ` – ${VisitPass.formatTime(visit.exitedAt, residentialUnitTimeZone)}`
                          : ' · dentro'}
                      </>
                    }
                  />
                ))}
              </ul>
            )
          ) : QueryResult.isFailure(visits) ? (
            <p className="text-sm text-destructive">
              {VisitPass.describeBackendError(visits.error)}
            </p>
          ) : (
            <Skeleton className="h-20 w-full" />
          )}
        </section>
      </div>
    </>
  );
}

function ShiftReportsSection({ shift }: { shift: VisitPass.ShiftSummary }) {
  const { membershipId, residentialUnitTimeZone } =
    MembershipRouteFeat.useCurrentMembership();
  const requestReport = useMutation(refs.public.shiftReports.request);
  const reports = useQuery(refs.public.shiftReports.listForShift, {
    membershipId,
    shiftId: shift._id,
  });
  const hasReports = QueryResult.isSuccess(reports) && reports.value.length > 0;
  const [pendingRequest, setPendingRequest] = useState<
    'download' | 'email' | null
  >(null);

  const request = async (sendEmail: boolean) => {
    setPendingRequest(sendEmail ? 'email' : 'download');
    const result = await AppRouteFeat.settleMutation(
      requestReport({ membershipId, shiftId: shift._id, sendEmail })
    );
    setPendingRequest(null);

    if (Result.isFailure(result)) {
      toast.error(VisitPass.describeBackendError(result.failure));
      return;
    }

    toast.success(
      sendEmail
        ? 'Generando el Reporte de turno para enviarlo al Administrador…'
        : 'Generando el Reporte de turno…'
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 font-semibold">
        <FileSpreadsheet
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
        Reporte de turno
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          variant="outline"
          className="h-12 text-base"
          disabled={Predicate.isNotNull(pendingRequest)}
          onClick={() => void request(false)}
        >
          <FileDown data-icon="inline-start" />
          Generar Excel
        </Button>
        <Button
          className="h-12 text-base"
          disabled={Predicate.isNotNull(pendingRequest)}
          onClick={() => void request(true)}
        >
          <Mail data-icon="inline-start" />
          Enviar al Administrador
        </Button>
      </div>
      {hasReports ? (
        <ul className="flex flex-col gap-2">
          {reports.value.map((report) => (
            <ShiftReportRow
              key={report._id}
              report={report}
              timeZone={residentialUnitTimeZone}
            />
          ))}
        </ul>
      ) : null}
      {QueryResult.isFailure(reports) ? (
        <p className="text-sm text-destructive">
          {VisitPass.describeBackendError(reports.error)}
        </p>
      ) : null}
    </section>
  );
}

function ShiftReportRow({
  report,
  timeZone,
}: {
  report: VisitPass.ShiftReportSummary;
  timeZone: string;
}) {
  const emailStatus = Match.value(report.emailStatus).pipe(
    Match.when('notRequested', () => null),
    Match.when('pending', () => 'Enviando…'),
    Match.when('sent', () =>
      report.recipients.length === 0
        ? 'Enviado al Administrador'
        : `Enviado a ${report.recipients.join(', ')}`
    ),
    Match.when('failed', () => 'No se pudo enviar'),
    Match.when(
      'notConfigured',
      () => 'Correo no configurado en este entorno — descarga el archivo'
    ),
    Match.exhaustive
  );
  const isEmailProblem =
    report.emailStatus === 'failed' || report.emailStatus === 'notConfigured';
  const isFileMissing =
    report.status === 'ready' && Predicate.isNull(report.downloadUrl);

  return (
    <li className="flex flex-col gap-2 rounded-xl border px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-medium">{report.fileName}</p>
          <p className="text-xs text-muted-foreground">
            Solicitado{' '}
            {VisitPass.formatDateTime(report._creationTime, timeZone)}
          </p>
        </div>
        {Match.value(report.status).pipe(
          Match.when('generating', () => (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              Generando…
            </span>
          )),
          Match.when('ready', () =>
            Predicate.isNull(report.downloadUrl) ? (
              <Badge variant="secondary">Sin archivo</Badge>
            ) : (
              <MembershipRouteFeat.DownloadFileButton
                url={report.downloadUrl}
                fileName={report.fileName}
                variant="secondary"
                className="h-11 shrink-0"
              >
                <Download data-icon="inline-start" />
                Descargar
              </MembershipRouteFeat.DownloadFileButton>
            )
          ),
          Match.when('failed', () => (
            <Badge variant="destructive">No se pudo generar</Badge>
          )),
          Match.exhaustive
        )}
      </div>
      {isFileMissing ? (
        <p className="text-xs text-muted-foreground">
          El archivo ya no está disponible; usa «Generar Excel» para crearlo de
          nuevo.
        </p>
      ) : null}
      {Predicate.isNull(emailStatus) ? null : (
        <p
          className={cn(
            'flex items-center gap-1.5 text-xs',
            isEmailProblem ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {isEmailProblem ? (
            <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Mail className="size-3.5 shrink-0" aria-hidden="true" />
          )}
          {emailStatus}
        </p>
      )}
    </li>
  );
}
