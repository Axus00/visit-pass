/*
 * PROTOTYPE, throwaway. Variant B — "Favoritos primero": the home is a grid of
 * Favorito cards (Parentesco + historial reciente) where "Autorizar hoy" is one
 * tap. Anything else goes through a floating "Nueva autorización" button that
 * opens a two-step sheet (tipo → datos). Separate tabs for Pases, Historial and
 * Avisos; the aviso de llegada interrupts with a centered card.
 */
import { useEffect, useState } from 'react';

import {
  BellIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HistoryIcon,
  PlusIcon,
  StarIcon,
  TicketIcon,
  UserPlusIcon,
} from 'lucide-react';

import { cn, toast } from '@repo/ui';

import {
  ActiveAuthorizations,
  AddFavoriteForm,
  AuthorizeForm,
  Avatar,
  MockupSheet,
  NoticeList,
  OriginTag,
  PassSheet,
  StatusChip,
  TYPE_ICONS,
  formatDay,
  formatElapsed,
  formatTime,
  ui,
} from './prototype-residente.shared';
import {
  type Authorization,
  type Favorite,
  RESIDENT,
  TYPE_LABELS,
  type VisitType,
  describeRelationship,
  useResident,
} from './prototype-residente.store';

type Tab = 'inicio' | 'pases' | 'historial' | 'avisos';

const TYPE_HELP: Record<VisitType, string> = {
  temporal: 'Una persona, un día, un ingreso.',
  evento: 'Varios invitados el mismo día. Un Pase para cada uno.',
  servicio: 'Aseo, niñera, profesor: rango de fechas y días de la semana.',
};

