/*
 * PROTOTYPE, throwaway. Variant C — "Agenda de hoy": the home answers "who is
 * here and who is coming" (Dentro ahora / Esperados hoy / Próximos). A composer
 * pinned above the tabs authorizes a Temporal for today by typing a name or
 * tapping a Favorito chip; "Más opciones" opens the full form. The historial is
 * a day-grouped timeline; the aviso de llegada is a toast plus a highlighted row.
 */
import type * as React from 'react';
import { useEffect, useState } from 'react';

import {
  BellIcon,
  CalendarDaysIcon,
  HistoryIcon,
  LogInIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  SendHorizontalIcon,
  SlidersHorizontalIcon,
  StarIcon,
  UserPlusIcon,
} from 'lucide-react';

import { cn, toast } from '@repo/ui';

import {
  AddFavoriteForm,
  AuthorizeForm,
  Avatar,
  MockupSheet,
  NoticeList,
  OriginTag,
  PassSheet,
  StatusChip,
  TYPE_ICONS,
  authorizationTitle,
  describeValidity,
  expectedPasses,
  formatDay,
  formatElapsed,
  formatTime,
  ui,
} from './prototype-residente.shared';
import {
  type Authorization,
  RESIDENT,
  TYPE_LABELS,
  type Visit,
  describeRelationship,
  toIso,
  useResident,
} from './prototype-residente.store';

type Tab = 'hoy' | 'historial' | 'favoritos';

