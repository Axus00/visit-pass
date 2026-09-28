/*
 * PROTOTYPE, variant A "Mockup fiel": the mobile dashboard_del_guardia mockup
 * — search, metric cards, the big blue "Escanear" card, recent entries, a
 * bento of secondary actions and bottom tabs. Scanner, result and Registro
 * manual open as full pages, like the registro_de_visitante mockup.
 */
import { useState } from 'react';

import {
  ArrowLeftIcon,
  HistoryIcon,
  HomeIcon,
  ListIcon,
  LockIcon,
  LogInIcon,
  LogOutIcon,
  QrCodeIcon,
  ScanLineIcon,
  SearchIcon,
  SquarePlusIcon,
  UsersIcon,
  XCircleIcon,
} from 'lucide-react';

import { cn } from '@repo/ui';

import {
  type ActivityEvent,
  Avatar,
  CloseShiftSheet,
  CodeEntry,
  DemoPassPicker,
  InsideList,
  ManualEntryForm,
  MyShiftSheet,
  PrivacyLink,
  ScanResultBody,
  ShiftBreakdown,
  ShiftHistoryList,
  StartShiftPanel,
  TYPE_ICONS,
  Viewfinder,
  formatClock,
  formatElapsed,
  formatTime,
  initials,
  ui,
  useActivity,
} from './prototype-portero.shared';
import {
  type ManualEntryInput,
  REJECT_COPY,
  type ScanOutcome,
  TYPE_LABELS,
  UNIT,
  apartmentShort,
  useNow,
  usePortero,
} from './prototype-portero.store';

type Tab = 'inicio' | 'dentro' | 'turnos';
type Screen =
  | { kind: 'tabs' }
  | { kind: 'scanner' }
  | { kind: 'result'; outcome: ScanOutcome; key: number }
  | { kind: 'manual'; prefill?: Partial<ManualEntryInput>; key: number };

