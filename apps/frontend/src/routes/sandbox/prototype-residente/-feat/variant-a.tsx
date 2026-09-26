/*
 * PROTOTYPE, throwaway. Variant A — "Mockup fiel": the mobile
 * `panel_del_residente` mockup as drawn: one scrolling home with the quick-pass
 * hero, the inline Autorizar form, Favoritos list and Historial reciente, plus
 * bottom tabs. The aviso de llegada is a banner under the header and a bell badge.
 */
import { useEffect, useState } from 'react';

import {
  BellIcon,
  FilterIcon,
  HistoryIcon,
  HomeIcon,
  QrCodeIcon,
  SearchIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UserRoundIcon,
  UsersIcon,
} from 'lucide-react';

import { cn, toast } from '@repo/ui';

import {
  ActiveAuthorizations,
  AddFavoriteForm,
  AuthorizeForm,
  Avatar,
  EmptyState,
  MockupSheet,
  NoticeList,
  OriginTag,
  PassSheet,
  StatusChip,
  expectedPasses,
  formatDay,
  formatTime,
  ui,
} from './prototype-residente.shared';
import {
  type Authorization,
  type Favorite,
  RESIDENT,
  TYPE_LABELS,
  type Visit,
  describeRelationship,
  useResident,
} from './prototype-residente.store';

type Tab = 'inicio' | 'visitantes' | 'historial' | 'ajustes';

