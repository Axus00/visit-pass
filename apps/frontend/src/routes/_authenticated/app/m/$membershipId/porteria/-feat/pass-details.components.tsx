import type { ReactNode } from 'react';

import * as Predicate from 'effect/Predicate';

import * as VisitPass from '#modules/visit-pass';

import type { ResolvedPass } from './porteria.models';

/** What the Portero checks against the Visitante in front of them. */
export function PassDetails({
  pass,
  documentSlot,
}: {
  pass: ResolvedPass;
  /** Replaces the document row, e.g. with an input when the Pase has none. */
  documentSlot?: ReactNode;
}) {
  const weekdayLabels = pass.weekdays
    .map((weekday) => VisitPass.WEEKDAY_SHORT_LABELS[weekday])
    .filter(Predicate.isNotUndefined)
    .join(', ');
  const isService = pass.type === 'service';

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      <DetailRow label="Visitante" wide>
        <span className="text-xl font-bold">{pass.visitorName}</span>
      </DetailRow>
      {documentSlot ?? (
        <DetailRow label="Documento">
          {pass.visitorDocument ?? 'Sin documento'}
        </DetailRow>
      )}
      <DetailRow label="Apartamento">
        <span className="font-semibold text-primary">
          {pass.apartmentLabel}
        </span>
      </DetailRow>
      <DetailRow label="Tipo de visita">
        {VisitPass.VISIT_TYPE_LABELS[pass.type]}
        {Predicate.isNotUndefined(pass.eventName)
          ? ` · ${pass.eventName}`
          : null}
      </DetailRow>
      <DetailRow label="Vigencia">
        {VisitPass.formatLocalDateRange(pass.startDate, pass.endDate)}
        {isService && weekdayLabels.length > 0 ? (
          <span className="block text-xs text-muted-foreground">
            {weekdayLabels}
          </span>
        ) : null}
      </DetailRow>
      {pass.entryCount > 0 ? (
        <DetailRow label="Ingresos con este Pase">{pass.entryCount}</DetailRow>
      ) : null}
    </dl>
  );
}

function DetailRow({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-base">{children}</dd>
    </div>
  );
}