export function VariantA() {
  const store = usePortero();
  const [tab, setTab] = useState<Tab>('inicio');
  const [screen, setScreen] = useState<Screen>({ kind: 'tabs' });
  const [closing, setClosing] = useState(false);
  const [myShiftOpen, setMyShiftOpen] = useState(false);
  const now = useNow();

  const showOutcome = (outcome: ScanOutcome) =>
    setScreen({ kind: 'result', outcome, key: Date.now() });
  const openManual = (prefill?: Partial<ManualEntryInput>) =>
    setScreen({ kind: 'manual', prefill, key: Date.now() });
  const backHome = () => setScreen({ kind: 'tabs' });

  if (screen.kind === 'scanner')
    return (
      <div className="flex min-h-full flex-col bg-[#0b1220] font-['Inter',sans-serif] text-white">
        <header className="flex h-16 items-center gap-3 px-4">
          <button
            type="button"
            aria-label="Volver"
            onClick={backHome}
            className="rounded-full p-2 hover:bg-white/10"
          >
            <ArrowLeftIcon className="size-6" />
          </button>
          <h1 className="text-lg font-semibold">Escanear Pase</h1>
        </header>
        <Viewfinder className="mx-4 aspect-square rounded-2xl">
          <p className="absolute inset-x-0 bottom-4 text-center text-sm text-white/80">
            Centre el código QR del Pase en el recuadro
          </p>
        </Viewfinder>
        <div className="space-y-3 p-4">
          <p className="text-sm font-medium text-white/70">
            ¿No lee el QR? Digite el código
          </p>
          <CodeEntry
            dark
            onSubmit={(code) => showOutcome(store.enterCode(code))}
          />
          <button
            type="button"
            onClick={() => openManual()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/20 text-sm font-medium"
          >
            <SquarePlusIcon className="size-5" /> Registro manual
          </button>
          <DemoPassPicker
            onPick={(token) => showOutcome(store.scanToken(token))}
          />
        </div>
      </div>
    );

  if (screen.kind === 'result')
    return (
      <div className={cn(ui.page, 'min-h-full')}>
        <PageHeader title="Resultado del escaneo" onBack={backHome} />
        <div className="p-4">
          <div className={cn(ui.card, 'overflow-hidden')}>
            <ScanResultBody
              key={screen.key}
              outcome={screen.outcome}
              onDone={() => setScreen({ kind: 'scanner' })}
              onManual={openManual}
            />
          </div>
        </div>
      </div>
    );

  if (screen.kind === 'manual')
    return (
      <div className={cn(ui.page, 'min-h-full')}>
        <PageHeader title={UNIT.name} onBack={backHome} />
        <div className="space-y-4 p-4">
          <div>
            <h2 className="text-2xl font-semibold">Registro de Visitante</h2>
            <p className="text-[#45464d]">
              Complete los datos para registrar el Ingreso.
            </p>
          </div>
          <div className={cn(ui.card, 'p-5')}>
            <ManualEntryForm
              key={screen.key}
              prefill={screen.prefill}
              onDone={backHome}
              onCancel={backHome}
            />
          </div>
        </div>
      </div>
    );

  return (
    <div className={cn(ui.page, 'min-h-full pb-24')}>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#c6c6cd] bg-[#f8f9ff] px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full border border-[#c6c6cd] bg-[#131b2e] text-sm font-semibold text-white">
            {initials(store.me)}
          </div>
          <div>
            <h1 className="text-lg leading-tight font-semibold text-black">
              {UNIT.name}
            </h1>
            <p className="text-xs text-[#45464d]">Portería · Visit Pass</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMyShiftOpen(true)}
          className={cn(
            'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold',
            store.shift
              ? 'border-[#4edea3] bg-[#4edea3]/15 text-[#005236]'
              : 'border-[#ffb4ab] bg-[#ffdad6] text-[#93000a]'
          )}
        >
          <span
            className={cn(
              'size-2 rounded-full',
              store.shift ? 'animate-pulse bg-[#00794f]' : 'bg-[#ba1a1a]'
            )}
          />
          {store.shift ? (
            <>
              <span className="font-mono">
                {formatClock(store.shift.startAt, now)}
              </span>
              <span className="opacity-40">·</span>
              {store.metrics.total}
            </>
          ) : (
            'Sin turno'
          )}
        </button>
      </header>

      {tab === 'inicio' && (
        <HomeTab
          onScan={() => setScreen({ kind: 'scanner' })}
          onManual={() => openManual()}
          onInside={() => setTab('dentro')}
          onShift={() => setTab('turnos')}
          onMyShift={() => setMyShiftOpen(true)}
        />
      )}
      {tab === 'dentro' && (
        <main className="space-y-4 px-4 pt-5">
          <h2 className="text-xl font-semibold">
            Visitantes dentro · {store.inside.length}
          </h2>
          <InsideList />
        </main>
      )}
      {tab === 'turnos' && (
        <main className="space-y-6 px-4 pt-5">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Turno actual</h2>
            <CurrentShiftCard onClose={() => setClosing(true)} />
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Mis turnos</h2>
            <ShiftHistoryList />
          </section>
        </main>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-20 items-center justify-around border-t border-[#c6c6cd] bg-white px-2 pb-2">
        {(
          [
            { key: 'inicio', label: 'Inicio', icon: HomeIcon },
            { key: 'dentro', label: 'Dentro', icon: UsersIcon },
            { key: 'turnos', label: 'Turnos', icon: HistoryIcon },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-full px-5 py-2 text-sm font-semibold',
              tab === item.key ? 'bg-[#316bf3] text-white' : 'text-[#45464d]'
            )}
          >
            <item.icon className="size-6" />
            {item.label}
          </button>
        ))}
      </nav>
      <MyShiftSheet
        open={myShiftOpen}
        onClose={() => setMyShiftOpen(false)}
        onCloseShift={() => setClosing(true)}
      />
      <CloseShiftSheet open={closing} onClose={() => setClosing(false)} />
    </div>
  );
}

function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-[#c6c6cd] bg-[#f8f9ff] px-4">
      <button
        type="button"
        aria-label="Volver"
        onClick={onBack}
        className="rounded-full p-2 hover:bg-[#eff4ff]"
      >
        <ArrowLeftIcon className="size-6" />
      </button>
      <h1 className="text-lg font-medium">{title}</h1>
    </header>
  );
}