export function VariantB() {
  const store = useResident();
  const [tab, setTab] = useState<Tab>('inicio');
  const [pass, setPass] = useState<Authorization>();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<VisitType>();
  const [wizardGuest, setWizardGuest] = useState<Favorite>();
  const [detail, setDetail] = useState<Favorite>();
  const [addFavoriteOpen, setAddFavoriteOpen] = useState(false);

  const unread = store.notices.filter((notice) => !notice.read).length;
  const latest = store.notices[0];
  const [acknowledgedId, setAcknowledgedId] = useState<string>();
  useEffect(() => {
    if (latest) navigator.vibrate?.([120, 60, 120]);
  }, [latest]);
  const arrival =
    latest && acknowledgedId !== latest.id ? store.visitFor(latest) : undefined;

  const openWizard = (guest?: Favorite) => {
    setWizardGuest(guest);
    setWizardType(guest ? 'temporal' : undefined);
    setWizardOpen(true);
  };

  return (
    <div className={cn(ui.page, 'relative mx-auto min-h-full max-w-md pb-32')}>
      <header className="bg-[#131b2e] px-5 pt-6 pb-16 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#bec6e0] uppercase">
              {RESIDENT.unit}
            </p>
            <h1 className="text-2xl font-semibold">
              Hola, {RESIDENT.name.split(' ')[0]}
            </h1>
            <p className="text-sm text-[#bec6e0]">{RESIDENT.apartment}</p>
          </div>
          <button
            type="button"
            aria-label="Avisos"
            onClick={() => setTab('avisos')}
            className="relative flex size-11 items-center justify-center rounded-full bg-white/10"
          >
            <BellIcon className="size-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-[#ba1a1a] text-[11px] font-bold">
                {unread}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="-mt-10 space-y-6 px-4">
        {tab === 'inicio' && (
          <>
            <InsideNowStrip />
            <section>
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="flex items-center gap-1.5 text-lg font-semibold">
                  <StarIcon className="size-4 fill-amber-400 text-amber-400" />
                  Favoritos
                </h2>
                <span className="text-xs text-[#76777d]">
                  Un toque = Pase para hoy
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {store.favorites.map((favorite) => (
                  <FavoriteCard
                    key={favorite.id}
                    favorite={favorite}
                    onOpen={() => setDetail(favorite)}
                    onAuthorize={() => setPass(store.authorizeToday(favorite))}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setAddFavoriteOpen(true)}
                  className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#c6c6cd] text-sm font-medium text-[#45464d]"
                >
                  <UserPlusIcon className="size-6" /> Agregar Favorito
                </button>
              </div>
            </section>
          </>
        )}

        {tab === 'pases' && (
          <section className={cn(ui.card, 'px-5 py-3')}>
            <h2 className="pt-2 text-lg font-semibold">Autorizaciones</h2>
            <p className="text-xs text-[#76777d]">
              Vigentes y programadas del Apartamento. Toca para ver el Pase.
            </p>
            <ActiveAuthorizations
              authorizations={store.authorizations}
              onOpen={setPass}
              onCancel={(authorization) => {
                store.cancelAuthorization(authorization.id);
                toast('Autorización cancelada', {
                  description: 'El Portero la verá como cancelada al escanear.',
                });
              }}
            />
          </section>
        )}

        {tab === 'historial' && (
          <section className={cn(ui.card, 'overflow-hidden')}>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-[#c6c6cd] px-5 py-3 text-[11px] font-semibold tracking-wider text-[#76777d] uppercase">
              <span>Visitante</span>
              <span>Ingreso</span>
              <span>Salida</span>
            </div>
            <div className="divide-y divide-[#c6c6cd]">
              {store.visits.map((visit) => (
                <div
                  key={visit.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {visit.visitorName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#76777d]">
                      {formatDay(visit.entryAt)} · {TYPE_LABELS[visit.type]}
                      <OriginTag visit={visit} />
                    </div>
                  </div>
                  <span className="text-sm tabular-nums">
                    {formatTime(visit.entryAt)}
                  </span>
                  <span className="text-sm tabular-nums">
                    {visit.exitAt ? (
                      formatTime(visit.exitAt)
                    ) : (
                      <StatusChip tone="green">Dentro</StatusChip>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'avisos' && (
          <section className={cn(ui.card, 'px-5 py-3')}>
            <div className="flex items-center justify-between pt-2">
              <h2 className="text-lg font-semibold">Avisos de llegada</h2>
              {unread > 0 && (
                <button
                  type="button"
                  className="text-xs font-semibold text-[#0051d5]"
                  onClick={store.markNoticesRead}
                >
                  Marcar leídos
                </button>
              )}
            </div>
            <NoticeList notices={store.notices} visitFor={store.visitFor} />
          </section>
        )}
      </main>

      <button
        type="button"
        onClick={() => openWizard()}
        className="fixed right-[max(1rem,calc(50%-14rem+1rem))] bottom-24 z-30 flex h-14 items-center gap-2 rounded-2xl bg-[#0051d5] px-5 font-medium text-white shadow-xl active:scale-95"
      >
        <PlusIcon className="size-5" /> Nueva autorización
      </button>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto grid max-w-md grid-cols-4 border-t border-[#c6c6cd] bg-white pb-[env(safe-area-inset-bottom)]">
        {(
          [
            ['inicio', 'Inicio', StarIcon],
            ['pases', 'Pases', TicketIcon],
            ['historial', 'Historial', HistoryIcon],
            ['avisos', 'Avisos', BellIcon],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold',
              tab === key ? 'text-[#0051d5]' : 'text-[#76777d]'
            )}
          >
            {tab === key && (
              <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-[#0051d5]" />
            )}
            <Icon className="size-5" />
            {label}
            {key === 'avisos' && unread > 0 && (
              <span className="absolute top-1.5 right-[calc(50%-1.1rem)] size-2 rounded-full bg-[#ba1a1a]" />
            )}
          </button>
        ))}
      </nav>

      <MockupSheet
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title={
          wizardType
            ? `Nueva autorización · ${TYPE_LABELS[wizardType]}`
            : '¿Qué tipo de visita?'
        }
      >
        {wizardType ? (
          <div className="space-y-4">
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-[#0051d5]"
              onClick={() => setWizardType(undefined)}
            >
              <ChevronLeftIcon className="size-4" /> Cambiar tipo
            </button>
            <AuthorizeForm
              key={`${wizardType}-${wizardGuest?.id}`}
              typePicker="none"
              initialType={wizardType}
              initialGuest={wizardGuest}
              favorites={store.favorites}
              submitLabel="Crear y compartir Pase"
              onSubmit={(input) => {
                setWizardOpen(false);
                setPass(store.createAuthorization(input));
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {(['temporal', 'evento', 'servicio'] as const).map((type) => {
              const Icon = TYPE_ICONS[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setWizardType(type)}
                  className="flex w-full items-center gap-4 rounded-xl border border-[#c6c6cd] p-4 text-left hover:border-[#0051d5] hover:bg-[#eff4ff]"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#316bf3]/10 text-[#0051d5]">
                    <Icon className="size-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{TYPE_LABELS[type]}</p>
                    <p className="text-sm text-[#45464d]">{TYPE_HELP[type]}</p>
                  </div>
                  <ChevronRightIcon className="size-5 text-[#76777d]" />
                </button>
              );
            })}
          </div>
        )}
      </MockupSheet>

      <MockupSheet
        open={Boolean(detail)}
        onClose={() => setDetail(undefined)}
        title={detail?.name ?? ''}
      >
        {detail && (
          <FavoriteDetail
            favorite={detail}
            onAuthorizeToday={() => {
              setDetail(undefined);
              setPass(store.authorizeToday(detail));
            }}
            onOtherDate={() => {
              setDetail(undefined);
              openWizard(detail);
            }}
          />
        )}
      </MockupSheet>

      <MockupSheet
        open={addFavoriteOpen}
        onClose={() => setAddFavoriteOpen(false)}
        title="Nuevo Favorito"
      >
        <AddFavoriteForm
          onSubmit={(favorite) => {
            store.addFavorite(favorite);
            setAddFavoriteOpen(false);
            toast.success('Favorito guardado');
          }}
        />
      </MockupSheet>

      <PassSheet authorization={pass} onClose={() => setPass(undefined)} />

      {arrival && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm animate-in rounded-2xl bg-white p-6 text-center shadow-2xl duration-200 zoom-in-95 fade-in">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2Icon className="size-9 text-green-600" />
            </div>
            <p className="text-xs font-semibold tracking-wider text-green-700 uppercase">
              Tu visitante llegó
            </p>
            <h3 className="mt-1 text-2xl font-semibold">
              {arrival.visitorName}
            </h3>
            <p className="mt-2 text-sm text-[#45464d]">
              Ingresó a las {formatTime(arrival.entryAt)} ·{' '}
              {TYPE_LABELS[arrival.type]}
            </p>
            <div className="mt-2 flex justify-center">
              <OriginTag visit={arrival} />
            </div>
            <button
              type="button"
              className={cn(ui.primaryButton, 'mt-6')}
              onClick={() => {
                setAcknowledgedId(latest?.id);
                store.markNoticesRead();
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InsideNowStrip() {
  const store = useResident();
  const inside = store.visits.filter((visit) => !visit.exitAt);
  return (
    <section className={cn(ui.card, 'p-4')}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="size-2 rounded-full bg-green-500" />
        {inside.length === 0
          ? 'Nadie de visita ahora'
          : `${inside.length} de visita ahora`}
      </div>
      {inside.length > 0 && (
        <div className="mt-3 flex gap-3 overflow-x-auto">
          {inside.map((visit) => (
            <div
              key={visit.id}
              className="flex shrink-0 items-center gap-2 rounded-full bg-green-50 py-1 pr-3 pl-1"
            >
              <Avatar
                name={visit.visitorName}
                className="size-8 bg-green-200 text-green-800"
              />
              <div className="leading-tight">
                <p className="text-xs font-semibold">
                  {visit.visitorName.split(' ').slice(0, 2).join(' ')}
                </p>
                <p className="text-[11px] text-[#45464d]">
                  hace {formatElapsed(visit.entryAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FavoriteCard({
  favorite,
  onOpen,
  onAuthorize,
}: {
  favorite: Favorite;
  onOpen: () => void;
  onAuthorize: () => void;
}) {
  const store = useResident();
  const visits = store.visits.filter(
    (visit) => visit.visitorName === favorite.name
  );
  return (
    <div className={cn(ui.card, 'flex min-h-44 flex-col p-3')}>
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col items-start text-left"
      >
        <Avatar name={favorite.name} className="mb-2 size-12 text-base" />
        <p className="line-clamp-2 text-sm leading-tight font-semibold">
          {favorite.name}
        </p>
        <span className="mt-1 rounded-full bg-[#eff4ff] px-2 py-0.5 text-[11px] font-medium text-[#003ea8]">
          {describeRelationship(favorite.relationship)}
        </span>
        <p className="mt-1.5 text-[11px] text-[#76777d]">
          {visits[0]
            ? `Última: ${formatDay(visits[0].entryAt).toLowerCase()} · ${visits.length} visita${visits.length === 1 ? '' : 's'}`
            : 'Sin visitas aún'}
        </p>
      </button>
      <button
        type="button"
        onClick={onAuthorize}
        className="mt-3 h-10 w-full rounded-lg bg-[#0051d5] text-sm font-semibold text-white active:scale-95"
      >
        Autorizar hoy
      </button>
    </div>
  );
}

function FavoriteDetail({
  favorite,
  onAuthorizeToday,
  onOtherDate,
}: {
  favorite: Favorite;
  onAuthorizeToday: () => void;
  onOtherDate: () => void;
}) {
  const store = useResident();
  const visits = store.visits.filter(
    (visit) => visit.visitorName === favorite.name
  );
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Avatar name={favorite.name} className="size-14 text-lg" />
        <div>
          <p className="text-sm text-[#45464d]">
            {describeRelationship(favorite.relationship)}
          </p>
          <p className="text-xs text-[#76777d]">
            {favorite.document
              ? `Documento •••• ${favorite.document.slice(-4)}`
              : 'Sin documento guardado'}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className={ui.actionButton}
          onClick={onAuthorizeToday}
        >
          Autorizar hoy
        </button>
        <button
          type="button"
          className={cn(ui.ghostButton, 'h-12')}
          onClick={onOtherDate}
        >
          <CalendarClockIcon className="size-4" /> Otra fecha
        </button>
      </div>
      <div>
        <h4 className="mb-2 text-sm font-semibold">Historial reciente</h4>
        {visits.length === 0 ? (
          <p className="text-sm text-[#76777d]">Aún no ha venido.</p>
        ) : (
          <ol className="space-y-2">
            {visits.slice(0, 5).map((visit) => (
              <li
                key={visit.id}
                className="flex items-center justify-between rounded-lg bg-[#f8f9ff] px-3 py-2 text-sm"
              >
                <span>{formatDay(visit.entryAt)}</span>
                <span className="text-[#45464d] tabular-nums">
                  {formatTime(visit.entryAt)} →{' '}
                  {visit.exitAt ? formatTime(visit.exitAt) : 'dentro'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
