// PROTOTYPE (#15): three structurally different takes on the public Pase
// page the Visitante opens from WhatsApp (`/p/$token`).
import type { ComponentProps, ReactNode } from 'react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  cn,
  toast,
} from '@repo/ui';

import {
  BAR_TONE,
  ICON_TONE,
  Icon,
  LabelSm,
  PASE_THEME_STYLE,
  PaseQr,
  PaseTheme,
  PrivacyFullText,
  PrivacyNotice,
  QrUnavailable,
  StatusPill,
} from './pase-prototype-shell.components';
import {
  INSTRUCCIONES,
  type Pase,
  type Status,
  TIPO_LABEL,
  type Tone,
  UNIDAD,
} from './pase-prototype.fixtures';

export type PageVariantProps = {
  pase: Pase;
  status: Status;
  saveImage: () => Promise<void>;
};

const copyLink = async (pase: Pase) => {
  await navigator.clipboard.writeText(pase.url);
  toast.success('Enlace copiado');
};

const cuandoCorto = (pase: Pase) =>
  pase.tipo === 'servicio'
    ? `${pase.vigencia} · ${pase.diasPermitidos}`
    : pase.vigencia;

/** A — the "Tu Pase QR" modal from the Residente mockup, as a page. */
export function VariantCard({ pase, status, saveImage }: PageVariantProps) {
  return (
    <PaseTheme>
      <header className="flex h-16 items-center gap-2 border-b border-(--vp-border) bg-(--vp-bg) px-4 shadow-sm">
        <div className="grid size-10 place-items-center rounded-full bg-(--vp-blue) text-white">
          <Icon name="shield_person" fill className="text-[22px]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[18px] leading-6 font-semibold">
            {UNIDAD.nombre}
          </p>
          <p className="text-xs text-(--vp-outline)">Visit Pass</p>
        </div>
      </header>

      <main className="mx-auto max-w-sm space-y-6 px-4 pt-6">
        <section className="overflow-hidden rounded-xl border border-(--vp-border) bg-white shadow-sm">
          <div className="border-b border-(--vp-border) p-6 text-center">
            <StatusPill status={status} className="mb-3" />
            <h1 className="mb-1 text-2xl font-semibold text-black">
              {status.showQr ? 'Tu Pase de visita' : status.title}
            </h1>
            <p className="text-(--vp-muted)">
              {status.showQr ? cuandoCorto(pase) : status.detail}
            </p>
          </div>

          {status.showData && (
            <div className="flex flex-col items-center space-y-6 p-8">
              {status.showQr ? (
                <div className="rounded-xl border-2 border-(--vp-blue) bg-white p-1.5">
                  <PaseQr pase={pase} size={212} />
                </div>
              ) : (
                <QrUnavailable size={224} status={status} />
              )}
              <div className="text-center">
                <p className="text-lg font-semibold">{pase.visitante}</p>
                <p className="text-sm text-(--vp-muted)">{pase.apartamento}</p>
                <p className="mt-1 text-xs font-semibold tracking-[0.05em] text-(--vp-outline) uppercase">
                  {TIPO_LABEL[pase.tipo]}
                  {pase.evento && ' · Invitado a evento'}
                  {' · ID: VP-'}
                  {pase.token.slice(-4).toUpperCase()}
                </p>
              </div>
              {status.showQr && (
                <div className="grid w-full grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => void saveImage()}
                    className="flex h-12 items-center justify-center gap-1 rounded-lg bg-(--vp-blue) text-sm font-medium text-white transition-all active:scale-95"
                  >
                    <Icon name="download" className="text-[20px]" />
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyLink(pase)}
                    className="flex h-12 items-center justify-center gap-1 rounded-lg bg-(--vp-high) text-sm font-medium transition-all active:scale-95"
                  >
                    <Icon name="link" className="text-[20px]" />
                    Copiar enlace
                  </button>
                </div>
              )}
            </div>
          )}

          {status.showQr && (
            <div className="bg-(--vp-blue-2)/10 p-4 text-center">
              <p className="text-xs text-(--vp-blue)">{pase.regla}.</p>
            </div>
          )}
        </section>

        {status.showQr && (
          <section className="rounded-xl border border-(--vp-border) bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-[18px] font-semibold">Cómo usarlo</h2>
            <ul className="space-y-2 text-sm text-(--vp-muted)">
              {INSTRUCCIONES(pase).map((paso) => (
                <li key={paso} className="flex gap-2">
                  <Icon
                    name="check_circle"
                    className="text-[18px] text-(--vp-green)"
                  />
                  {paso}
                </li>
              ))}
            </ul>
          </section>
        )}

        <PrivacyNotice />
      </main>
    </PaseTheme>
  );
}