function HomeTab({
  onScan,
  onManual,
  onInside,
  onShift,
  onMyShift,
}: {
  onScan: () => void;
  onManual: () => void;
  onInside: () => void;
  onShift: () => void;
  onMyShift: () => void;
}) {
  const store = usePortero();
  const now = useNow();
  const activity = useActivity();
  const [query, setQuery] = useState('');
  const isSearching = query.trim() !== '';
  const locked = !store.shift;

  return (
    <main className="space-y-6 px-4 pt-5">
      <label className="flex h-14 items-center gap-2 rounded-xl border border-[#c6c6cd] bg-white px-4 shadow-sm">
        <SearchIcon className="size-5 text-[#76777d]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, Apto o placa…"
          className="w-full bg-transparent text-base outline-none placeholder:text-[#45464d]"
        />
        <button
          type="button"
          aria-label="Escanear"
          onClick={onScan}
          disabled={locked}
        >
          <QrCodeIcon className="size-5 text-[#c6c6cd]" />
        </button>
      </label>

      {isSearching ? (
        <section className="space-y-3">
          <p className={ui.overline}>Visitantes dentro</p>
          <InsideList query={query} />
        </section>
      ) : (
        <>
          {store.shift ? (
            <section className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={onShift}
                  className={cn(
                    ui.card,
                    'flex h-32 flex-col justify-between p-4 text-left'
                  )}
                >
                  <span className={ui.overline}>Visitas del turno</span>
                  <span className="flex items-end justify-between">
                    <span className="text-5xl font-bold tracking-tight text-black">
                      {store.metrics.total}
                    </span>
                    <span className="rounded-full bg-[#002113] px-2 py-1 text-[11px] font-semibold text-[#4edea3]">
                      {store.metrics.pass} Pase · {store.metrics.manual} man.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onInside}
                  className="flex h-32 flex-col justify-between rounded-xl border border-black bg-[#131b2e] p-4 text-left text-white shadow-sm"
                >
                  <span className="text-xs font-semibold tracking-wider text-[#7c839b] uppercase">
                    Dentro ahora
                  </span>
                  <span className="flex items-end justify-between">
                    <span className="text-5xl font-bold tracking-tight">
                      {store.inside.length}
                    </span>
                    <UsersIcon className="size-6" />
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={onMyShift}
                className="flex w-full items-center justify-between rounded-xl bg-[#e5eeff] px-4 py-2.5 text-left text-sm"
              >
                <span className="text-[#45464d]">
                  Turno desde{' '}
                  <strong className="text-black">
                    {formatTime(store.shift.startAt)}
                  </strong>{' '}
                  ·{' '}
                  <span className="font-mono">
                    {formatClock(store.shift.startAt, now)}
                  </span>
                </span>
                <span className="font-semibold text-[#0051d5]">Mi turno</span>
              </button>
            </section>
          ) : (
            <section className="space-y-4 rounded-xl border border-black bg-[#131b2e] p-5 text-white">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#7c839b] uppercase">
                  Sin turno abierto
                </p>
                <p className="mt-1 text-lg font-semibold">
                  Inicie su turno para escanear Pases y registrar Ingresos y
                  Salidas.
                </p>
              </div>
              <StartShiftPanel dark />
            </section>
          )}

          <button
            type="button"
            onClick={onScan}
            disabled={locked}
            className={cn(
              'relative flex w-full flex-col items-center justify-center overflow-hidden rounded-3xl py-8 text-white shadow-xl transition-transform active:scale-[0.99]',
              locked
                ? 'bg-[#76777d] shadow-none'
                : 'bg-[#316bf3] shadow-[0_0_20px_rgba(0,81,213,0.4)]'
            )}
          >
            <span className="pointer-events-none absolute -top-32 -right-32 size-64 rounded-full bg-white opacity-10 blur-3xl" />
            <span className="mb-4 flex size-24 items-center justify-center rounded-full bg-white shadow-lg">
              {locked ? (
                <LockIcon className="size-11 text-[#76777d]" />
              ) : (
                <ScanLineIcon className="size-12 text-[#0051d5]" />
              )}
            </span>
            <span className="text-2xl font-semibold">Escanear Pase</span>
            <span className="mt-1 text-base opacity-90">
              {locked
                ? 'Bloqueado sin turno abierto'
                : 'Pulse para abrir la cámara o digitar el código'}
            </span>
          </button>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-black">
                Actividad reciente
              </h3>
              <button
                type="button"
                onClick={onShift}
                className="text-sm font-medium text-[#0051d5]"
              >
                Ver turnos
              </button>
            </div>
            <div className="space-y-2">
              {activity.slice(0, 5).map((event) => (
                <ActivityRow key={event.id} event={event} />
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={onManual}
              disabled={locked}
              className="flex flex-col items-center gap-2 rounded-2xl border border-[#c6c6cd] bg-white p-6 shadow-sm active:scale-95 disabled:opacity-40"
            >
              <SquarePlusIcon className="size-8 text-[#0051d5]" />
              <span className="text-sm font-medium">Registro manual</span>
            </button>
            <button
              type="button"
              onClick={onInside}
              className="flex flex-col items-center gap-2 rounded-2xl border border-[#c6c6cd] bg-white p-6 shadow-sm active:scale-95"
            >
              <ListIcon className="size-8 text-[#0051d5]" />
              <span className="text-sm font-medium">Visitantes dentro</span>
            </button>
          </section>
        </>
      )}

      <p className="pb-2 text-center">
        <PrivacyLink className="text-xs text-[#76777d] underline" />
      </p>
    </main>
  );
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  useNow(30_000);
  if (event.kind === 'rechazo') {
    const { rejection } = event;
    return (
      <div className="flex h-20 items-center overflow-hidden rounded-xl border border-[#c6c6cd] bg-white shadow-sm">
        <span className="h-full w-1 bg-[#ba1a1a]" />
        <div className="ml-4 flex size-11 items-center justify-center rounded-lg bg-[#ffdad6]">
          <XCircleIcon className="size-6 text-[#ba1a1a]" />
        </div>
        <div className="ml-3 min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#ba1a1a]">
            Acceso denegado
            {rejection.visitorName ? ` · ${rejection.visitorName}` : ''}
          </p>
          <p className="truncate text-xs text-[#45464d]">
            {REJECT_COPY[rejection.reason].title}
          </p>
        </div>
        <div className="mr-4 text-right">
          <p className="text-lg font-semibold text-[#ba1a1a]">
            {rejection.apartmentId
              ? apartmentShort(rejection.apartmentId)
              : '—'}
          </p>
          <p className="text-xs text-[#76777d]">
            Hace {formatElapsed(rejection.at)}
          </p>
        </div>
      </div>
    );
  }
  const { visit } = event;
  const TypeIcon = TYPE_ICONS[visit.type];
  const isExit = event.kind === 'salida';
  return (
    <div className="flex h-20 items-center overflow-hidden rounded-xl border border-[#c6c6cd] bg-white shadow-sm">
      <span
        className={cn('h-full w-1', isExit ? 'bg-[#76777d]' : 'bg-[#4edea3]')}
      />
      <Avatar name={visit.visitorName} className="ml-4" />
      <div className="ml-3 min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-sm font-medium text-black">
          {isExit ? (
            <LogOutIcon className="size-3.5 text-[#76777d]" />
          ) : (
            <LogInIcon className="size-3.5 text-[#00794f]" />
          )}
          {visit.visitorName}
        </p>
        <p className="flex items-center gap-1 truncate text-xs text-[#45464d]">
          <TypeIcon className="size-3.5" /> {TYPE_LABELS[visit.type]} ·{' '}
          {visit.origin === 'pase' ? 'Pase' : 'Manual'}
          {visit.plate ? ` · ${visit.plate}` : ''}
        </p>
      </div>
      <div className="mr-4 text-right">
        <p
          className={cn(
            'text-lg font-semibold',
            isExit ? 'text-[#45464d]' : 'text-[#0051d5]'
          )}
        >
          {apartmentShort(visit.apartmentId)}
        </p>
        <p className="text-xs text-[#76777d]">
          {isExit ? 'Salió' : 'Entró'} hace {formatElapsed(event.at)}
        </p>
      </div>
    </div>
  );
}

function CurrentShiftCard({ onClose }: { onClose: () => void }) {
  const store = usePortero();
  const now = useNow();
  if (!store.shift)
    return (
      <div className={cn(ui.card, 'p-5')}>
        <p className="mb-3 text-[#45464d]">
          No tiene un turno abierto en {UNIT.name}.
        </p>
        <StartShiftPanel />
      </div>
    );
  return (
    <div className={cn(ui.card, 'space-y-4 p-5')}>
      <div className="flex items-end justify-between">
        <div>
          <p className={ui.overline}>Desde {formatTime(store.shift.startAt)}</p>
          <p className="text-sm text-[#45464d]">
            {formatElapsed(store.shift.startAt, now)} transcurridos
          </p>
        </div>
        <p className="text-5xl font-bold">{store.metrics.total}</p>
      </div>
      <ShiftBreakdown />
      <p className="text-sm text-[#45464d]">
        Salidas registradas: {store.metrics.exits}
      </p>
      <button type="button" onClick={onClose} className={ui.primaryButton}>
        Cerrar turno
      </button>
    </div>
  );
}
