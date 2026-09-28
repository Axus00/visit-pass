/*
 * PROTOTYPE, variant B "Escáner primero": the dark palette of the
 * dashboard_del_guardia_web mockup as a portería kiosk. The camera is always
 * open at the top; the Turno lives in a pill; results take the whole screen
 * as a colour flash readable from a distance.
 */
import { useState } from 'react';

import {
  KeyboardIcon,
  LockIcon,
  LogInIcon,
  LogOutIcon,
  SquarePlusIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react';

import { cn } from '@repo/ui';

import {
  CloseShiftSheet,
  CodeEntry,
  DemoPassPicker,
  InsideList,
  ManualEntryForm,
  MyShiftSheet,
  OutcomeIcon,
  PrivacyLink,
  ScanResultBody,
  ShiftHistoryList,
  StartShiftPanel,
  TONE_BG,
  Viewfinder,
  formatClock,
  formatElapsed,
  formatTime,
  outcomeHeadline,
  outcomeTone,
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

type Panel = 'dentro' | 'actividad' | 'turnos';

export function VariantB() {
  const store = usePortero();
  const now = useNow();
  const [panel, setPanel] = useState<Panel>('dentro');
  const [codeOpen, setCodeOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [result, setResult] = useState<{ outcome: ScanOutcome; key: number }>();
  const [manual, setManual] = useState<{
    prefill?: Partial<ManualEntryInput>;
    key: number;
  }>();
  const locked = !store.shift;

  const show = (outcome: ScanOutcome) => {
    setPickerOpen(false);
    setCodeOpen(false);
    setResult({ outcome, key: Date.now() });
  };

  return (
    <div className="flex min-h-full flex-col bg-[#0b1220] font-['Inter',sans-serif] text-[#eaf1ff]">
      <header className="flex h-16 shrink-0 items-center justify-between px-4">
        <div>
          <h1 className="text-lg leading-tight font-semibold">{UNIT.name}</h1>
          <p className="text-xs text-white/50">Portería · {store.me}</p>
        </div>
        <button
          type="button"
          onClick={() => setShiftOpen(true)}
          className={cn(
            'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold',
            store.shift
              ? 'border-[#4edea3]/40 bg-[#4edea3]/10 text-[#4edea3]'
              : 'border-[#ffb4ab]/40 bg-[#ffb4ab]/10 text-[#ffb4ab]'
          )}
        >
          <span
            className={cn(
              'size-2 rounded-full',
              store.shift ? 'animate-pulse bg-[#4edea3]' : 'bg-[#ffb4ab]'
            )}
          />
          {store.shift ? (
            <>
              <span className="font-mono">
                {formatClock(store.shift.startAt, now)}
              </span>
              <span className="text-white/40">·</span>
              {store.metrics.total}
            </>
          ) : (
            'Sin turno'
          )}
        </button>
      </header>

      <Viewfinder
        className="mx-3 h-[44dvh] max-h-96 shrink-0 rounded-2xl"
        locked={locked}
      >
        {locked ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0b1220]/85 p-6 text-center backdrop-blur-sm">
            <LockIcon className="size-10 text-white/60" />
            <p className="text-lg font-semibold">
              Inicie su turno para escanear y registrar
            </p>
            <div className="w-full">
              <StartShiftPanel dark />
            </div>
          </div>
        ) : (
          <>
            <p className="absolute inset-x-0 top-3 text-center text-sm text-white/70">
              Apunte al QR del Pase
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen(!pickerOpen)}
              className="absolute top-2 right-2 rounded-full border-2 border-dashed border-fuchsia-400 bg-fuchsia-50 px-2.5 py-1 text-[10px] font-bold text-fuchsia-900 uppercase"
            >
              Simular QR
            </button>
            {pickerOpen && (
              <DemoPassPicker
                className="absolute inset-x-2 top-11 z-10"
                onPick={(token) => show(store.scanToken(token))}
              />
            )}
            <div className="absolute inset-x-3 bottom-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCodeOpen(!codeOpen)}
                className={cn(
                  'flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold backdrop-blur',
                  codeOpen ? 'bg-white text-[#0b1220]' : 'bg-white/15'
                )}
              >
                <KeyboardIcon className="size-5" /> Digitar código
              </button>
              <button
                type="button"
                onClick={() => setManual({ key: Date.now() })}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/15 text-sm font-semibold backdrop-blur"
              >
                <SquarePlusIcon className="size-5" /> Registro manual
              </button>
            </div>
          </>
        )}
      </Viewfinder>

      {codeOpen && !locked && (
        <div className="mx-3 mt-3 rounded-2xl border border-white/10 bg-[#16213a] p-3">
          <CodeEntry
            dark
            autoFocus
            onSubmit={(code) => show(store.enterCode(code))}
          />
        </div>
      )}

      <div className="mx-3 mt-4 grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1">
        {(
          [
            { key: 'dentro', label: `Dentro · ${store.inside.length}` },
            { key: 'actividad', label: 'Actividad' },
            { key: 'turnos', label: 'Mis turnos' },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setPanel(item.key)}
            className={cn(
              'h-10 rounded-lg text-sm font-semibold',
              panel === item.key ? 'bg-[#316bf3] text-white' : 'text-white/60'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 px-3 pt-3 pb-6">
        {panel === 'dentro' && <InsideList dark />}
        {panel === 'actividad' && <ActivityFeed />}
        {panel === 'turnos' && <ShiftHistoryList dark />}
        <p className="pt-2 text-center">
          <PrivacyLink className="text-xs text-white/40 underline" />
        </p>
      </div>

      {result && (
        <div
          className={cn(
            'fixed inset-0 z-50 flex flex-col overflow-y-auto',
            TONE_BG[outcomeTone(result.outcome)]
          )}
        >
          <div className="flex items-start justify-between px-5 pt-6 text-white">
            <div className="flex items-center gap-3">
              <OutcomeIcon
                outcome={result.outcome}
                className="size-14 shrink-0"
              />
              <div>
                <p className="text-3xl leading-tight font-extrabold">
                  {outcomeHeadline(result.outcome).title}
                </p>
                <p className="text-white/85">
                  {outcomeHeadline(result.outcome).detail}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setResult(undefined)}
              className="rounded-full p-1 hover:bg-white/15"
            >
              <XIcon className="size-7" />
            </button>
          </div>
          <div className="m-4 overflow-hidden rounded-2xl bg-white text-[#0b1c30] shadow-2xl">
            <ScanResultBody
              key={result.key}
              outcome={result.outcome}
              headerClassName="hidden"
              onDone={() => setResult(undefined)}
              onManual={(prefill) => {
                setResult(undefined);
                setManual({ prefill, key: Date.now() });
              }}
            />
          </div>
        </div>
      )}

      {manual && (
        <div className={cn(ui.page, 'fixed inset-0 z-50 overflow-y-auto')}>
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between bg-[#131b2e] px-4 text-white">
            <h2 className="text-lg font-semibold">Registro manual</h2>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setManual(undefined)}
              className="rounded-full p-1 hover:bg-white/15"
            >
              <XIcon className="size-6" />
            </button>
          </header>
          <div className="p-4">
            <ManualEntryForm
              key={manual.key}
              prefill={manual.prefill}
              onDone={() => setManual(undefined)}
              onCancel={() => setManual(undefined)}
            />
          </div>
        </div>
      )}

      <MyShiftSheet
        open={shiftOpen}
        onClose={() => setShiftOpen(false)}
        onCloseShift={() => setClosing(true)}
      />
      <CloseShiftSheet open={closing} onClose={() => setClosing(false)} />
    </div>
  );
}

function ActivityFeed() {
  const activity = useActivity();
  useNow(30_000);
  if (activity.length === 0)
    return (
      <p className="py-6 text-center text-sm text-white/50">
        Sin actividad hoy.
      </p>
    );
  return (
    <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-[#16213a]">
      {activity.map((event) => {
        const isRejection = event.kind === 'rechazo';
        const name = isRejection
          ? (event.rejection.visitorName ?? 'Código desconocido')
          : event.visit.visitorName;
        const apartment = isRejection
          ? event.rejection.apartmentId
          : event.visit.apartmentId;
        const Icon = isRejection
          ? XCircleIcon
          : event.kind === 'salida'
            ? LogOutIcon
            : LogInIcon;
        return (
          <div key={event.id} className="flex items-center gap-3 px-3 py-2.5">
            <Icon
              className={cn(
                'size-5 shrink-0',
                isRejection
                  ? 'text-[#ffb4ab]'
                  : event.kind === 'salida'
                    ? 'text-white/40'
                    : 'text-[#4edea3]'
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-white/50">
                {isRejection
                  ? REJECT_COPY[event.rejection.reason].title
                  : `${event.kind === 'salida' ? 'Salida' : 'Ingreso'} · ${event.visit.origin === 'pase' ? 'Pase' : 'Manual'}`}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm text-[#b4c5ff]">
                {apartment ? apartmentShort(apartment) : '—'}
              </p>
              <p className="text-[11px] text-white/40">
                {formatTime(event.at)} · {formatElapsed(event.at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
