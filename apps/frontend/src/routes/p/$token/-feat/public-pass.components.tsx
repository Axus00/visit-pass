import { type ReactNode, useEffect, useRef } from 'react';

import * as Predicate from 'effect/Predicate';
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock,
  IdCard,
  ImageDown,
  RefreshCw,
  SearchX,
  ShieldCheck,
  TicketCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

import * as VisitsShared from '@repo/backend/shared/visits';
import { Badge, Button, Skeleton, cn, toast, tw } from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';

import { savePassImage } from './pass-image.utils';
import {
  type PublicPass,
  type PublicPassState,
  derivePublicPassState,
  formatBannerDay,
  formatWeekdays,
} from './public-pass.utils';

/**
 * Keeps the Pase page out of search engines and stops its token from leaking
 * through the Referer header, while the page is mounted.
 */
export function usePrivatePageHead() {
  useEffect(() => {
    const previousTitle = document.title;
    const metas = [
      ['robots', 'noindex, nofollow'],
      ['referrer', 'no-referrer'],
    ].map(([name = '', content = '']) => {
      const meta = document.createElement('meta');
      meta.name = name;
      meta.content = content;
      document.head.append(meta);
      return meta;
    });
    document.title = 'Pase de visitante · Visit Pass';

    return () => {
      for (const meta of metas) meta.remove();
      document.title = previousTitle;
    };
  }, []);
}

/** Standalone, session-less frame shared by every state of the Pase page. */
export function PublicPassFrame({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh justify-center bg-muted px-4 pt-6 pb-10 text-foreground sm:pt-10">
      <div className="flex w-full max-w-sm flex-col gap-5">
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
          Visit Pass
        </p>
        {children}
      </div>
    </main>
  );
}

const TICKET = tw`overflow-hidden rounded-3xl bg-card shadow-lg ring-1 ring-foreground/10`;

type Banner = {
  icon: LucideIcon;
  title: string;
  description: string;
  className: string;
};

function describeState(state: PublicPassState): Banner {
  if (state.kind === 'valid')
    return {
      icon: CheckCircle2,
      title: 'Vigente hoy',
      description: 'Puedes ingresar hoy durante todo el día.',
      className: tw`bg-success/12 text-success dark:bg-success/18`,
    };
  if (state.kind === 'notYetValid')
    return {
      icon: CalendarClock,
      title: `Válido desde el ${formatBannerDay(state.validFrom)}`,
      description: 'Aún no puedes usar este Pase.',
      className: tw`bg-warning/18 text-warning-foreground dark:bg-warning/20 dark:text-warning`,
    };
  if (state.kind === 'notToday')
    return {
      icon: Clock,
      title: 'Hoy no es un día permitido',
      description: `Próximo día válido: ${formatBannerDay(state.nextDate)}.`,
      className: tw`bg-warning/18 text-warning-foreground dark:bg-warning/20 dark:text-warning`,
    };
  if (state.kind === 'expired')
    return {
      icon: Clock,
      title: 'Vencido',
      description:
        'La fecha de este Pase ya pasó. Pide uno nuevo al Residente.',
      className: tw`bg-destructive/10 text-destructive dark:bg-destructive/20`,
    };
  if (state.kind === 'cancelled')
    return {
      icon: Ban,
      title: 'Cancelado',
      description: 'El Residente canceló esta Autorización.',
      className: tw`bg-destructive/10 text-destructive dark:bg-destructive/20`,
    };
  if (state.kind === 'replaced')
    return {
      icon: RefreshCw,
      title: 'Reemplazado',
      description:
        'Este Pase fue reemplazado; pide el nuevo enlace al Residente.',
      className: tw`bg-destructive/10 text-destructive dark:bg-destructive/20`,
    };

  return {
    icon: TicketCheck,
    title: 'Usado',
    description: 'Este Pase ya se usó para ingresar.',
    className: tw`bg-secondary text-secondary-foreground`,
  };
}

