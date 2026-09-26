/*
 * PROTOTYPE, throwaway: pieces every Residente variant shares — the mockup's
 * palette, the Autorización form by type, the Pase sheet, and formatting.
 */
import type * as React from 'react';
import { useState } from 'react';

import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  HardHatIcon,
  PartyPopperIcon,
  PlusIcon,
  SendIcon,
  TimerIcon,
  UserIcon,
  XIcon,
} from 'lucide-react';

import { Sheet, SheetContent, SheetTitle, cn, toast, tw } from '@repo/ui';

import {
  type Authorization,
  type AuthorizationInput,
  type Favorite,
  type Pass,
  RELATIONSHIP_LABELS,
  type RelationshipKind,
  TYPE_LABELS,
  type Visit,
  type VisitType,
  WEEKDAY_LABELS,
  WEEKDAY_NAMES,
  addDays,
  authorizationState,
  fromIso,
  isValidToday,
  todayIso,
} from './prototype-residente.store';

/* Mockup palette (secure_access_logic DESIGN.md), kept as literal classes. */
export const ui = {
  page: tw`bg-[#f8f9ff] font-['Inter',sans-serif] text-[#0b1c30]`,
  card: tw`rounded-2xl border border-[#c6c6cd] bg-white shadow-sm`,
  label: tw`block text-sm font-medium text-[#45464d]`,
  input: tw`h-11 w-full rounded-lg border border-[#c6c6cd] bg-[#f8f9ff] px-4 text-base text-[#0b1c30] placeholder:text-[#76777d] focus:ring-2 focus:ring-[#0051d5] focus:outline-none`,
  primaryButton: tw`flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-black text-sm font-medium text-white transition-all active:scale-[0.98] disabled:opacity-40`,
  actionButton: tw`flex h-12 items-center justify-center gap-2 rounded-lg bg-[#0051d5] px-5 text-sm font-medium text-white transition-all active:scale-[0.98]`,
  ghostButton: tw`flex h-11 items-center justify-center gap-2 rounded-lg border border-[#c6c6cd] px-4 text-sm font-medium text-[#0b1c30] transition-all active:scale-[0.98]`,
  pillAction: tw`rounded-full bg-[#0051d5]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#0051d5] transition-all hover:bg-[#0051d5] hover:text-white`,
  muted: tw`text-[#76777d]`,
  title: tw`text-xl font-semibold text-[#0b1c30]`,
};

export const TYPE_ICONS: Record<VisitType, typeof TimerIcon> = {
  temporal: TimerIcon,
  evento: PartyPopperIcon,
  servicio: HardHatIcon,
};

export const formatTime = (date: Date) =>
  date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

