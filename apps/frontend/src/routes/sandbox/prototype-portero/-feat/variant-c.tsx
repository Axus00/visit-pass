/*
 * PROTOTYPE, variant C "Turno al centro": the mockup's dark "En turno" card
 * grows into the hero — live clock, total and breakdown. Scan and Registro
 * manual are two tiles, the Código del Pase is typed on the home screen, and
 * the day reads as a timeline of movements. Results open as bottom sheets.
 */
import { useState } from 'react';

import { LockIcon, ScanLineIcon, SquarePlusIcon, XIcon } from 'lucide-react';

import { Sheet, SheetContent, SheetTitle, cn } from '@repo/ui';

import {
  BottomSheet,
  CloseShiftSheet,
  CodeEntry,
  DemoPassPicker,
  InsideList,
  ManualEntryForm,
  OriginTag,
  PrivacyLink,
  ScanResultBody,
  ShiftBreakdown,
  ShiftHistoryList,
  StartShiftPanel,
  Viewfinder,
  formatClock,
  formatElapsed,
  formatShortDate,
  formatTime,
  initials,
  ui,
  useActivity,
} from './prototype-portero.shared';
import {
  type ManualEntryInput,
  REJECT_COPY,
  type ScanOutcome,
  UNIT,
  apartmentShort,
  useNow,
  usePortero,
} from './prototype-portero.store';

type Section = 'dentro' | 'movimientos' | 'turnos';

