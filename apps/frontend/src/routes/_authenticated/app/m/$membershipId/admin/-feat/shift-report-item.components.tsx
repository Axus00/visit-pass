import * as Predicate from 'effect/Predicate';
import {
  CircleAlert,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Mail,
} from 'lucide-react';

import { Badge, cn, tw } from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import { SHIFT_REPORT_EMAIL_LABELS } from './admin.models';

const EMAIL_TONES = {
  notRequested: tw`text-muted-foreground`,
  pending: tw`text-muted-foreground`,
  sent: tw`text-success`,
  failed: tw`text-destructive`,
  notConfigured: tw`text-warning`,
} as const satisfies Record<
  VisitPass.ShiftReportSummary['emailStatus'],
  string
>;

/** What the badge says while there is no file to download. */
const UNAVAILABLE_LABELS = {
  generating: 'En proceso',
  ready: 'Sin archivo',
  failed: 'Falló',
} as const satisfies Record<VisitPass.ShiftReportSummary['status'], string>;

/** One Reporte de turno: its file, download link and email delivery. */
export function ShiftReportItem({
  report,
  timeZone,
  showPorter = true,
}: {
  report: VisitPass.ShiftReportSummary;
  timeZone: string;
  showPorter?: boolean;
}) {
  const canDownload =
    report.status === 'ready' && Predicate.isNotNull(report.downloadUrl);
  const wasEmailRequested = report.emailStatus !== 'notRequested';

  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card px-3 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-success/12 text-success dark:bg-success/18">
        <FileSpreadsheet className="size-5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-medium" title={report.fileName}>
          {report.fileName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {showPorter ? `${report.porterName} · ` : null}
          {VisitPass.formatDateTime(report._creationTime, timeZone)}
        </p>
        {report.status === 'generating' ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <LoaderCircle
              className="size-3.5 animate-spin"
              aria-hidden="true"
            />
            Generando el archivo…
          </p>
        ) : null}
        {report.status === 'failed' ? (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <CircleAlert className="size-3.5" aria-hidden="true" />
            No se pudo generar el archivo
            {Predicate.isUndefined(report.failureMessage)
              ? '.'
              : `: ${report.failureMessage}`}
          </p>
        ) : null}
        {wasEmailRequested ? (
          <p
            className={cn(
              'flex items-start gap-1.5 text-xs',
              EMAIL_TONES[report.emailStatus]
            )}
          >
            <Mail className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              {SHIFT_REPORT_EMAIL_LABELS[report.emailStatus]}
              {report.recipients.length > 0 ? (
                <span className="block truncate text-muted-foreground">
                  Para: {report.recipients.join(', ')}
                </span>
              ) : null}
            </span>
          </p>
        ) : null}
      </div>
      {canDownload ? (
        <MembershipRouteFeat.DownloadFileButton
          url={report.downloadUrl}
          fileName={report.fileName}
          variant="outline"
          size="sm"
          aria-label={`Descargar ${report.fileName}`}
        >
          <Download aria-hidden="true" />
          <span className="hidden sm:inline">Descargar</span>
        </MembershipRouteFeat.DownloadFileButton>
      ) : (
        <Badge
          variant={report.status === 'failed' ? 'destructive' : 'secondary'}
        >
          {UNAVAILABLE_LABELS[report.status]}
        </Badge>
      )}
    </div>
  );
}