export function VariantC() {
  const store = useResident();
  const [tab, setTab] = useState<Tab>('hoy');
  const [pass, setPass] = useState<Authorization>();
  const [name, setName] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [addFavoriteOpen, setAddFavoriteOpen] = useState(false);
  const [manage, setManage] = useState<Authorization>();
  const [fadedNoticeId, setFadedNoticeId] = useState<string>();

  const unread = store.notices.filter((notice) => !notice.read).length;
  const latest = store.notices[0];
  useEffect(() => {
    if (!latest) return;
    const visit = store.visitFor(latest);
    if (!visit) return;
    navigator.vibrate?.(200);
    toast.success(`Llegó ${visit.visitorName}`, {
      description: `Ingreso ${formatTime(visit.entryAt)} · ${visit.origin === 'pase' ? 'con Pase' : 'registro manual del Portero'}`,
      action: { label: 'Ver', onClick: () => setTab('hoy') },
    });
    const timer = setTimeout(() => setFadedNoticeId(latest.id), 6000);
    return () => clearTimeout(timer);
    // oxlint-disable-next-line react/exhaustive-deps -- fire once per new notice
  }, [latest]);

  const highlightId =
    latest && fadedNoticeId !== latest.id ? latest.visitId : undefined;
  const inside = store.visits.filter((visit) => !visit.exitAt);
  const expected = expectedPasses(store.authorizations);
  const expectedToday = expected.filter((entry) => entry.today);
  const upcoming = expected.filter((entry) => !entry.today);

  const matchingFavorite = store.favorites.find(
    (favorite) => favorite.name === name.trim()
  );
  const authorizeTyped = () => {
    if (!name.trim()) return;
    setPass(
      store.authorizeToday(
        matchingFavorite ?? {
          id: 'typed',
          name: name.trim(),
          relationship: { kind: 'otro' },
        }
      )
    );
    setName('');
  };

  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div
      className={cn(
        ui.page,
        'relative mx-auto min-h-full max-w-md',
        tab === 'hoy' ? 'pb-56' : 'pb-24'
      )}
    >
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#c6c6cd] bg-[#f8f9ff]/95 px-5 py-3 backdrop-blur">
        <div>
          <p className="text-xs font-semibold tracking-wider text-[#76777d] uppercase">
            {today}
          </p>
          <h1 className="text-lg font-semibold">{RESIDENT.apartment}</h1>
        </div>
        <button
          type="button"
          aria-label="Avisos"
          className="relative flex size-10 items-center justify-center rounded-full hover:bg-[#eff4ff]"
          onClick={() => {
            setNoticesOpen(true);
            store.markNoticesRead();
          }}
        >
          <BellIcon className="size-5" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-[#ba1a1a]" />
          )}
        </button>
      </header>

      <main className="space-y-6 px-4 pt-4">
        {tab === 'hoy' && (
          <>
            <AgendaSection
              title="Dentro ahora"
              count={inside.length}
              empty="Nadie de visita en este momento."
            >
              {inside.map((visit) => (
                <div
                  key={visit.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 transition-colors duration-700',
                    highlightId === visit.id && 'bg-green-100'
                  )}
                >
                  <div className="h-10 w-1 shrink-0 rounded-full bg-green-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {visit.visitorName}
                    </p>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-[#76777d]">
                      Desde {formatTime(visit.entryAt)} · hace{' '}
                      {formatElapsed(visit.entryAt)}
                      <OriginTag visit={visit} />
                    </p>
                  </div>
                  <StatusChip tone="green">Entró</StatusChip>
                </div>
              ))}
            </AgendaSection>

            <AgendaSection
              title="Esperados hoy"
              count={expectedToday.length}
              empty="No esperas a nadie más hoy."
            >
              {expectedToday.map(({ authorization, pass: guestPass }) => (
                <ExpectedRow
                  key={guestPass.id}
                  title={guestPass.visitorName}
                  subtitle={`${TYPE_LABELS[authorization.type]}${authorization.type === 'servicio' ? ` · ${describeValidity(authorization)}` : ' · todo el día'}`}
                  authorization={authorization}
                  onOpen={() => setPass(authorization)}
                  onManage={() => setManage(authorization)}
                />
              ))}
            </AgendaSection>

            <AgendaSection
              title="Próximos"
              count={groupEvents(upcoming).length}
              empty="Sin autorizaciones programadas."
            >
              {groupEvents(upcoming).map(({ authorization, names }) => (
                <ExpectedRow
                  key={authorization.id}
                  title={authorizationTitle(authorization)}
                  subtitle={
                    authorization.type === 'evento'
                      ? `${formatDay(authorization.startDate)} · ${names.length} invitados`
                      : `${TYPE_LABELS[authorization.type]} · ${describeValidity(authorization)}`
                  }
                  authorization={authorization}
                  onOpen={() => setPass(authorization)}
                  onManage={() => setManage(authorization)}
                />
              ))}
            </AgendaSection>
          </>
        )}

        {tab === 'historial' && <Timeline visits={store.visits} />}

        {tab === 'favoritos' && (
          <section className={cn(ui.card, 'overflow-hidden')}>
            <div className="flex items-center justify-between border-b border-[#c6c6cd] px-5 py-4">
              <h2 className={ui.title}>Favoritos</h2>
              <button
                type="button"
                className="flex items-center gap-1 text-sm font-medium text-[#0051d5]"
                onClick={() => setAddFavoriteOpen(true)}
              >
                <UserPlusIcon className="size-4" /> Agregar
              </button>
            </div>
            <div className="divide-y divide-[#c6c6cd]">
              {store.favorites.map((favorite) => {
                const visits = store.visits.filter(
                  (visit) => visit.visitorName === favorite.name
                );
                return (
                  <div key={favorite.id} className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={favorite.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {favorite.name}
                        </p>
                        <p className="text-xs text-[#76777d]">
                          {describeRelationship(favorite.relationship)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={ui.pillAction}
                        onClick={() => setPass(store.authorizeToday(favorite))}
                      >
                        Autorizar
                      </button>
                    </div>
                    {visits.length > 0 && (
                      <div className="mt-2 ml-13 flex gap-1.5 overflow-x-auto">
                        {visits.slice(0, 4).map((visit) => (
                          <span
                            key={visit.id}
                            className="shrink-0 rounded-md bg-[#eff4ff] px-2 py-0.5 text-[11px] text-[#45464d]"
                          >
                            {formatDay(visit.entryAt)}{' '}
                            {formatTime(visit.entryAt)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {tab === 'hoy' && (
        <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-md border-t border-[#c6c6cd] bg-white/95 px-4 pt-3 pb-3 shadow-[0_-8px_20px_-12px_rgba(15,23,42,0.25)] backdrop-blur">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {store.favorites.map((favorite) => (
              <button
                key={favorite.id}
                type="button"
                onClick={() => setName(favorite.name)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-xs font-medium',
                  name === favorite.name
                    ? 'border-[#0051d5] bg-[#0051d5] text-white'
                    : 'border-[#c6c6cd] bg-white'
                )}
              >
                <Avatar
                  name={favorite.name}
                  className={cn(
                    'size-6 text-[10px]',
                    name === favorite.name && 'bg-white text-[#0051d5]'
                  )}
                />
                {favorite.name.split(' ')[0]}
                <span className="opacity-60">
                  · {describeRelationship(favorite.relationship)}
                </span>
              </button>
            ))}
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              authorizeTyped();
            }}
          >
            <input
              className={cn(
                ui.input,
                'h-12 flex-1 rounded-full bg-[#f8f9ff] px-5'
              )}
              placeholder="¿A quién esperas hoy?"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button
              type="submit"
              aria-label="Autorizar para hoy"
              disabled={!name.trim()}
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#0051d5] text-white disabled:opacity-40"
            >
              <SendHorizontalIcon className="size-5" />
            </button>
          </form>
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#0051d5]"
          >
            <SlidersHorizontalIcon className="size-3.5" /> Más opciones: otra
            fecha, Evento o Servicio
          </button>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto grid h-16 max-w-md grid-cols-3 border-t border-[#c6c6cd] bg-[#131b2e] pb-[env(safe-area-inset-bottom)] text-[#bec6e0]">
        {(
          [
            ['hoy', 'Hoy', CalendarDaysIcon],
            ['historial', 'Historial', HistoryIcon],
            ['favoritos', 'Favoritos', StarIcon],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold',
              tab === key && 'text-white'
            )}
          >
            <Icon className={cn('size-5', tab === key && 'text-[#b4c5ff]')} />
            {label}
          </button>
        ))}
      </nav>

      <MockupSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Autorizar Visita"
      >
        <AuthorizeForm
          typePicker="segmented"
          initialGuest={matchingFavorite}
          favorites={store.favorites}
          submitLabel="Crear Autorización"
          onSubmit={(input) => {
            setMoreOpen(false);
            setName('');
            setPass(store.createAuthorization(input));
          }}
        />
      </MockupSheet>

      <MockupSheet
        open={Boolean(manage)}
        onClose={() => setManage(undefined)}
        title={manage ? authorizationTitle(manage) : ''}
      >
        {manage && (
          <div className="space-y-3">
            <p className="text-sm text-[#45464d]">
              {TYPE_LABELS[manage.type]} · {describeValidity(manage)} · creada
              por {manage.createdBy}
            </p>
            <button
              type="button"
              className={cn(ui.actionButton, 'w-full')}
              onClick={() => {
                setPass(manage);
                setManage(undefined);
              }}
            >
              Ver y compartir Pase
            </button>
            <button
              type="button"
              className={cn(ui.ghostButton, 'w-full')}
              onClick={() => toast('Editar queda para otra iteración')}
            >
              Editar fechas o datos
            </button>
            <button
              type="button"
              className={cn(
                ui.ghostButton,
                'w-full border-[#ffdad6] text-[#ba1a1a]'
              )}
              onClick={() => {
                store.cancelAuthorization(manage.id);
                setManage(undefined);
                toast('Autorización cancelada');
              }}
            >
              Cancelar autorización
            </button>
          </div>
        )}
      </MockupSheet>

      <MockupSheet
        open={noticesOpen}
        onClose={() => setNoticesOpen(false)}
        title="Avisos"
      >
        <NoticeList notices={store.notices} visitFor={store.visitFor} />
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
    </div>
  );
}

const groupEvents = (
  entries: Array<{
    authorization: Authorization;
    pass: { visitorName: string };
  }>
) => {
  const byId = new Map<
    string,
    { authorization: Authorization; names: Array<string> }
  >();
  for (const { authorization, pass } of entries) {
    const group = byId.get(authorization.id) ?? { authorization, names: [] };
    group.names.push(pass.visitorName);
    byId.set(authorization.id, group);
  }
  return [...byId.values()];
};

function AgendaSection({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold tracking-wider text-[#45464d] uppercase">
        {title}
        <span className="rounded-full bg-[#dce9ff] px-1.5 text-[11px]">
          {count}
        </span>
      </h2>
      <div className={cn(ui.card, 'divide-y divide-[#c6c6cd] overflow-hidden')}>
        {count === 0 ? (
          <p className="px-4 py-4 text-sm text-[#76777d]">{empty}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function ExpectedRow({
  title,
  subtitle,
  authorization,
  onOpen,
  onManage,
}: {
  title: string;
  subtitle: string;
  authorization: Authorization;
  onOpen: () => void;
  onManage: () => void;
}) {
  const Icon = TYPE_ICONS[authorization.type];
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={onOpen}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-[#76777d]">{subtitle}</p>
        </div>
      </button>
      <button
        type="button"
        aria-label="Opciones"
        className="flex size-9 items-center justify-center rounded-full text-[#76777d] hover:bg-[#eff4ff]"
        onClick={onManage}
      >
        <MoreHorizontalIcon className="size-5" />
      </button>
    </div>
  );
}

function Timeline({ visits }: { visits: Array<Visit> }) {
  const days = new Map<string, Array<Visit>>();
  for (const visit of visits) {
    const key = toIso(visit.entryAt);
    days.set(key, [...(days.get(key) ?? []), visit]);
  }
  return (
    <div className="space-y-6">
      {[...days.entries()].map(([day, dayVisits]) => (
        <section key={day}>
          <h2 className="mb-3 px-1 text-xs font-semibold tracking-wider text-[#45464d] uppercase">
            {formatDay(day)}
          </h2>
          <ol className="relative ml-3 space-y-4 border-l-2 border-[#dce9ff] pl-5">
            {dayVisits.map((visit) => (
              <li key={visit.id} className="relative">
                <span
                  className={cn(
                    'absolute top-1.5 -left-[1.72rem] size-3 rounded-full border-2 border-white',
                    visit.exitAt ? 'bg-[#76777d]' : 'bg-green-500'
                  )}
                />
                <div className={cn(ui.card, 'p-3')}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {visit.visitorName}
                    </p>
                    <span className="text-[11px] text-[#76777d]">
                      {TYPE_LABELS[visit.type]}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-[#45464d] tabular-nums">
                    <span className="flex items-center gap-1">
                      <LogInIcon className="size-3.5 text-green-600" />
                      {formatTime(visit.entryAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <LogOutIcon className="size-3.5 text-[#76777d]" />
                      {visit.exitAt ? formatTime(visit.exitAt) : 'sin salida'}
                    </span>
                    <span className="text-[#76777d]">
                      {visit.exitAt
                        ? formatElapsed(visit.entryAt, visit.exitAt)
                        : `dentro hace ${formatElapsed(visit.entryAt)}`}
                    </span>
                  </div>
                  <div className="mt-2">
                    <OriginTag visit={visit} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