const HERO_TONE: Record<Tone, string> = {
  success: 'bg-linear-135 from-[#0051d5] to-[#316bf3]',
  info: 'bg-linear-135 from-[#3f465c] to-[#565e74]',
  warning: 'bg-linear-135 from-[#b45309] to-[#f59e0b]',
  neutral: 'bg-linear-135 from-[#131b2e] to-[#3f465c]',
  error: 'bg-linear-135 from-[#93000a] to-[#ba1a1a]',
};

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <LabelSm>{label}</LabelSm>
      <p className="mt-1 text-[15px] font-medium">{children}</p>
    </div>
  );
}

const PASO_ICON = ['qr_code_scanner', 'badge', 'event_available', 'light_mode'];

/** B — state first: a hero that answers "¿me dejan entrar?", details, then the QR. */
export function VariantStatusFirst({
  pase,
  status,
  saveImage,
}: PageVariantProps) {
  return (
    <PaseTheme>
      <section
        className={cn(
          'relative overflow-hidden px-5 pt-6 pb-14 text-white',
          HERO_TONE[status.tone]
        )}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-white/85">
          <Icon name="apartment" className="text-[18px]" />
          {UNIDAD.nombre}
        </div>
        <div className="relative z-10 mt-8 max-w-md">
          <Icon name={ICON_TONE[status.tone]} fill className="text-[40px]" />
          <h1 className="mt-2 text-[28px] leading-9 font-semibold tracking-[-0.01em]">
            {status.title}
          </h1>
          <p className="mt-1 text-white/90">{status.detail}</p>
        </div>
        <Icon
          name="verified_user"
          className="absolute -right-8 -bottom-10 text-[180px] opacity-10"
        />
      </section>

      <main className="relative z-10 mx-auto -mt-8 grid max-w-3xl gap-4 px-4 md:grid-cols-2">
        {status.showData && (
          <section className="relative overflow-hidden rounded-xl border border-(--vp-border-soft) bg-white p-5 pl-7 shadow-sm">
            <div
              className={cn(
                'absolute inset-y-0 left-0 w-1',
                BAR_TONE[status.tone]
              )}
            />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold">Pase de visita</h2>
              <StatusPill status={status} />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <div className="col-span-2">
                <Detail label="Visitante">{pase.visitante}</Detail>
              </div>
              <Detail label="Destino">{pase.apartamento}</Detail>
              <Detail label="Tipo">
                {TIPO_LABEL[pase.tipo]}
                {pase.evento && ' (invitado)'}
              </Detail>
              <Detail label={pase.tipo === 'servicio' ? 'Vigencia' : 'Fecha'}>
                {pase.vigencia}
              </Detail>
              {pase.diasPermitidos ? (
                <Detail label="Días">{pase.diasPermitidos}</Detail>
              ) : (
                <Detail label="Ingresos">1 durante el día</Detail>
              )}
              <div className="col-span-2">
                <Detail label="Autorizado por">
                  {pase.autorizadoPor}, residente
                </Detail>
              </div>
            </div>
          </section>
        )}

        {status.showQr && (
          <section className="flex flex-col items-center rounded-xl border border-(--vp-border-soft) bg-white p-5 shadow-sm">
            <LabelSm className="mb-3 self-start">
              Muestra este código en portería
            </LabelSm>
            <PaseQr pase={pase} size={240} />
            <button
              type="button"
              onClick={() => void saveImage()}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-(--vp-border) text-sm font-medium hover:bg-(--vp-low)"
            >
              <Icon name="download" className="text-[20px]" />
              Guardar imagen para usar sin internet
            </button>
          </section>
        )}

        {status.showQr && (
          <section className="rounded-xl border border-(--vp-border-soft) bg-white p-5 shadow-sm md:col-span-2">
            <h2 className="mb-4 text-[18px] font-semibold">Al llegar</h2>
            <ol className="space-y-4">
              {INSTRUCCIONES(pase).map((paso, index) => (
                <li key={paso} className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-(--vp-blue-2)/15 text-(--vp-blue)">
                    <Icon name={PASO_ICON[index] ?? 'check'} />
                  </span>
                  <span className="text-[15px]">{paso}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="rounded-xl border border-(--vp-border-soft) bg-white p-5 shadow-sm md:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="policy" className="text-(--vp-blue)" />
            <h2 className="text-[18px] font-semibold">Aviso de privacidad</h2>
          </div>
          <PrivacyFullText />
        </section>
      </main>
    </PaseTheme>
  );
}

function SheetBody({ children }: { children: ReactNode }) {
  return (
    <div
      style={PASE_THEME_STYLE}
      className="max-h-[70dvh] overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-(--vp-fg)"
    >
      {children}
    </div>
  );
}

function GateAction({
  icon,
  label,
  ...props
}: { icon: string; label: string } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10"
      {...props}
    >
      <Icon name={icon} className="text-[24px]" />
      {label}
    </button>
  );
}

/** C — gate mode: dark, QR-dominant screen; everything else lives in sheets. */
export function VariantGate({ pase, status, saveImage }: PageVariantProps) {
  return (
    <PaseTheme className="bg-(--vp-navy) text-white">
      <header className="flex items-center justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-2 text-sm text-white/70">
          <Icon name="shield_person" className="text-[18px]" />
          <span className="truncate">{UNIDAD.nombre}</span>
        </div>
        <StatusPill status={status} />
      </header>

      <main className="mx-auto flex max-w-sm flex-col items-center px-5 pt-6 text-center">
        {status.showQr ? (
          <div className="w-full rounded-3xl bg-white p-3 shadow-[0_0_60px_rgba(49,107,243,0.35)]">
            <PaseQr pase={pase} size={320} className="h-auto w-full" />
          </div>
        ) : (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-3xl border border-white/15 bg-white/5 p-6">
            <Icon
              name={ICON_TONE[status.tone]}
              fill
              className="text-[64px] text-white/70"
            />
            <p className="text-2xl font-semibold">{status.title}</p>
            <p className="text-white/70">{status.detail}</p>
          </div>
        )}

        {status.showData && (
          <>
            <p className="mt-6 text-[32px] leading-10 font-bold tracking-[-0.02em]">
              {pase.visitante}
            </p>
            <p className="mt-1 text-lg text-white/70">{pase.apartamento}</p>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium">
              <Icon name="event" className="text-[18px]" />
              {cuandoCorto(pase)}
            </span>
          </>
        )}

        {status.showQr && (
          <p className="mt-4 flex items-center gap-1 text-xs text-white/50">
            <Icon name="light_mode" className="text-[16px]" />
            Sube el brillo y presenta tu documento
          </p>
        )}

        <div className="mt-6 flex w-full justify-around border-t border-white/10 pt-4">
          <Sheet>
            <SheetTrigger
              render={<GateAction icon="info" label="Detalles" />}
            />
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Detalles del Pase</SheetTitle>
                <SheetDescription>{status.detail}</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <LabelSm>Tipo</LabelSm>
                    <dd>{TIPO_LABEL[pase.tipo]}</dd>
                  </div>
                  <div>
                    <LabelSm>Autorizado por</LabelSm>
                    <dd>{pase.autorizadoPor}</dd>
                  </div>
                  <div className="col-span-2">
                    <LabelSm>Vigencia</LabelSm>
                    <dd>
                      {pase.vigenciaLarga}
                      {pase.diasPermitidos && ` · ${pase.diasPermitidos}`}
                    </dd>
                  </div>
                </dl>
                <ul className="mt-5 space-y-2 text-sm">
                  {INSTRUCCIONES(pase).map((paso) => (
                    <li key={paso} className="flex gap-2">
                      <Icon
                        name="check_circle"
                        className="text-[18px] text-(--vp-green)"
                      />
                      {paso}
                    </li>
                  ))}
                </ul>
              </SheetBody>
            </SheetContent>
          </Sheet>
          {status.showQr && (
            <GateAction
              icon="download"
              label="Guardar"
              onClick={() => void saveImage()}
            />
          )}
          <GateAction
            icon="link"
            label="Copiar"
            onClick={() => void copyLink(pase)}
          />
          <Sheet>
            <SheetTrigger
              render={<GateAction icon="policy" label="Privacidad" />}
            />
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Aviso de privacidad</SheetTitle>
                <SheetDescription>
                  Control de acceso de visitantes
                </SheetDescription>
              </SheetHeader>
              <SheetBody>
                <PrivacyFullText />
              </SheetBody>
            </SheetContent>
          </Sheet>
        </div>
        <p className="mt-4 max-w-xs text-[11px] leading-4 text-white/45">
          {UNIDAD.nombre} trata tus datos para controlar el acceso. Al presentar
          este Pase aceptas el aviso de privacidad.
        </p>
      </main>
    </PaseTheme>
  );
}