export const formatDay = (value: Date | string) => {
  const iso =
    typeof value === 'string'
      ? value
      : `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const today = todayIso();
  if (iso === today) return 'Hoy';
  if (iso === addDays(today, -1)) return 'Ayer';
  if (iso === addDays(today, 1)) return 'Mañana';
  return fromIso(iso).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

export const formatElapsed = (from: Date, to: Date = new Date()) => {
  const minutes = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / 60_000)
  );
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

export const maskDocument = (document?: string) =>
  document ? `•••• ${document.slice(-4)}` : 'sin documento';

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export const describeValidity = (authorization: Authorization) => {
  if (authorization.type !== 'servicio')
    return formatDay(authorization.startDate);
  const days = [...authorization.weekdays]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_NAMES[day])
    .join(', ');
  return `${days} · hasta ${formatDay(authorization.endDate)}`;
};

export const authorizationTitle = (authorization: Authorization) =>
  authorization.type === 'evento'
    ? (authorization.eventName ?? 'Evento')
    : (authorization.passes[0]?.visitorName ?? '');

/** Upcoming Pases the Residente is waiting on, split by whether they could enter today. */
export const expectedPasses = (authorizations: Array<Authorization>) =>
  authorizations
    .filter((authorization) => {
      const state = authorizationState(authorization);
      return state === 'vigente' || state === 'programada';
    })
    .flatMap((authorization) =>
      authorization.passes
        .filter((pass) => pass.status === 'disponible')
        .map((pass) => ({
          authorization,
          pass,
          today: isValidToday(authorization, pass),
        }))
    );

export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full bg-[#316bf3]/20 text-sm font-semibold text-[#0051d5]',
        className
      )}
    >
      {initials(name)}
    </div>
  );
}

export function StatusChip({
  tone,
  children,
}: {
  tone: 'green' | 'amber' | 'gray' | 'blue' | 'red';
  children: React.ReactNode;
}) {
  const tones = {
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    gray: 'bg-[#dce9ff] text-[#45464d]',
    blue: 'bg-[#dbe1ff] text-[#003ea8]',
    red: 'bg-[#ffdad6] text-[#93000a]',
  };
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase',
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function OriginTag({ visit }: { visit: Visit }) {
  return visit.origin === 'pase' ? (
    <span className="rounded border border-[#c6c6cd] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#45464d] uppercase">
      Pase
    </span>
  ) : (
    <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 uppercase">
      Manual · {maskDocument(visit.document)}
    </span>
  );
}

/* ---------- Autorización form ---------- */

type Guest = { name: string; document: string };

export function AuthorizeForm({
  typePicker,
  initialType = 'temporal',
  initialGuest,
  favorites,
  submitLabel = 'Confirmar Entrada',
  onSubmit,
}: {
  typePicker: 'tiles' | 'segmented' | 'none';
  initialType?: VisitType;
  initialGuest?: Favorite;
  favorites: Array<Favorite>;
  submitLabel?: string;
  onSubmit: (input: AuthorizationInput) => void;
}) {
  const today = todayIso();
  const [type, setType] = useState<VisitType>(initialType);
  const [guests, setGuests] = useState<Array<Guest>>([
    {
      name: initialGuest?.name ?? '',
      document: initialGuest?.document ?? '',
    },
  ]);
  const [date, setDate] = useState(today);
  const [endDate, setEndDate] = useState(addDays(today, 90));
  const [weekdays, setWeekdays] = useState<Array<number>>([2, 5]);
  const [eventName, setEventName] = useState('');
  const [saveFavorite, setSaveFavorite] = useState(false);
  const [relationship, setRelationship] =
    useState<RelationshipKind>('familiar');
  const [relationshipNote, setRelationshipNote] = useState('');
  const [error, setError] = useState<string>();

  const firstGuest = guests[0] ?? { name: '', document: '' };
  const isKnownFavorite = favorites.some(
    (favorite) => favorite.name === firstGuest.name.trim()
  );

  const updateGuest = (index: number, patch: Partial<Guest>) =>
    setGuests((current) =>
      current.map((guest, i) => (i === index ? { ...guest, ...patch } : guest))
    );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const named = guests
      .map((guest) => ({
        name: guest.name.trim(),
        document: guest.document.trim() || undefined,
      }))
      .filter((guest) => guest.name);
    const validation =
      named.length === 0
        ? 'Escribe el nombre del Visitante.'
        : date < today
          ? 'La fecha no puede ser pasada.'
          : type !== 'servicio' && date > addDays(today, 90)
            ? 'Temporal y Evento se autorizan hasta 90 días hacia adelante.'
            : type === 'servicio' && endDate < date
              ? 'La fecha final debe ser posterior a la inicial.'
              : type === 'servicio' && endDate > addDays(date, 365)
                ? 'Un Servicio dura máximo 1 año; luego crea otro.'
                : type === 'servicio' && weekdays.length === 0
                  ? 'Elige al menos un día de la semana.'
                  : undefined;
    setError(validation);
    if (validation) return;
    onSubmit({
      type,
      startDate: date,
      endDate: type === 'servicio' ? endDate : date,
      weekdays: type === 'servicio' ? weekdays : [],
      eventName: type === 'evento' ? eventName.trim() || undefined : undefined,
      guests: type === 'evento' ? named : named.slice(0, 1),
      saveAsFavorite:
        saveFavorite && type !== 'evento'
          ? {
              kind: relationship,
              note:
                relationship === 'otro'
                  ? relationshipNote.trim() || undefined
                  : undefined,
            }
          : undefined,
    });
  };

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      {typePicker === 'tiles' && (
        <div className="grid grid-cols-3 gap-2">
          {(['temporal', 'evento', 'servicio'] as const).map((option) => {
            const Icon = TYPE_ICONS[option];
            const isActive = option === type;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-lg p-2.5 transition-all',
                  isActive
                    ? 'border-2 border-[#0051d5] bg-[#316bf3]/10 text-[#0051d5]'
                    : 'border border-[#c6c6cd] hover:border-[#0051d5]'
                )}
              >
                <Icon className="size-5" />
                <span className="text-sm font-medium">
                  {TYPE_LABELS[option]}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {typePicker === 'segmented' && (
        <div className="flex rounded-lg border border-[#c6c6cd] p-1">
          {(['temporal', 'evento', 'servicio'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setType(option)}
              className={cn(
                'flex-1 rounded-md py-1.5 text-xs font-semibold tracking-wide transition-all',
                option === type
                  ? 'bg-[#0051d5] text-white'
                  : 'text-[#45464d] hover:bg-[#eff4ff]'
              )}
            >
              {TYPE_LABELS[option]}
            </button>
          ))}
        </div>
      )}

      {type === 'evento' && (
        <div className="space-y-2">
          <label className={ui.label} htmlFor="event-name">
            Nombre del evento (opcional)
          </label>
          <input
            id="event-name"
            className={ui.input}
            placeholder="Ej. Cumpleaños de Sofi"
            value={eventName}
            onChange={(event) => setEventName(event.target.value)}
          />
        </div>
      )}

      {type === 'evento' ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className={ui.label}>Invitados ({guests.length})</span>
            <span className="text-xs text-[#76777d]">Un Pase por invitado</span>
          </div>
          {guests.map((guest, index) => (
            <div key={index} className="flex gap-2">
              <input
                className={cn(ui.input, 'flex-[3]')}
                placeholder={`Invitado ${index + 1}`}
                value={guest.name}
                onChange={(event) =>
                  updateGuest(index, { name: event.target.value })
                }
              />
              <input
                className={cn(ui.input, 'flex-[2] px-3')}
                placeholder="Doc. (opc.)"
                inputMode="numeric"
                value={guest.document}
                onChange={(event) =>
                  updateGuest(index, { document: event.target.value })
                }
              />
              {guests.length > 1 && (
                <button
                  type="button"
                  aria-label="Quitar invitado"
                  className="shrink-0 text-[#76777d]"
                  onClick={() =>
                    setGuests((current) =>
                      current.filter((_, i) => i !== index)
                    )
                  }
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="flex items-center gap-1 rounded-full border border-dashed border-[#0051d5] px-3 py-1 text-xs font-medium text-[#0051d5]"
              onClick={() =>
                setGuests((current) => [...current, { name: '', document: '' }])
              }
            >
              <PlusIcon className="size-3" /> Invitado
            </button>
            {favorites
              .filter(
                (favorite) =>
                  !guests.some((guest) => guest.name === favorite.name)
              )
              .map((favorite) => (
                <button
                  key={favorite.id}
                  type="button"
                  className="rounded-full bg-[#eff4ff] px-3 py-1 text-xs font-medium text-[#0b1c30]"
                  onClick={() =>
                    setGuests((current) => [
                      ...current.filter((guest) => guest.name.trim()),
                      {
                        name: favorite.name,
                        document: favorite.document ?? '',
                      },
                    ])
                  }
                >
                  + {favorite.name.split(' ')[0]}
                </button>
              ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className={ui.label} htmlFor="guest-name">
            Nombre del Invitado
          </label>
          <input
            id="guest-name"
            className={ui.input}
            placeholder="Ej. Juan Pérez"
            value={firstGuest.name}
            onChange={(event) => updateGuest(0, { name: event.target.value })}
          />
        </div>
      )}

      {type === 'servicio' ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={ui.label} htmlFor="start-date">
                Desde
              </label>
              <input
                id="start-date"
                type="date"
                className={cn(ui.input, 'px-3')}
                min={today}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className={ui.label} htmlFor="end-date">
                Hasta
              </label>
              <input
                id="end-date"
                type="date"
                className={cn(ui.input, 'px-3')}
                min={date}
                max={addDays(date, 365)}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <span className={ui.label}>Días permitidos</span>
            <div className="flex justify-between gap-1">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                const isOn = weekdays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={isOn}
                    aria-label={WEEKDAY_NAMES[day]}
                    onClick={() =>
                      setWeekdays((current) =>
                        isOn
                          ? current.filter((d) => d !== day)
                          : [...current, day]
                      )
                    }
                    className={cn(
                      'size-10 rounded-full text-sm font-semibold transition-all',
                      isOn
                        ? 'bg-[#0051d5] text-white'
                        : 'border border-[#c6c6cd] text-[#45464d]'
                    )}
                  >
                    {WEEKDAY_LABELS[day]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <label className={ui.label} htmlFor="guest-doc">
              Documento (Opcional)
            </label>
            <input
              id="guest-doc"
              className={ui.input}
              placeholder="Cédula"
              inputMode="numeric"
              value={firstGuest.document}
              onChange={(event) =>
                updateGuest(0, { document: event.target.value })
              }
            />
          </div>
        </>
      ) : (
        <div
          className={cn(
            'grid gap-4',
            type === 'evento' ? 'grid-cols-1' : 'grid-cols-2'
          )}
        >
          <div className="space-y-2">
            <label className={ui.label} htmlFor="visit-date">
              Fecha
            </label>
            <input
              id="visit-date"
              type="date"
              className={cn(ui.input, 'px-3')}
              min={today}
              max={addDays(today, 90)}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          {type === 'temporal' && (
            <div className="space-y-2">
              <label className={ui.label} htmlFor="guest-doc">
                Documento (Opcional)
              </label>
              <input
                id="guest-doc"
                className={ui.input}
                placeholder="Cédula"
                inputMode="numeric"
                value={firstGuest.document}
                onChange={(event) =>
                  updateGuest(0, { document: event.target.value })
                }
              />
            </div>
          )}
        </div>
      )}

      {type !== 'evento' && !isKnownFavorite && (
        <div className="space-y-2 rounded-lg bg-[#eff4ff] p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 accent-[#0051d5]"
              checked={saveFavorite}
              onChange={(event) => setSaveFavorite(event.target.checked)}
            />
            Guardar en Favoritos
          </label>
          {saveFavorite && (
            <div className="flex gap-2">
              <select
                className={cn(ui.input, 'flex-1 bg-white px-3')}
                value={relationship}
                onChange={(event) =>
                  setRelationship(event.target.value as RelationshipKind)
                }
              >
                {(['familiar', 'amigo', 'otro'] as const).map((kind) => (
                  <option key={kind} value={kind}>
                    {RELATIONSHIP_LABELS[kind]}
                  </option>
                ))}
              </select>
              {relationship === 'otro' && (
                <input
                  className={cn(ui.input, 'flex-1 bg-white')}
                  placeholder="Ej. Aseo"
                  value={relationshipNote}
                  onChange={(event) => setRelationshipNote(event.target.value)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-[#ffdad6] px-3 py-2 text-sm text-[#93000a]">
          {error}
        </p>
      )}

      <button type="submit" className={ui.primaryButton}>
        {submitLabel}
      </button>
    </form>
  );
}

/* ---------- Pase sheet ---------- */

/** Deterministic QR-looking grid from the token (not a real QR). */
export function FakeQr({
  token,
  className,
}: {
  token: string;
  className?: string;
}) {
  const size = 25;
  let hash = 0;
  for (const char of token) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const random = () => {
    hash = (hash * 1_103_515_245 + 12_345) >>> 0;
    return (hash >>> 16) % 2 === 0;
  };
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
  const finderOn = (x: number, y: number) => {
    const fx = x >= size - 8 ? x - (size - 7) : x;
    const fy = y >= size - 8 ? y - (size - 7) : y;
    if (fx === 7 || fy === 7 || fx < 0 || fy < 0) return false;
    const ring = Math.max(Math.abs(fx - 3), Math.abs(fy - 3));
    return ring !== 2;
  };
  const cells: Array<React.ReactNode> = [];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const on = inFinder(x, y) ? finderOn(x, y) : random();
      if (on)
        cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />);
    }
  return (
    <svg
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      className={cn('bg-white', className)}
      shapeRendering="crispEdges"
    >
      <g fill="#0b1c30">{cells}</g>
    </svg>
  );
}

const passUrl = (pass: Pass) => `${window.location.origin}/p/${pass.token}`;

const passNote = (authorization: Authorization) => {
  if (authorization.type === 'servicio')
    return `Vale ${describeValidity(authorization)}. Varios ingresos por día permitido.`;
  if (authorization.type === 'evento')
    return `Un Pase por invitado · 1 ingreso cada uno · ${formatDay(authorization.startDate)}.`;
  return `Este pase permite 1 ingreso el ${formatDay(authorization.startDate).toLowerCase()}, todo el día.`;
};

export function PassSheet({
  authorization,
  onClose,
}: {
  authorization: Authorization | undefined;
  onClose: () => void;
}) {
  const [selectedPassId, setSelectedPassId] = useState<string>();
  const pass =
    authorization?.passes.find((p) => p.id === selectedPassId) ??
    authorization?.passes[0];

  const share = (target: Pass) => {
    const text = `Hola ${target.visitorName.split(' ')[0]}, este es tu Pase para entrar a ${'Conjunto Torres del Parque'}: ${passUrl(target)}`;
    toast.success('Abriría WhatsApp (simulado)', { description: text });
  };

  return (
    <Sheet
      open={Boolean(authorization)}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedPassId(undefined);
          onClose();
        }
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-h-[calc(92dvh-3.5rem)] max-w-md gap-0 overflow-y-auto rounded-t-2xl bg-white p-0 font-['Inter',sans-serif] text-[#0b1c30] data-[side=bottom]:bottom-14"
      >
        {authorization && pass && (
          <>
            <div className="relative border-b border-[#c6c6cd] p-6 text-center">
              <button
                type="button"
                aria-label="Cerrar"
                className="absolute top-4 right-4 text-[#76777d]"
                onClick={onClose}
              >
                <XIcon className="size-5" />
              </button>
              <div className="mx-auto mb-2 flex w-fit items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                <CheckIcon className="size-3.5" /> Autorización creada
              </div>
              <SheetTitle className="text-2xl font-semibold text-black">
                Tu Pase QR
              </SheetTitle>
              <p className="text-[#45464d]">
                {TYPE_LABELS[authorization.type]} ·{' '}
                {describeValidity(authorization)}
              </p>
            </div>
            {authorization.passes.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-6 pt-4">
                {authorization.passes.map((guestPass) => (
                  <button
                    key={guestPass.id}
                    type="button"
                    onClick={() => setSelectedPassId(guestPass.id)}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1 text-xs font-medium',
                      guestPass.id === pass.id
                        ? 'bg-[#0051d5] text-white'
                        : 'bg-[#eff4ff] text-[#0b1c30]'
                    )}
                  >
                    {guestPass.visitorName.split(' ')[0]}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-col items-center space-y-5 p-6">
              <div className="rounded-xl border-2 border-[#0051d5] p-3">
                <FakeQr token={pass.token} className="size-48" />
              </div>
              <div className="text-center">
                <p className="font-medium">{pass.visitorName}</p>
                <p className="text-xs font-semibold tracking-wider text-[#76777d]">
                  /p/{pass.token.slice(0, 6)}…
                </p>
              </div>
              <div className="grid w-full grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] text-sm font-medium text-white active:scale-95"
                  onClick={() => share(pass)}
                >
                  <SendIcon className="size-4" /> WhatsApp
                </button>
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[#dce9ff] text-sm font-medium active:scale-95"
                  onClick={() => toast('Guardaría el PNG del Pase (simulado)')}
                >
                  <DownloadIcon className="size-4" /> Guardar
                </button>
              </div>
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm font-medium text-[#0051d5]"
                onClick={() => toast.success('Enlace copiado (simulado)')}
              >
                <CopyIcon className="size-4" /> Copiar enlace
              </button>
            </div>
            <div className="bg-[#316bf3]/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-center">
              <p className="text-xs text-[#003ea8]">
                {passNote(authorization)}
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Bottom sheet wrapper matching the mockup's modal look. */
export function MockupSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-h-[calc(92dvh-3.5rem)] max-w-md gap-0 overflow-y-auto rounded-t-2xl bg-white p-0 font-['Inter',sans-serif] text-[#0b1c30] data-[side=bottom]:bottom-14"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#c6c6cd] bg-white px-6 py-4">
          <SheetTitle className="text-lg font-semibold text-[#0b1c30]">
            {title}
          </SheetTitle>
          <button
            type="button"
            aria-label="Cerrar"
            className="text-[#76777d]"
            onClick={onClose}
          >
            <XIcon className="size-5" />
          </button>
        </div>
        <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-8 text-center text-sm text-[#76777d]">
      <UserIcon className="size-6" />
      {children}
    </div>
  );
}

/** Loads Inter like the mockups do; React hoists the stylesheet into <head>. */
export function MockupFonts() {
  return (
    <link
      rel="stylesheet"
      precedence="default"
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
    />
  );
}

/* ---------- Favoritos, Autorizaciones vigentes, Avisos ---------- */

export function AddFavoriteForm({
  onSubmit,
}: {
  onSubmit: (favorite: Omit<Favorite, 'id'>) => void;
}) {
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [kind, setKind] = useState<RelationshipKind>('familiar');
  const [note, setNote] = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        onSubmit({
          name: name.trim(),
          document: document.trim() || undefined,
          relationship: {
            kind,
            note: kind === 'otro' ? note.trim() || undefined : undefined,
          },
        });
      }}
    >
      <div className="space-y-2">
        <label className={ui.label} htmlFor="fav-name">
          Nombre
        </label>
        <input
          id="fav-name"
          className={ui.input}
          placeholder="Ej. Rosa Elena Gómez"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className={ui.label} htmlFor="fav-doc">
          Documento (Opcional)
        </label>
        <input
          id="fav-doc"
          className={ui.input}
          inputMode="numeric"
          placeholder="Cédula"
          value={document}
          onChange={(event) => setDocument(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <span className={ui.label}>Parentesco</span>
        <div className="grid grid-cols-3 gap-2">
          {(['familiar', 'amigo', 'otro'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setKind(option)}
              className={cn(
                'h-10 rounded-lg text-sm font-medium',
                option === kind
                  ? 'border-2 border-[#0051d5] bg-[#316bf3]/10 text-[#0051d5]'
                  : 'border border-[#c6c6cd]'
              )}
            >
              {RELATIONSHIP_LABELS[option]}
            </button>
          ))}
        </div>
        {kind === 'otro' && (
          <input
            className={ui.input}
            placeholder="¿Quién es? (opcional) Ej. Aseo, Profesor"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        )}
      </div>
      <button
        type="submit"
        className={ui.primaryButton}
        disabled={!name.trim()}
      >
        Guardar Favorito
      </button>
    </form>
  );
}

export function ActiveAuthorizations({
  authorizations,
  onOpen,
  onCancel,
}: {
  authorizations: Array<Authorization>;
  onOpen: (authorization: Authorization) => void;
  onCancel: (authorization: Authorization) => void;
}) {
  const active = authorizations.filter((authorization) => {
    const state = authorizationState(authorization);
    return state === 'vigente' || state === 'programada';
  });
  if (active.length === 0)
    return <EmptyState>No tienes autorizaciones vigentes.</EmptyState>;
  return (
    <div className="divide-y divide-[#c6c6cd]">
      {active.map((authorization) => {
        const Icon = TYPE_ICONS[authorization.type];
        const used = authorization.passes.every((p) => p.status === 'usado');
        return (
          <div key={authorization.id} className="flex items-center gap-3 py-3">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              onClick={() => onOpen(authorization)}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eff4ff] text-[#0051d5]">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {authorizationTitle(authorization)}
                </p>
                <p className="truncate text-xs text-[#76777d]">
                  {TYPE_LABELS[authorization.type]} ·{' '}
                  {describeValidity(authorization)}
                  {authorization.type === 'evento' &&
                    ` · ${authorization.passes.length} invitados`}
                  {authorization.createdBy !== 'Fernanda Ospina' &&
                    ` · por ${authorization.createdBy.split(' ')[0]}`}
                </p>
              </div>
            </button>
            {used ? (
              <StatusChip tone="gray">Usada</StatusChip>
            ) : (
              <button
                type="button"
                className="shrink-0 text-xs font-semibold text-[#ba1a1a]"
                onClick={() => onCancel(authorization)}
              >
                Cancelar
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function NoticeList({
  notices,
  visitFor,
}: {
  notices: Array<{ id: string; visitId: string; at: Date; read: boolean }>;
  visitFor: (notice: {
    id: string;
    visitId: string;
    at: Date;
    read: boolean;
  }) => Visit | undefined;
}) {
  if (notices.length === 0)
    return (
      <EmptyState>
        Aquí verás cada Ingreso a tu Apartamento. Usa “+ Ingreso” en la barra
        del prototipo.
      </EmptyState>
    );
  return (
    <div className="divide-y divide-[#c6c6cd]">
      {notices.map((notice) => {
        const visit = visitFor(notice);
        if (!visit) return null;
        return (
          <div key={notice.id} className="flex items-start gap-3 py-3">
            <div className="relative">
              <Avatar name={visit.visitorName} />
              {!notice.read && (
                <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-[#0051d5]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-semibold">{visit.visitorName}</span>{' '}
                ingresó a la unidad
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#76777d]">
                {formatTime(visit.entryAt)} · {TYPE_LABELS[visit.type]}{' '}
                <OriginTag visit={visit} />
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