export function VariantC() {
  const store = usePortero();
  const now = useNow();
  const [section, setSection] = useState<Section>('dentro');
  const [scanning, setScanning] = useState(false);
  const [closing, setClosing] = useState(false);
  const [result, setResult] = useState<{ outcome: ScanOutcome; key: number }>();
  const [manual, setManual] = useState<{
    prefill?: Partial<ManualEntryInput>;
    key: number;
  }>();
  const locked = !store.shift;
  const lastShift = store.history[0];

  const show = (outcome: ScanOutcome) => {
    setScanning(false);
    setResult({ outcome, key: Date.now() });
  };

  return (
    <div className={cn(ui.page, 'min-h-full')}>
      <header className="flex h-16 items-center justify-between px-4">
        <div>
          <h1 className="text-lg leading-tight font-semibold text-black">
            {UNIT.name}
          </h1>
          <p className="text-xs text-[#45464d] first-letter:uppercase">
            {formatShortDate(now)}
          </p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-full bg-[#131b2e] text-sm font-semibold text-white">
          {initials(store.me)}
        </div>
      </header>

      <main className="space-y-4 px-4 pb-8">
        <section className="space-y-4 rounded-2xl border border-black bg-[#131b2e] p-5 text-white shadow-lg">
          {store.shift ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-[#4edea3] uppercase">
                    <span className="size-2 animate-pulse rounded-full bg-[#4edea3]" />{' '}
                    Turno en curso
                  </p>
                  <p className="mt-1 font-mono text-4xl font-bold tracking-tight">
                    {formatClock(store.shift.startAt, now)}
                  </p>
                  <p className="text-sm text-[#7c839b]">
                    Desde {formatTime(store.shift.startAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-5xl font-bold">{store.metrics.total}</p>
                  <p className="text-xs text-[#7c839b]">
                    Visitas · {store.metrics.exits} Salidas
                  </p>
                </div>
              </div>
              <ShiftBreakdown dark />
              <button
                type="button"
                onClick={() => setClosing(true)}
                className="h-11 w-full rounded-lg border border-white/25 text-sm font-semibold hover:bg-white/10"
              >
                Cerrar turno
              </button>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#ffb4ab] uppercase">
                  Sin turno abierto
                </p>
                <p className="mt-1 text-lg font-semibold">
                  Registrar Ingresos y Salidas exige un Turno abierto.
                </p>
                {lastShift && (
                  <p className="mt-1 text-sm text-[#7c839b]">
                    Último: {formatShortDate(lastShift.startAt)},{' '}
                    {formatTime(lastShift.startAt)}–
                    {lastShift.endAt ? formatTime(lastShift.endAt) : '…'} ·{' '}
                    {lastShift.total} Visitas
                  </p>
                )}
              </div>
              <StartShiftPanel dark />
            </>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={locked}
            onClick={() => setScanning(true)}
            className="flex h-32 flex-col items-start justify-between rounded-2xl bg-[#316bf3] p-4 text-left text-white shadow-[0_0_20px_rgba(0,81,213,0.35)] active:scale-[0.98] disabled:bg-[#76777d] disabled:shadow-none"
          >
            {locked ? (
              <LockIcon className="size-8" />
            ) : (
              <ScanLineIcon className="size-8" />
            )}
            <span className="text-lg leading-tight font-semibold">
              Escanear Pase
            </span>
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => setManual({ key: Date.now() })}
            className="flex h-32 flex-col items-start justify-between rounded-2xl border border-[#c6c6cd] bg-white p-4 text-left shadow-sm active:scale-[0.98] disabled:opacity-40"
          >
            <SquarePlusIcon className="size-8 text-[#0051d5]" />
            <span className="text-lg leading-tight font-semibold">
              Registro manual
            </span>
          </button>
        </section>

        <section
          className={cn(ui.card, 'space-y-2 p-4', locked && 'opacity-40')}
        >
          <p className="text-sm font-medium text-[#45464d]">
            ¿Sin cámara o QR dañado? Digite el Código del Pase
          </p>
          <fieldset disabled={locked}>
            <CodeEntry onSubmit={(code) => show(store.enterCode(code))} />
          </fieldset>
        </section>

        <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#e5eeff] p-1">
          {(
            [
              { key: 'dentro', label: `Dentro · ${store.inside.length}` },
              { key: 'movimientos', label: 'Movimientos' },
              { key: 'turnos', label: 'Mis turnos' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSection(item.key)}
              className={cn(
                'h-10 rounded-md text-sm font-medium',
                section === item.key
                  ? 'bg-white text-black shadow-sm'
                  : 'text-[#45464d]'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {section === 'dentro' && <InsideList />}
        {section === 'movimientos' && <Timeline />}
        {section === 'turnos' && <ShiftHistoryList />}

        <p className="text-center">
          <PrivacyLink className="text-xs text-[#76777d] underline" />
        </p>
      </main>

      {scanning && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#0b1220] text-white">
          <header className="flex h-14 shrink-0 items-center justify-between px-4">
            <h2 className="text-lg font-semibold">Escanear Pase</h2>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setScanning(false)}
              className="rounded-full p-1 hover:bg-white/15"
            >
              <XIcon className="size-6" />
            </button>
          </header>
          <Viewfinder className="mx-4 aspect-[3/4] shrink-0 rounded-2xl" />
          <div className="p-4">
            <DemoPassPicker onPick={(token) => show(store.scanToken(token))} />
          </div>
        </div>
      )}

      <Sheet
        open={Boolean(result)}
        onOpenChange={(open) => !open && setResult(undefined)}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto max-h-[92dvh] max-w-md gap-0 overflow-y-auto rounded-t-2xl bg-white p-0 pb-14 font-['Inter',sans-serif] text-[#0b1c30]"
        >
          <SheetTitle className="sr-only">Resultado del escaneo</SheetTitle>
          {result && (
            <ScanResultBody
              key={result.key}
              outcome={result.outcome}
              onDone={() => setResult(undefined)}
              onManual={(prefill) => {
                setResult(undefined);
                setManual({ prefill, key: Date.now() });
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      <BottomSheet
        open={Boolean(manual)}
        onClose={() => setManual(undefined)}
        title="Registro manual"
      >
        {manual && (
          <ManualEntryForm
            key={manual.key}
            prefill={manual.prefill}
            onDone={() => setManual(undefined)}
            onCancel={() => setManual(undefined)}
          />
        )}
      </BottomSheet>
      <CloseShiftSheet open={closing} onClose={() => setClosing(false)} />
    </div>
  );
}

function Timeline() {
  const activity = useActivity();
  useNow(30_000);
  if (activity.length === 0)
    return (
      <p className="py-6 text-center text-sm text-[#76777d]">
        Sin movimientos hoy.
      </p>
    );
  return (
    <ol className="relative space-y-1 pl-2">
      <span className="absolute top-2 bottom-2 left-[4.35rem] w-px bg-[#c6c6cd]" />
      {activity.map((event) => {
        const isRejection = event.kind === 'rechazo';
        const dot = isRejection
          ? 'bg-[#ba1a1a]'
          : event.kind === 'salida'
            ? 'bg-[#76777d]'
            : 'bg-[#4edea3]';
        return (
          <li key={event.id} className="relative flex gap-4 py-2">
            <span className="w-14 shrink-0 pt-0.5 text-right text-xs font-medium text-[#45464d]">
              {formatTime(event.at)}
            </span>
            <span
              className={cn(
                'relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-[#f8f9ff]',
                dot
              )}
            />
            <div className="min-w-0 flex-1">
              {isRejection ? (
                <>
                  <p className="text-sm font-semibold text-[#ba1a1a]">
                    Rechazo · {REJECT_COPY[event.rejection.reason].title}
                  </p>
                  <p className="text-xs text-[#45464d]">
                    {event.rejection.visitorName ?? 'Código desconocido'}
                    {event.rejection.apartmentId
                      ? ` → ${apartmentShort(event.rejection.apartmentId)}`
                      : ''}{' '}
                    ·{' '}
                    {event.rejection.medium === 'codigo' ? 'código' : 'escaneo'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold">
                    {event.kind === 'salida' ? 'Salida' : 'Ingreso'} ·{' '}
                    {event.visit.visitorName}
                  </p>
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-[#45464d]">
                    {apartmentShort(event.visit.apartmentId)}
                    {event.kind === 'ingreso' && (
                      <OriginTag visit={event.visit} />
                    )}
                    {event.kind === 'salida' &&
                      ` · estuvo ${formatElapsed(event.visit.entryAt, event.at)}`}
                    {event.visit.plate ? ` · ${event.visit.plate}` : ''}
                  </p>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