export function VariantA() {
  const store = useResident();
  const [tab, setTab] = useState<Tab>('inicio');
  const [pass, setPass] = useState<Authorization>();
  const [quickOpen, setQuickOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [addFavoriteOpen, setAddFavoriteOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const unread = store.notices.filter((notice) => !notice.read).length;
  const latest = store.notices[0];
  const [dismissedId, setDismissedId] = useState<string>();
  useEffect(() => {
    if (!latest) return;
    navigator.vibrate?.(200);
    const timer = setTimeout(() => setDismissedId(latest.id), 7000);
    return () => clearTimeout(timer);
  }, [latest]);
  const bannerVisit =
    latest && dismissedId !== latest.id ? store.visitFor(latest) : undefined;

  const authorizeFavorite = (favorite: Favorite) =>
    setPass(store.authorizeToday(favorite));

  return (
    <div className={cn(ui.page, 'relative mx-auto min-h-full max-w-md pb-28')}>
      <header className="fixed inset-x-0 top-0 z-40 mx-auto flex h-16 max-w-md items-center justify-between border-b border-[#c6c6cd] bg-[#f8f9ff] px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Avatar
            name={RESIDENT.name}
            className="border border-[#c6c6cd] bg-[#131b2e] text-white"
          />
          <span className="text-lg font-semibold text-black">
            Apto 402 - Visit Pass
          </span>
        </div>
        <button
          type="button"
          aria-label="Avisos"
          className="relative flex size-10 items-center justify-center rounded-full text-[#45464d] hover:bg-[#eff4ff]"
          onClick={() => {
            setNoticesOpen(true);
            store.markNoticesRead();
          }}
        >
          <BellIcon className="size-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-[#ba1a1a] text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>
      </header>

      {bannerVisit && (
        <button
          type="button"
          onClick={() => {
            if (latest) setDismissedId(latest.id);
            setTab('historial');
          }}
          className="fixed inset-x-0 top-[4.5rem] z-40 mx-auto flex w-[calc(100%-2rem)] max-w-[calc(28rem-2rem)] animate-in items-center gap-3 rounded-xl border border-green-300 bg-white p-3 text-left shadow-lg duration-300 fade-in slide-in-from-top-4"
        >
          <div className="h-10 w-1 rounded-full bg-green-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Llegó {bannerVisit.visitorName}
            </p>
            <p className="text-xs text-[#76777d]">
              Ingreso {formatTime(bannerVisit.entryAt)} ·{' '}
              {bannerVisit.origin === 'pase' ? 'con Pase' : 'registro manual'}
            </p>
          </div>
          <StatusChip tone="green">Entró</StatusChip>
        </button>
      )}

      <main className="space-y-6 px-4 pt-20">
        {tab === 'inicio' && (
          <>
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0051d5] to-[#316bf3] p-6 text-white shadow-lg">
              <div className="relative z-10 space-y-4">
                <div>
                  <h2 className="mb-1 text-xl font-semibold">
                    Generar Pase Rápido
                  </h2>
                  <p className="max-w-sm opacity-90">
                    Crea un código QR instantáneo para tus invitados y
                    compártelo directamente por WhatsApp.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-[#f8f9ff] px-6 py-2 text-sm font-medium text-[#0051d5] transition-all active:scale-90"
                >
                  <QrCodeIcon className="size-5" /> Generar QR
                </button>
              </div>
              <ShieldCheckIcon className="absolute -right-8 -bottom-8 size-40 opacity-10" />
            </section>

            <section className={cn(ui.card, 'p-6')}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className={ui.title}>Autorizar Visita</h3>
                <UserPlusIcon className="size-5 text-[#76777d]" />
              </div>
              <AuthorizeForm
                key={formKey}
                typePicker="tiles"
                favorites={store.favorites}
                submitLabel="Confirmar Entrada"
                onSubmit={(input) => {
                  setPass(store.createAuthorization(input));
                  setFormKey((key) => key + 1);
                }}
              />
            </section>

            <section className={cn(ui.card, 'p-6')}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className={ui.title}>Visitantes Favoritos</h3>
                <button
                  type="button"
                  className="text-sm font-medium text-[#0051d5]"
                  onClick={() => setTab('visitantes')}
                >
                  Ver todos
                </button>
              </div>
              <div className="space-y-2">
                {store.favorites.slice(0, 3).map((favorite) => (
                  <FavoriteRow
                    key={favorite.id}
                    favorite={favorite}
                    onAuthorize={() => authorizeFavorite(favorite)}
                  />
                ))}
              </div>
            </section>

            <section className={cn(ui.card, 'overflow-hidden')}>
              <div className="flex items-center justify-between border-b border-[#c6c6cd] p-6">
                <h3 className={ui.title}>Historial Reciente</h3>
                <div className="flex gap-2 text-[#76777d]">
                  <FilterIcon className="size-5" />
                  <SearchIcon className="size-5" />
                </div>
              </div>
              <RecentHistory limit={5} />
              <div className="p-4 text-center">
                <button
                  type="button"
                  className="text-sm font-medium text-[#0051d5] hover:underline"
                  onClick={() => setTab('historial')}
                >
                  Ver historial completo
                </button>
              </div>
            </section>
          </>
        )}

        {tab === 'visitantes' && (
          <>
            <section className={cn(ui.card, 'p-6')}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className={ui.title}>Visitantes Favoritos</h3>
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm font-medium text-[#0051d5]"
                  onClick={() => setAddFavoriteOpen(true)}
                >
                  <UserPlusIcon className="size-4" /> Agregar
                </button>
              </div>
              <div className="space-y-2">
                {store.favorites.map((favorite) => (
                  <FavoriteRow
                    key={favorite.id}
                    favorite={favorite}
                    showLastVisit
                    onAuthorize={() => authorizeFavorite(favorite)}
                  />
                ))}
              </div>
            </section>
            <section className={cn(ui.card, 'p-6')}>
              <h3 className={cn(ui.title, 'mb-2')}>Autorizaciones vigentes</h3>
              <ActiveAuthorizations
                authorizations={store.authorizations}
                onOpen={setPass}
                onCancel={(authorization) => {
                  store.cancelAuthorization(authorization.id);
                  toast('Autorización cancelada');
                }}
              />
            </section>
          </>
        )}

        {tab === 'historial' && (
          <section className={cn(ui.card, 'overflow-hidden')}>
            <div className="border-b border-[#c6c6cd] p-6">
              <h3 className={ui.title}>Historial de Visitas</h3>
              <p className="text-sm text-[#76777d]">
                Todas las Visitas a {RESIDENT.apartment}
              </p>
            </div>
            <FullHistory visits={store.visits} />
          </section>
        )}

        {tab === 'ajustes' && (
          <section className={cn(ui.card, 'p-6 text-sm text-[#45464d]')}>
            Ajustes quedan fuera de este prototipo.
          </section>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-center justify-around border-t border-[#c6c6cd] bg-[#f8f9ff] px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-lg">
        {(
          [
            ['inicio', 'Inicio', HomeIcon],
            ['visitantes', 'Visitantes', UsersIcon],
            ['historial', 'Historial', HistoryIcon],
            ['ajustes', 'Ajustes', SettingsIcon],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'flex flex-col items-center justify-center rounded-full px-4 py-1 transition-transform active:scale-90',
              tab === key
                ? 'bg-[#316bf3] text-white'
                : 'text-[#45464d] hover:bg-[#dce9ff]'
            )}
          >
            <Icon className="size-5" />
            <span className="text-xs font-semibold tracking-wide">{label}</span>
          </button>
        ))}
      </nav>

      <PassSheet authorization={pass} onClose={() => setPass(undefined)} />
      <MockupSheet
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        title="Pase rápido para hoy"
      >
        <QuickPassForm
          onSubmit={(name) => {
            setQuickOpen(false);
            setPass(
              store.authorizeToday({
                id: 'quick',
                name,
                relationship: { kind: 'otro' },
              })
            );
          }}
        />
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
    </div>
  );
}

function FavoriteRow({
  favorite,
  showLastVisit,
  onAuthorize,
}: {
  favorite: Favorite;
  showLastVisit?: boolean;
  onAuthorize: () => void;
}) {
  const store = useResident();
  const lastVisit = store.visits.find(
    (visit) => visit.visitorName === favorite.name
  );
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-[#c6c6cd] p-2 transition-all hover:bg-[#eff4ff]">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#316bf3]/30 text-[#0051d5]">
          <UserRoundIcon className="size-5 fill-current" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{favorite.name}</p>
          <p className="truncate text-[11px] text-[#76777d]">
            {describeRelationship(favorite.relationship)}
            {showLastVisit &&
              (lastVisit
                ? ` · última visita ${formatDay(lastVisit.entryAt).toLowerCase()}`
                : ' · sin visitas')}
          </p>
        </div>
      </div>
      <button type="button" className={ui.pillAction} onClick={onAuthorize}>
        Autorizar
      </button>
    </div>
  );
}

function RecentHistory({ limit }: { limit: number }) {
  const store = useResident();
  const open = store.visits.filter((visit) => !visit.exitAt);
  const expected = expectedPasses(store.authorizations).filter(
    (entry) => entry.today
  );
  const closed = store.visits.filter((visit) => visit.exitAt);
  const rows = [
    ...open.map((visit) => ({
      key: visit.id,
      bar: 'bg-green-500',
      name: visit.visitorName,
      detail: `Entrada: ${formatTime(visit.entryAt)} • ${formatDay(visit.entryAt)}`,
      chip: <StatusChip tone="green">Entró</StatusChip>,
    })),
    ...expected.map(({ pass, authorization }) => ({
      key: pass.id,
      bar: 'bg-amber-400',
      name: pass.visitorName,
      detail: `Esperado: ${TYPE_LABELS[authorization.type]} • Hoy`,
      chip: <StatusChip tone="amber">Pendiente</StatusChip>,
    })),
    ...closed.map((visit) => ({
      key: visit.id,
      bar: 'bg-[#76777d]',
      name: visit.visitorName,
      detail: `Salida: ${formatTime(visit.exitAt ?? visit.entryAt)} • ${formatDay(visit.entryAt)}`,
      chip: <StatusChip tone="gray">Finalizado</StatusChip>,
    })),
  ].slice(0, limit);
  return (
    <div className="divide-y divide-[#c6c6cd]">
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-[#eff4ff]"
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className={cn('h-10 w-1 shrink-0 rounded-full', row.bar)} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.name}</p>
              <p className="text-xs text-[#76777d]">{row.detail}</p>
            </div>
          </div>
          {row.chip}
        </div>
      ))}
    </div>
  );
}

function FullHistory({ visits }: { visits: Array<Visit> }) {
  if (visits.length === 0) return <EmptyState>Sin visitas aún.</EmptyState>;
  return (
    <div className="divide-y divide-[#c6c6cd]">
      {visits.map((visit) => (
        <div key={visit.id} className="space-y-1.5 px-6 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{visit.visitorName}</p>
            {visit.exitAt ? (
              <StatusChip tone="gray">Finalizado</StatusChip>
            ) : (
              <StatusChip tone="green">Entró</StatusChip>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#45464d]">
            <span>{formatDay(visit.entryAt)}</span>
            <span>Ingreso {formatTime(visit.entryAt)}</span>
            <span>Salida {visit.exitAt ? formatTime(visit.exitAt) : '—'}</span>
            <span className="text-[#76777d]">{TYPE_LABELS[visit.type]}</span>
            <OriginTag visit={visit} />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickPassForm({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim()) onSubmit(name.trim());
      }}
    >
      <p className="text-sm text-[#45464d]">
        Pase Temporal para hoy, válido todo el día y un solo ingreso.
      </p>
      <div className="space-y-2">
        <label className={ui.label} htmlFor="quick-name">
          Nombre del Invitado
        </label>
        <input
          id="quick-name"
          autoFocus
          className={ui.input}
          placeholder="Ej. Juan Pérez"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <button type="submit" className={cn(ui.actionButton, 'w-full')}>
        <QrCodeIcon className="size-5" /> Generar QR
      </button>
    </form>
  );
}
