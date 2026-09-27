// PROTOTYPE (#15), round 2: variant C ("Modo portería") carrying the two
// pieces the owner kept from round 1 — A's privacy notice (summary + "Leer
// aviso completo") and B's "Al llegar" steps — placed three different ways.
import { type CSSProperties, useState } from 'react';

import { cn, toast } from '@repo/ui';

import type { PageVariantProps } from './pase-page-variants.components';
import {
  ICON_TONE,
  Icon,
  PaseQr,
  PaseTheme,
  PrivacyNotice,
  StatusPill,
} from './pase-prototype-shell.components';
import { INSTRUCCIONES, type Pase, UNIDAD } from './pase-prototype.fixtures';

/** Re-points the light tokens so A's and B's cards render on navy. */
const DARK_TOKENS = {
  '--vp-fg': '#ffffff',
  '--vp-muted': 'rgba(255, 255, 255, 0.72)',
  '--vp-outline': 'rgba(255, 255, 255, 0.5)',
  '--vp-card': 'rgba(255, 255, 255, 0.05)',
  '--vp-border-soft': 'rgba(255, 255, 255, 0.1)',
  '--vp-high': '#213145',
  '--vp-blue': '#b4c5ff',
  '--vp-blue-2': '#316bf3',
} as CSSProperties;

const PASO_ICON = ['qr_code_scanner', 'badge', 'event_available', 'light_mode'];

const copyLink = async (pase: Pase) => {
  await navigator.clipboard.writeText(pase.url);
  toast.success('Enlace copiado');
};

const cuandoCorto = (pase: Pase) =>
  pase.tipo === 'servicio'
    ? `${pase.vigencia} · ${pase.diasPermitidos}`
    : pase.vigencia;

/** B's "Al llegar" card; colours come from the surrounding tokens. */
function ArrivalSteps({
  pase,
  className,
  bare = false,
}: {
  pase: Pase;
  className?: string;
  bare?: boolean;
}) {
  return (
    <section
      className={cn(
        !bare &&
          'rounded-xl border border-(--vp-border-soft) bg-(--vp-card) p-5 shadow-sm',
        'text-left text-(--vp-fg)',
        className
      )}
    >
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
  );
}

/** C's QR block: header, QR (or the reason it is gone), who, where, when. */
function GateHero({ pase, status }: Omit<PageVariantProps, 'saveImage'>) {
  return (
    <>
      <header className="flex items-center justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-2 text-sm text-white/70">
          <Icon name="shield_person" className="text-[18px]" />
          <span className="truncate">{UNIDAD.nombre}</span>
        </div>
        <StatusPill status={status} />
      </header>

      <div className="mx-auto flex max-w-sm flex-col items-center px-5 pt-6 text-center">
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
      </div>
    </>
  );
}

function GateButtons({ pase, status, saveImage }: PageVariantProps) {
  return (
    <div className="grid w-full grid-cols-2 gap-3">
      {status.showQr && (
        <button
          type="button"
          onClick={() => void saveImage()}
          className="flex h-12 items-center justify-center gap-2 rounded-lg bg-(--vp-blue-2) text-sm font-medium text-white active:scale-95"
        >
          <Icon name="download" className="text-[20px]" />
          Guardar imagen
        </button>
      )}
      <button
        type="button"
        onClick={() => void copyLink(pase)}
        className={cn(
          'flex h-12 items-center justify-center gap-2 rounded-lg bg-white/10 text-sm font-medium text-white active:scale-95',
          !status.showQr && 'col-span-2'
        )}
      >
        <Icon name="link" className="text-[20px]" />
        Copiar enlace
      </button>
    </div>
  );
}

/** C1 — dark gate screen on top, A's and B's light cards below the fold. */
export function VariantGateLightCards(props: PageVariantProps) {
  const { pase, status } = props;
  return (
    <PaseTheme>
      <section className="rounded-b-[2rem] bg-(--vp-navy) pb-8 text-white">
        <GateHero pase={pase} status={status} />
        <div className="mx-auto mt-6 max-w-sm px-5">
          <GateButtons {...props} />
        </div>
      </section>
      <main className="mx-auto max-w-sm space-y-4 px-4 pt-6">
        {status.showQr && <ArrivalSteps pase={pase} />}
        <PrivacyNotice />
      </main>
    </PaseTheme>
  );
}

/** C2 — one continuous dark page; A's and B's cards re-toned for navy. */
export function VariantGateDark(props: PageVariantProps) {
  const { pase, status } = props;
  return (
    <PaseTheme className="bg-(--vp-navy) text-white">
      <GateHero pase={pase} status={status} />
      <main
        style={DARK_TOKENS}
        className="mx-auto max-w-sm space-y-4 px-5 pt-6"
      >
        <GateButtons {...props} />
        {status.showQr && (
          <p className="flex items-center justify-center gap-1 text-xs text-white/50">
            <Icon name="expand_more" className="text-[16px]" />
            Desliza para ver cómo usarlo
          </p>
        )}
        {status.showQr && <ArrivalSteps pase={pase} />}
        <PrivacyNotice />
      </main>
    </PaseTheme>
  );
}

const TABS = [
  { key: 'codigo', label: 'Código', icon: 'qr_code_2' },
  { key: 'llegar', label: 'Al llegar', icon: 'directions_walk' },
  { key: 'privacidad', label: 'Privacidad', icon: 'policy' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/** C3 — the gate screen as one tab; "Al llegar" and the aviso as sibling tabs. */
export function VariantGateTabs(props: PageVariantProps) {
  const { pase, status } = props;
  const [tab, setTab] = useState<TabKey>('codigo');
  return (
    <PaseTheme className="bg-(--vp-navy) text-white">
      <nav className="sticky top-0 z-10 bg-(--vp-navy)/90 px-4 pt-4 pb-2 backdrop-blur">
        <div className="grid grid-cols-3 gap-1 rounded-full bg-white/10 p-1">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                'flex h-10 items-center justify-center gap-1 rounded-full text-sm font-medium transition-colors',
                tab === item.key
                  ? 'bg-white text-(--vp-navy)'
                  : 'text-white/70 hover:text-white'
              )}
            >
              <Icon name={item.icon} className="text-[18px]" />
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {tab === 'codigo' && (
        <>
          <GateHero pase={pase} status={status} />
          <div className="mx-auto mt-6 max-w-sm space-y-4 px-5">
            <GateButtons {...props} />
            <button
              type="button"
              onClick={() => setTab('llegar')}
              className="flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-left text-sm text-white/80"
            >
              <span className="flex items-center gap-2">
                <Icon name="badge" className="text-[20px] text-[#b4c5ff]" />
                Lleva tu documento de identidad
              </span>
              <Icon name="chevron_right" className="text-[20px]" />
            </button>
          </div>
        </>
      )}

      <main style={DARK_TOKENS} className="mx-auto max-w-sm px-5 pt-4">
        {tab === 'llegar' && <ArrivalSteps pase={pase} />}
        {tab === 'privacidad' && <PrivacyNotice defaultOpen />}
      </main>
    </PaseTheme>
  );
}