/** The Pase as a boarding-pass style ticket with its QR and state for today. */
export function PublicPassTicket({ pass }: { pass: PublicPass }) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const now = VisitPass.useNow();
  const today = VisitPass.todayIn(pass.residentialUnitTimeZone, now);
  const state = derivePublicPassState(pass, today);
  const banner = describeState(state);
  const BannerIcon = banner.icon;
  const isUsableSoon =
    state.kind === 'valid' ||
    state.kind === 'notYetValid' ||
    state.kind === 'notToday';
  const url = `${window.location.origin}/p/${encodeURIComponent(pass.token)}`;
  const isService = pass.type === 'service';
  const validityLabel = isService
    ? `${VisitPass.formatLocalDateRange(pass.startDate, pass.endDate)} · ${formatWeekdays(pass.weekdays)}`
    : VisitPass.formatLocalDate(pass.startDate);

  const handleSaveImage = async () => {
    const qrCanvas = qrCanvasRef.current;
    if (Predicate.isNull(qrCanvas)) return;

    const outcome = await savePassImage({
      qrCanvas,
      residentialUnitName: pass.residentialUnitName,
      visitorName: pass.visitorName,
      validityLabel,
    });

    if (outcome === 'downloaded') toast.success('Imagen del Pase descargada');
  };

  return (
    <>
      <article className={TICKET} aria-label={`Pase de ${pass.visitorName}`}>
        <header className="flex flex-col gap-1 bg-navy px-6 pt-5 pb-6 text-navy-foreground">
          <p className="text-xs font-semibold tracking-[0.12em] uppercase opacity-75">
            Pase de visitante
          </p>
          <h1 className="text-xl leading-tight font-bold">
            {pass.residentialUnitName}
          </h1>
          <p className="text-sm opacity-80">
            Apartamento {pass.apartmentLabel}
          </p>
        </header>

        <div
          role="status"
          className={cn('flex items-start gap-3 px-6 py-3', banner.className)}
        >
          <BannerIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="flex flex-col">
            <p className="font-semibold">{banner.title}</p>
            <p className="text-sm opacity-90">{banner.description}</p>
          </div>
        </div>

        <div className="flex justify-center px-8 pt-6 pb-4">
          <div
            className={cn(
              'relative w-full max-w-64 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-foreground/10',
              !isUsableSoon && 'opacity-40 grayscale'
            )}
          >
            <QRCodeCanvas
              ref={qrCanvasRef}
              value={url}
              size={512}
              level="M"
              marginSize={2}
              title={`Código QR del Pase de ${pass.visitorName}`}
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
        </div>

        {/* Ticket perforation: notches in the page color and a dashed tear line. */}
        <div aria-hidden="true" className="relative h-6">
          <span className="absolute top-0 -left-3 size-6 rounded-full bg-muted" />
          <span className="absolute top-3 right-5 left-5 border-t-2 border-dashed border-border" />
          <span className="absolute top-0 -right-3 size-6 rounded-full bg-muted" />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-6 pt-2 pb-6">
          <div className="col-span-2 flex flex-col gap-0.5">
            <dt className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Visitante
            </dt>
            <dd className="text-lg leading-tight font-semibold">
              {pass.visitorName}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Tipo
            </dt>
            <dd>
              <Badge variant="secondary">
                {VisitPass.VISIT_TYPE_LABELS[pass.type]}
              </Badge>
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {isService ? 'Fechas' : 'Fecha'}
            </dt>
            <dd className="text-sm font-medium">
              {VisitPass.formatLocalDateRange(pass.startDate, pass.endDate)}
            </dd>
          </div>
          {isService ? (
            <div className="col-span-2 flex flex-col gap-0.5">
              <dt className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Días permitidos
              </dt>
              <dd className="text-sm font-medium">
                {formatWeekdays(pass.weekdays)}
              </dd>
            </div>
          ) : null}
          {pass.eventName ? (
            <div className="col-span-2 flex flex-col gap-0.5">
              <dt className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Evento
              </dt>
              <dd className="text-sm font-medium">{pass.eventName}</dd>
            </div>
          ) : null}
        </dl>

        <div className="flex flex-col gap-3 px-6 pb-6">
          <p className="flex items-start gap-3 rounded-xl bg-muted px-4 py-3 text-sm">
            <IdCard
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            Muestra este código en portería junto con tu documento de identidad.
          </p>
          {isUsableSoon ? (
            <Button
              variant="outline"
              size="lg"
              onClick={() => void handleSaveImage()}
            >
              <ImageDown data-icon="inline-start" />
              Guardar imagen
            </Button>
          ) : null}
        </div>
      </article>

      <PrivacyNotice residentialUnitName={pass.residentialUnitName} />
    </>
  );
}

function PrivacyNotice({
  residentialUnitName,
}: {
  residentialUnitName: string;
}) {
  return (
    <details className="group rounded-2xl bg-card px-5 py-4 text-sm ring-1 ring-foreground/10">
      <summary className="cursor-pointer font-medium select-none">
        Aviso de privacidad
      </summary>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        {VisitsShared.privacyNoticeText(residentialUnitName)}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Versión {VisitsShared.PRIVACY_NOTICE_VERSION}
      </p>
    </details>
  );
}

export function PublicPassSkeleton() {
  return (
    <div className={cn(TICKET, 'flex flex-col')} aria-busy="true">
      <span className="sr-only">Cargando Pase</span>
      <div className="flex flex-col gap-2 bg-navy px-6 pt-5 pb-6">
        <Skeleton className="h-3 w-28 bg-white/15" />
        <Skeleton className="h-6 w-48 bg-white/15" />
        <Skeleton className="h-4 w-32 bg-white/15" />
      </div>
      <Skeleton className="mx-6 mt-4 h-12 rounded-xl" />
      <div className="flex justify-center px-8 py-6">
        <Skeleton className="aspect-square w-full max-w-64 rounded-2xl" />
      </div>
      <div className="flex flex-col gap-3 px-6 pb-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function PassNotFound() {
  return (
    <div className={cn(TICKET, 'flex flex-col items-center gap-4 px-6 py-10')}>
      <span className="grid size-14 place-items-center rounded-full bg-secondary text-primary">
        <SearchX className="size-7" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-xl font-semibold">Pase no encontrado</h1>
        <p className="text-sm text-muted-foreground">
          El enlace puede estar incompleto o el Residente generó un Pase nuevo.
          Pídele que te lo envíe otra vez.
        </p>
      </div>
    </div>
  );
}
