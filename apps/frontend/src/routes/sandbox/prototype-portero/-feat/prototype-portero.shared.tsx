/*
 * PROTOTYPE, throwaway: pieces every Portero variant shares — the mockup's
 * palette, the scan result, the Registro manual form, "Visitantes dentro",
 * the Turno breakdown and history, and the Aviso de privacidad.
 */
import type * as React from 'react';
import { useState } from 'react';

import {
  AlertTriangleIcon,
  BanIcon,
  CheckCircle2Icon,
  ClockIcon,
  DownloadIcon,
  HardHatIcon,
  InfoIcon,
  KeyboardIcon,
  LogOutIcon,
  MailIcon,
  MoreVerticalIcon,
  PartyPopperIcon,
  SearchIcon,
  ShieldIcon,
  TimerIcon,
  UserPlusIcon,
  XCircleIcon,
} from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetTitle,
  Switch,
  cn,
  toast,
  tw,
} from '@repo/ui';

import {
  APARTMENTS,
  DOC_TYPE_LABELS,
  type DocType,
  type ManualEntryInput,
  type Pass,
  REJECT_COPY,
  type Rejection,
  type ScanOutcome,
  type Shift,
  TYPE_LABELS,
  UNIT,
  type Visit,
  type VisitType,
  WEEKDAY_LABELS,
  apartmentLabel,
  apartmentShort,
  todayIso,
  useNow,
  usePortero,
} from './prototype-portero.store';

/* Mockup palette (secure_access_logic DESIGN.md), kept as literal classes. */
export const ui = {
  page: tw`bg-[#f8f9ff] font-['Inter',sans-serif] text-[#0b1c30]`,
  card: tw`rounded-xl border border-[#c6c6cd] bg-white shadow-sm`,
  label: tw`block text-sm font-medium text-[#45464d]`,
  input: tw`h-12 w-full rounded-lg border border-[#c6c6cd] bg-[#f8f9ff] px-4 text-base text-[#0b1c30] placeholder:text-[#76777d] focus:ring-2 focus:ring-[#0051d5] focus:outline-none`,
  primaryButton: tw`flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-black text-base font-medium text-white transition-all active:scale-[0.98] disabled:opacity-40`,
  actionButton: tw`flex h-12 items-center justify-center gap-2 rounded-lg bg-[#0051d5] px-5 text-base font-medium text-white transition-all active:scale-[0.98] disabled:opacity-40`,
  ghostButton: tw`flex h-12 items-center justify-center gap-2 rounded-lg border border-[#c6c6cd] bg-white px-4 text-base font-medium text-[#45464d] transition-all active:scale-[0.98]`,
  muted: tw`text-[#76777d]`,
  overline: tw`text-xs font-semibold tracking-wider text-[#45464d] uppercase`,
};

export const TYPE_ICONS: Record<VisitType, typeof TimerIcon> = {
  temporal: TimerIcon,
  evento: PartyPopperIcon,
  servicio: HardHatIcon,
};

export const formatTime = (date: Date) =>
  date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

export const formatShortDate = (date: Date) =>
  date.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

export const formatElapsed = (from: Date, to: Date = new Date()) => {
  const minutes = Math.max(
    0,
    Math.floor((to.getTime() - from.getTime()) / 60_000)
  );
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

export const formatClock = (from: Date, to: Date) => {
  const seconds = Math.max(
    0,
    Math.floor((to.getTime() - from.getTime()) / 1000)
  );
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
};

export const formatDocument = (docType?: DocType, document?: string) => {
  if (!document) return 'Sin documento';
  const grouped = /^\d+$/.test(document)
    ? Number(document).toLocaleString('es-CO')
    : document;
  return `${docType ?? ''} ${grouped}`.trim();
};

export const maskDocument = (document?: string) =>
  document ? `••••${document.slice(-4)}` : 'sin documento';

export const formatCode = (code?: string) =>
  code ? `VP-${code.slice(0, 3)} ${code.slice(3)}` : '—';

export const isPreviousDay = (date: Date) =>
  date.toDateString() !== new Date().toDateString();

const formatIsoDay = (iso: string) => {
  if (iso === todayIso()) return 'Hoy';
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

export const describeValidity = (pass: Pass) => {
  if (pass.type !== 'servicio') return formatIsoDay(pass.validFrom);
  const days = [...(pass.weekdays ?? [])]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((day) => WEEKDAY_LABELS[day])
    .join(' ');
  return `${days} · hasta ${formatIsoDay(pass.validTo)}`;
};

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export function MockupFonts() {
  return (
    <link
      rel="stylesheet"
      precedence="default"
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
    />
  );
}

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
        'flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#e5eeff] text-sm font-semibold text-[#0051d5]',
        className
      )}
    >
      {initials(name)}
    </div>
  );
}

export function OriginTag({ visit }: { visit: Visit }) {
  if (visit.origin === 'pase')
    return (
      <span className="rounded border border-[#c6c6cd] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#45464d] uppercase">
        Pase{visit.medium === 'codigo' ? ' · código' : ''}
      </span>
    );
  return (
    <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 uppercase">
      Manual{visit.forcedFrom ? ' · forzado' : ''}
    </span>
  );
}

/* ---------- Escáner simulado ---------- */

/**
 * Fake camera frame. The prototype cannot read a real QR, so a picker below
 * it (fuchsia, clearly not part of the design) simulates each reading.
 */
export function Viewfinder({
  className,
  locked,
  children,
}: {
  className?: string;
  locked?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-[radial-gradient(ellipse_at_center,#2a3a55_0%,#0b1220_75%)]',
        className
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative aspect-square w-[62%] max-w-72">
          {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
            <span
              key={corner}
              className={cn(
                'absolute size-9 border-[#4edea3]',
                corner === 'tl' &&
                  'top-0 left-0 rounded-tl-xl border-t-4 border-l-4',
                corner === 'tr' &&
                  'top-0 right-0 rounded-tr-xl border-t-4 border-r-4',
                corner === 'bl' &&
                  'bottom-0 left-0 rounded-bl-xl border-b-4 border-l-4',
                corner === 'br' &&
                  'right-0 bottom-0 rounded-br-xl border-r-4 border-b-4'
              )}
            />
          ))}
          {!locked && (
            <span className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse bg-[#4edea3] shadow-[0_0_12px_#4edea3]" />
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export function DemoPassPicker({
  onPick,
  className,
}: {
  onPick: (token: string) => void;
  className?: string;
}) {
  const { passes } = usePortero();
  return (
    <div
      className={cn(
        'rounded-xl border-2 border-dashed border-fuchsia-400 bg-fuchsia-50/95 p-2 text-fuchsia-950',
        className
      )}
    >
      <p className="px-1 pb-1.5 text-[10px] font-bold tracking-wider uppercase">
        Prototipo · simular lectura de QR
      </p>
      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
        {passes.map((pass) => (
          <button
            key={pass.token}
            type="button"
            className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-left text-xs hover:bg-fuchsia-100"
            onClick={() => onPick(pass.token)}
          >
            <span className="font-medium">{pass.demoLabel}</span>
            <span className="shrink-0 font-mono text-[10px] text-fuchsia-700">
              {pass.code ?? 'sin código'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** "Digitar código": numeric keypad, 6 digits, ignores VP, spaces and dashes. */
export function CodeEntry({
  onSubmit,
  dark,
  autoFocus,
  className,
}: {
  onSubmit: (code: string) => void;
  dark?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState('');
  const digits = value.replace(/vp/gi, '').replace(/\D/g, '').slice(0, 6);
  const isComplete = digits.length === 6;
  return (
    <form
      className={cn('flex gap-2', className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (!isComplete) return;
        onSubmit(digits);
        setValue('');
      }}
    >
      <label
        className={cn(
          'flex h-12 flex-1 items-center gap-2 rounded-lg border px-3 focus-within:ring-2 focus-within:ring-[#0051d5]',
          dark
            ? 'border-white/15 bg-white/5 text-white'
            : 'border-[#c6c6cd] bg-white text-[#0b1c30]'
        )}
      >
        <KeyboardIcon
          className={cn('size-5', dark ? 'text-white/50' : 'text-[#76777d]')}
        />
        <span
          className={cn(
            'font-mono text-base font-semibold',
            dark ? 'text-white/50' : 'text-[#76777d]'
          )}
        >
          VP-
        </span>
        <input
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- prototype
          autoFocus={autoFocus}
          inputMode="numeric"
          autoComplete="off"
          aria-label="Código del Pase"
          placeholder="482 913"
          value={
            digits.length > 3
              ? `${digits.slice(0, 3)} ${digits.slice(3)}`
              : digits
          }
          onChange={(event) => setValue(event.target.value)}
          className={cn(
            'w-full min-w-0 bg-transparent font-mono text-lg font-semibold tracking-widest outline-none',
            dark ? 'placeholder:text-white/25' : 'placeholder:text-[#c6c6cd]'
          )}
        />
      </label>
      <button
        type="submit"
        disabled={!isComplete}
        className={cn(ui.actionButton, 'px-4')}
      >
        Validar
      </button>
    </form>
  );
}

/* ---------- Resultado del escaneo ---------- */

export const outcomeTone = (outcome: ScanOutcome) => {
  if (outcome.kind === 'valido') return 'green' as const;
  if (outcome.kind === 'dentro') return 'blue' as const;
  return 'red' as const;
};

export const TONE_BG = {
  green: 'bg-[#00794f]',
  blue: 'bg-[#0051d5]',
  red: 'bg-[#ba1a1a]',
} as const;

export const outcomeHeadline = (outcome: ScanOutcome) => {
  if (outcome.kind === 'valido')
    return {
      title: 'Pase válido',
      detail: 'Coteje el documento y registre el Ingreso.',
    };
  if (outcome.kind === 'dentro')
    return {
      title: 'Visitante dentro',
      detail: `Ingresó ${isPreviousDay(outcome.visit.entryAt) ? formatShortDate(outcome.visit.entryAt) + ' ' : ''}a las ${formatTime(outcome.visit.entryAt)} · registre su Salida`,
    };
  return REJECT_COPY[outcome.reason];
};

export function OutcomeIcon({
  outcome,
  className,
}: {
  outcome: ScanOutcome;
  className?: string;
}) {
  if (outcome.kind === 'valido')
    return <CheckCircle2Icon className={className} />;
  if (outcome.kind === 'dentro') return <LogOutIcon className={className} />;
  return <XCircleIcon className={className} />;
}

export function PassDetails({
  pass,
  showDocument,
}: {
  pass: Pass;
  showDocument?: boolean;
}) {
  const TypeIcon = TYPE_ICONS[pass.type];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div className="col-span-2">
        <dt className={ui.overline}>Visitante</dt>
        <dd className="text-2xl font-semibold text-black">
          {pass.visitorName}
        </dd>
      </div>
      <div>
        <dt className={ui.overline}>Apartamento</dt>
        <dd className="text-xl font-semibold text-[#0051d5]">
          {apartmentLabel(pass.apartmentId)}
        </dd>
      </div>
      <div>
        <dt className={ui.overline}>Tipo</dt>
        <dd className="flex items-center gap-1.5 font-medium">
          <TypeIcon className="size-4 text-[#45464d]" />
          {TYPE_LABELS[pass.type]}
          {pass.eventName ? ` · ${pass.eventName}` : ''}
        </dd>
      </div>
      <div>
        <dt className={ui.overline}>Autorizado por</dt>
        <dd className="font-medium">{pass.authorizedBy}</dd>
      </div>
      <div>
        <dt className={ui.overline}>Vale</dt>
        <dd className="font-medium">{describeValidity(pass)}</dd>
      </div>
      {showDocument && pass.document && (
        <div className="col-span-2">
          <dt className={ui.overline}>Documento</dt>
          <dd className="font-mono text-lg font-semibold">
            {formatDocument(pass.docType, pass.document)}
          </dd>
        </div>
      )}
      <div className="col-span-2 text-xs text-[#76777d]">
        Código {formatCode(pass.code)}
        {pass.usedAt ? ` · Ingreso ${formatTime(pass.usedAt)}` : ''}
      </div>
    </dl>
  );
}

function DocumentFields({
  docType,
  document,
  onDocType,
  onDocument,
  optional,
}: {
  docType: DocType;
  document: string;
  onDocType: (value: DocType) => void;
  onDocument: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <div>
      <span className={ui.label}>
        Documento{' '}
        {optional && (
          <span className="font-normal text-[#76777d]">(opcional)</span>
        )}
      </span>
      <div className="mt-1.5 flex gap-2">
        <select
          aria-label="Tipo de documento"
          value={docType}
          onChange={(event) => onDocType(event.target.value as DocType)}
          className={cn(ui.input, 'w-24 shrink-0 px-2')}
        >
          {(Object.keys(DOC_TYPE_LABELS) as Array<DocType>).map((type) => (
            <option key={type} value={type} title={DOC_TYPE_LABELS[type]}>
              {type === 'PAS' ? 'Pas.' : type}
            </option>
          ))}
        </select>
        <input
          inputMode={docType === 'PAS' ? 'text' : 'numeric'}
          placeholder="Número de documento"
          value={document}
          onChange={(event) => onDocument(event.target.value)}
          className={ui.input}
        />
      </div>
    </div>
  );
}

/**
 * The body of a scan result: status header, Pase data and the next action.
 * Variants choose the container (page, flash overlay, bottom sheet).
 */
export function ScanResultBody({
  outcome,
  onDone,
  onManual,
  headerClassName,
}: {
  outcome: ScanOutcome;
  onDone: () => void;
  onManual: (prefill: Partial<ManualEntryInput>) => void;
  headerClassName?: string;
}) {
  const store = usePortero();
  const tone = outcomeTone(outcome);
  const headline = outcomeHeadline(outcome);
  const pass = outcome.pass;
  const [docType, setDocType] = useState<DocType>('CC');
  const [document, setDocument] = useState('');
  const [plate, setPlate] = useState('');
  const needsDocument = outcome.kind === 'valido' && !pass?.document;
  const canRegister = !needsDocument || document.trim().length >= 5;
  const canForce =
    outcome.kind === 'rechazado' && outcome.reason !== 'no-valido' && pass;

  const registerEntry = () => {
    if (outcome.kind !== 'valido') return;
    const visit = store.registerPassEntry(outcome.pass, {
      docType: needsDocument ? docType : undefined,
      document: needsDocument ? document.trim() : undefined,
      plate: plate.trim() || undefined,
      medium: outcome.medium,
    });
    toast.success(`Ingreso registrado: ${visit.visitorName}`, {
      description: `${apartmentLabel(visit.apartmentId)} · ${formatTime(visit.entryAt)}`,
    });
    onDone();
  };

  const registerExit = (thenReenter: boolean) => {
    if (outcome.kind !== 'dentro') return;
    store.registerExit(outcome.visit.id);
    if (thenReenter) {
      store.registerPassEntry(outcome.pass, { medium: outcome.medium });
      toast.success(
        `Salida pendiente e Ingreso registrados: ${outcome.pass.visitorName}`
      );
    } else {
      toast(`Salida registrada: ${outcome.pass.visitorName}`, {
        description: `Dentro ${formatElapsed(outcome.visit.entryAt)}`,
      });
    }
    onDone();
  };

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          'flex items-center gap-3 px-5 py-5 text-white',
          TONE_BG[tone],
          headerClassName
        )}
      >
        <OutcomeIcon outcome={outcome} className="size-10 shrink-0" />
        <div>
          <p className="text-2xl leading-tight font-bold">{headline.title}</p>
          <p className="text-sm text-white/85">{headline.detail}</p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {pass && outcome.kind !== 'rechazado' && (
          <PassDetails pass={pass} showDocument />
        )}
        {pass && canForce && <PassDetails pass={pass} />}
        {outcome.kind === 'rechazado' && outcome.reason === 'no-valido' && (
          <p className="rounded-lg bg-[#eff4ff] p-3 text-sm text-[#45464d]">
            No se muestran datos: el código no corresponde a ningún Pase de{' '}
            {UNIT.name}.
          </p>
        )}

        {outcome.kind === 'valido' && (
          <>
            {needsDocument && (
              <div className="space-y-1.5">
                <DocumentFields
                  docType={docType}
                  document={document}
                  onDocType={setDocType}
                  onDocument={setDocument}
                />
                <p className="text-xs text-[#45464d]">
                  El Residente no registró el documento. Cópielo de la cédula
                  física.
                </p>
              </div>
            )}
            <label className="block">
              <span className={ui.label}>
                Placa{' '}
                <span className="font-normal text-[#76777d]">(opcional)</span>
              </span>
              <input
                value={plate}
                onChange={(event) => setPlate(event.target.value.toUpperCase())}
                placeholder="ABC-123"
                className={cn(
                  ui.input,
                  'mt-1.5 font-mono tracking-widest uppercase'
                )}
              />
            </label>
            <div className="space-y-2">
              <button
                type="button"
                className={ui.primaryButton}
                disabled={!canRegister}
                onClick={registerEntry}
              >
                <UserPlusIcon className="size-5" /> Registrar ingreso
              </button>
              <button
                type="button"
                className={cn(ui.ghostButton, 'w-full')}
                onClick={onDone}
              >
                Cancelar
              </button>
            </div>
          </>
        )}

        {outcome.kind === 'dentro' && (
          <div className="space-y-2">
            <button
              type="button"
              className={ui.primaryButton}
              onClick={() => registerExit(false)}
            >
              <LogOutIcon className="size-5" /> Registrar salida
            </button>
            {outcome.canReenter && (
              <button
                type="button"
                className={cn(ui.ghostButton, 'w-full text-sm')}
                onClick={() => registerExit(true)}
              >
                Salió sin registrar: registrar salida pendiente e ingresar
              </button>
            )}
            <button
              type="button"
              className={cn(ui.ghostButton, 'w-full')}
              onClick={onDone}
            >
              Cancelar
            </button>
          </div>
        )}

        {outcome.kind === 'rechazado' && (
          <div className="space-y-2">
            {canForce && (
              <button
                type="button"
                className={ui.primaryButton}
                onClick={() =>
                  onManual({
                    visitorName: pass.visitorName,
                    docType: pass.docType,
                    document: pass.document,
                    apartmentId: pass.apartmentId,
                    type: pass.type,
                    passToken: pass.token,
                    forcedFrom: outcome.reason,
                  })
                }
              >
                <UserPlusIcon className="size-5" /> Registrar manualmente
              </button>
            )}
            <button
              type="button"
              className={cn(ui.ghostButton, 'w-full')}
              onClick={onDone}
            >
              Volver a escanear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Registro manual ---------- */

export function ManualEntryForm({
  prefill,
  onDone,
  onCancel,
}: {
  prefill?: Partial<ManualEntryInput>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const store = usePortero();
  const [visitorName, setVisitorName] = useState(prefill?.visitorName ?? '');
  const [minor, setMinor] = useState(false);
  const [docType, setDocType] = useState<DocType>(prefill?.docType ?? 'CC');
  const [document, setDocument] = useState(prefill?.document ?? '');
  const [apartmentId, setApartmentId] = useState(prefill?.apartmentId ?? '');
  const [type, setType] = useState<VisitType>(prefill?.type ?? 'temporal');
  const [plate, setPlate] = useState('');
  const apartment = APARTMENTS.find(
    (candidate) => candidate.id === apartmentId
  );
  const hasDocument = document.trim().length >= 5;
  const canSubmit =
    visitorName.trim().length >= 3 &&
    apartmentId !== '' &&
    (minor || hasDocument);
  const groups = [...new Set(APARTMENTS.map((candidate) => candidate.group))];

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;
        const visit = store.registerManualEntry({
          visitorName: visitorName.trim(),
          minor,
          docType: hasDocument ? docType : undefined,
          document: hasDocument ? document.trim() : undefined,
          apartmentId,
          type,
          plate: minor ? undefined : plate.trim() || undefined,
          passToken: prefill?.passToken,
          forcedFrom: prefill?.forcedFrom,
        });
        toast.success(`Ingreso manual registrado: ${visit.visitorName}`, {
          description: `${apartmentLabel(visit.apartmentId)} · ${formatTime(visit.entryAt)}`,
        });
        onDone();
      }}
    >
      <div>
        <span
          className={cn(
            'inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase',
            prefill?.forcedFrom
              ? 'bg-[#ffdad6] text-[#93000a]'
              : 'bg-[#dce9ff] text-[#003ea8]'
          )}
        >
          {prefill?.forcedFrom
            ? `Ingreso forzado · ${REJECT_COPY[prefill.forcedFrom].title}`
            : 'No pre-autorizado'}
        </span>
      </div>

      <label className="block">
        <span className={ui.label}>Nombre completo</span>
        <input
          value={visitorName}
          onChange={(event) => setVisitorName(event.target.value)}
          placeholder="Ej. Juan Pérez"
          className={cn(ui.input, 'mt-1.5')}
        />
      </label>

      <label className="flex items-center justify-between gap-3 rounded-lg border border-[#c6c6cd] bg-white px-4 py-3">
        <span>
          <span className="block text-sm font-medium">Menor de edad</span>
          <span className="block text-xs text-[#76777d]">
            Documento opcional; sin placa.
          </span>
        </span>
        <Switch checked={minor} onCheckedChange={setMinor} />
      </label>

      <DocumentFields
        docType={docType}
        document={document}
        onDocType={setDocType}
        onDocument={setDocument}
        optional={minor}
      />

      <label className="block">
        <span className={ui.label}>Apartamento destino</span>
        <select
          value={apartmentId}
          onChange={(event) => setApartmentId(event.target.value)}
          className={cn(ui.input, 'mt-1.5')}
        >
          <option value="" disabled>
            Elegir Apartamento…
          </option>
          {groups.map((group) => (
            <optgroup key={group} label={group}>
              {APARTMENTS.filter((candidate) => candidate.group === group).map(
                (candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.group} · {candidate.number}
                    {candidate.hasActiveResident
                      ? ''
                      : ' (sin Residente activo)'}
                  </option>
                )
              )}
            </optgroup>
          ))}
        </select>
        {apartment && !apartment.hasActiveResident && (
          <span className="mt-1 block text-xs text-amber-700">
            Nadie recibirá el aviso de llegada.
          </span>
        )}
      </label>

      <div>
        <span className={ui.label}>Tipo de visita</span>
        <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-[#e5eeff] p-1">
          {(Object.keys(TYPE_LABELS) as Array<VisitType>).map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => setType(candidate)}
              className={cn(
                'h-10 rounded-md text-sm font-medium transition-all',
                type === candidate
                  ? 'bg-white text-[#0b1c30] shadow-sm'
                  : 'text-[#45464d]'
              )}
            >
              {TYPE_LABELS[candidate]}
            </button>
          ))}
        </div>
      </div>

      {!minor && (
        <div className="rounded-lg border border-dashed border-[#b4c5ff] bg-[#eff4ff] p-4">
          <label className="block">
            <span className={ui.label}>
              Placa de vehículo{' '}
              <span className="font-normal text-[#76777d]">(opcional)</span>
            </span>
            <input
              value={plate}
              onChange={(event) => setPlate(event.target.value.toUpperCase())}
              placeholder="ABC-123"
              className={cn(
                ui.input,
                'mt-1.5 bg-white font-mono tracking-widest uppercase'
              )}
            />
          </label>
        </div>
      )}

      <p className="text-xs leading-relaxed text-[#45464d]">
        {UNIT.name} trata estos datos para controlar el acceso y la seguridad.{' '}
        <PrivacyLink className="font-medium text-[#0051d5] underline" />
      </p>

      <div className="space-y-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className={ui.primaryButton}
        >
          <UserPlusIcon className="size-5" /> Registrar ingreso
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={cn(ui.ghostButton, 'w-full')}
        >
          Cancelar
        </button>
      </div>

      <div className="flex gap-2 rounded-lg bg-[#dbe1ff] p-3 text-xs text-[#00174b]">
        <InfoIcon className="size-4 shrink-0 text-[#0051d5]" />
        <p>
          Valide físicamente el documento antes de registrar.
          {apartment?.hasActiveResident
            ? ` Los Residentes de ${apartmentLabel(apartment.id)} recibirán el aviso de llegada.`
            : ''}
        </p>
      </div>
    </form>
  );
}

/* ---------- Visitantes dentro ---------- */

export function InsideList({
  dark,
  limit,
  hideSearch,
  query: controlledQuery,
}: {
  dark?: boolean;
  limit?: number;
  hideSearch?: boolean;
  query?: string;
}) {
  const store = usePortero();
  useNow(30_000);
  const [ownQuery, setQuery] = useState('');
  const [annulling, setAnnulling] = useState<Visit | undefined>();
  const query = (controlledQuery ?? ownQuery).trim().toLowerCase();
  const matches = store.inside.filter(
    (visit) =>
      query === '' ||
      visit.visitorName.toLowerCase().includes(query) ||
      apartmentLabel(visit.apartmentId).toLowerCase().includes(query) ||
      apartmentShort(visit.apartmentId).toLowerCase().includes(query) ||
      (visit.plate ?? '').toLowerCase().includes(query)
  );
  const previous = matches.filter((visit) => isPreviousDay(visit.entryAt));
  const todayRows = matches.filter((visit) => !isPreviousDay(visit.entryAt));
  const shown = limit ? todayRows.slice(0, limit) : todayRows;

  const exit = (visit: Visit) => {
    if (!store.shift) {
      toast.error('Inicie su Turno para registrar Salidas');
      return;
    }
    store.registerExit(visit.id);
    toast(`Salida registrada: ${visit.visitorName}`, {
      description: `${apartmentLabel(visit.apartmentId)} · dentro ${formatElapsed(visit.entryAt)}`,
    });
  };

  const row = (visit: Visit) => (
    <InsideRow
      key={visit.id}
      visit={visit}
      dark={dark}
      onExit={() => exit(visit)}
      onAnnul={() => setAnnulling(visit)}
    />
  );

  return (
    <div className="space-y-3">
      {!hideSearch && controlledQuery === undefined && (
        <label
          className={cn(
            'flex h-12 items-center gap-2 rounded-xl border px-4',
            dark
              ? 'border-white/15 bg-white/5'
              : 'border-[#c6c6cd] bg-white shadow-sm'
          )}
        >
          <SearchIcon
            className={cn('size-5', dark ? 'text-white/50' : 'text-[#76777d]')}
          />
          <input
            value={ownQuery}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, Apartamento o placa…"
            className="w-full bg-transparent text-base outline-none placeholder:text-[#76777d]"
          />
        </label>
      )}
      {previous.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-amber-600 uppercase">
            <AlertTriangleIcon className="size-3.5" /> De días anteriores ·{' '}
            {previous.length}
          </p>
          {previous.map(row)}
        </div>
      )}
      {previous.length > 0 && todayRows.length > 0 && (
        <p className={cn(ui.overline, dark && 'text-white/60')}>Hoy</p>
      )}
      <div className="space-y-2">{shown.map(row)}</div>
      {matches.length === 0 && (
        <p
          className={cn(
            'py-6 text-center text-sm',
            dark ? 'text-white/50' : 'text-[#76777d]'
          )}
        >
          {query
            ? 'Nadie coincide con la búsqueda.'
            : 'No hay Visitantes dentro.'}
        </p>
      )}
      <AnnulSheet visit={annulling} onClose={() => setAnnulling(undefined)} />
    </div>
  );
}

function InsideRow({
  visit,
  dark,
  onExit,
  onAnnul,
}: {
  visit: Visit;
  dark?: boolean;
  onExit: () => void;
  onAnnul: () => void;
}) {
  const old = isPreviousDay(visit.entryAt);
  return (
    <div
      className={cn(
        'flex items-stretch overflow-hidden rounded-xl border',
        dark
          ? 'border-white/10 bg-[#16213a]'
          : 'border-[#c6c6cd] bg-white shadow-sm',
        old && !dark && 'border-amber-300 bg-amber-50'
      )}
    >
      <span
        className={cn('w-1 shrink-0', old ? 'bg-amber-400' : 'bg-[#4edea3]')}
      />
      <div className="min-w-0 flex-1 space-y-1 py-3 pr-2 pl-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate font-semibold">{visit.visitorName}</p>
          <p
            className={cn(
              'shrink-0 text-lg leading-tight font-semibold',
              dark ? 'text-[#b4c5ff]' : 'text-[#0051d5]'
            )}
          >
            {apartmentShort(visit.apartmentId)}
          </p>
        </div>
        <p
          className={cn(
            'flex flex-wrap items-center gap-1.5 text-xs',
            dark ? 'text-white/60' : 'text-[#45464d]'
          )}
        >
          <OriginTag visit={visit} />
          {visit.minor ? 'Menor' : maskDocument(visit.document)}
          {visit.plate ? ` · ${visit.plate}` : ''}
        </p>
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              'flex min-w-0 items-center gap-1 text-xs',
              old
                ? 'font-medium text-amber-700'
                : dark
                  ? 'text-white/50'
                  : 'text-[#76777d]'
            )}
          >
            <ClockIcon className="size-3 shrink-0" />
            <span className="truncate">
              {old ? `${formatShortDate(visit.entryAt)} ` : 'Desde '}
              {formatTime(visit.entryAt)} · hace {formatElapsed(visit.entryAt)}
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={onExit}
              className={cn(
                'flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-semibold',
                dark ? 'bg-white/10 text-white' : 'bg-[#0b1c30] text-white'
              )}
            >
              <LogOutIcon className="size-4" /> Salida
            </button>
            <button
              type="button"
              aria-label="Más opciones"
              onClick={onAnnul}
              className={cn(
                'rounded-lg p-2',
                dark ? 'text-white/60' : 'text-[#76777d]'
              )}
            >
              <MoreVerticalIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnulSheet({
  visit,
  onClose,
}: {
  visit: Visit | undefined;
  onClose: () => void;
}) {
  const store = usePortero();
  const [reason, setReason] = useState('');
  return (
    <BottomSheet open={Boolean(visit)} onClose={onClose} title="Anular Ingreso">
      {visit && !(visit.entryBy === store.me && store.shift) && (
        <div className="space-y-4">
          <p className="text-sm text-[#45464d]">
            <strong>{visit.visitorName}</strong> ·{' '}
            {apartmentLabel(visit.apartmentId)} · Ingreso registrado por{' '}
            <strong>
              {visit.entryBy === store.me ? 'usted' : visit.entryBy}
            </strong>{' '}
            a las {formatTime(visit.entryAt)}
          </p>
          <p className="flex gap-2 rounded-lg bg-[#eff4ff] p-3 text-sm text-[#45464d]">
            <InfoIcon className="size-4 shrink-0 text-[#0051d5]" />
            {visit.entryBy === store.me
              ? 'Solo puede anular sus Ingresos mientras su Turno esté abierto.'
              : 'Solo quien registró el Ingreso puede anularlo. Para corregirlo, avise al Administrador.'}
          </p>
        </div>
      )}
      {visit && visit.entryBy === store.me && store.shift && (
        <div className="space-y-4">
          <p className="text-sm text-[#45464d]">
            <strong>{visit.visitorName}</strong> ·{' '}
            {apartmentLabel(visit.apartmentId)} · {formatTime(visit.entryAt)} ·
            La Visita queda anulada con su motivo y sale de las métricas y del
            Reporte de turno.
          </p>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Motivo (obligatorio)"
            rows={3}
            className={cn(ui.input, 'h-auto py-3')}
          />
          <button
            type="button"
            disabled={reason.trim().length < 4}
            className={cn(ui.primaryButton, 'bg-[#ba1a1a]')}
            onClick={() => {
              store.annulVisit(visit.id, reason.trim());
              toast(`Ingreso anulado: ${visit.visitorName}`);
              setReason('');
              onClose();
            }}
          >
            <BanIcon className="size-5" /> Anular Ingreso
          </button>
        </div>
      )}
    </BottomSheet>
  );
}

/* ---------- Turno ---------- */

export function ShiftBreakdown({ dark }: { dark?: boolean }) {
  const { metrics } = usePortero();
  const passShare = metrics.total ? (metrics.pass / metrics.total) * 100 : 0;
  return (
    <div className="space-y-3">
      <div>
        <div
          className={cn(
            'mb-1.5 flex justify-between text-xs font-medium',
            dark ? 'text-white/70' : 'text-[#45464d]'
          )}
        >
          <span>Pase · {metrics.pass}</span>
          <span>Manual · {metrics.manual}</span>
        </div>
        <div
          className={cn(
            'flex h-2.5 overflow-hidden rounded-full',
            dark ? 'bg-white/10' : 'bg-[#e5eeff]'
          )}
        >
          <span className="bg-[#4edea3]" style={{ width: `${passShare}%` }} />
          <span
            className="flex-1 bg-amber-400"
            style={{ opacity: metrics.manual ? 1 : 0 }}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(TYPE_LABELS) as Array<VisitType>).map((type) => {
          const Icon = TYPE_ICONS[type];
          return (
            <div
              key={type}
              className={cn(
                'rounded-lg px-2.5 py-2',
                dark ? 'bg-white/5' : 'bg-[#eff4ff]'
              )}
            >
              <p
                className={cn(
                  'flex items-center gap-1 text-[11px] font-medium',
                  dark ? 'text-white/60' : 'text-[#45464d]'
                )}
              >
                <Icon className="size-3" /> {TYPE_LABELS[type]}
              </p>
              <p className="text-lg font-semibold">{metrics.byType[type]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReportActions({
  shift,
  compact,
}: {
  shift: Shift;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex gap-2', compact ? '' : 'flex-col')}>
      <button
        type="button"
        className={cn(
          ui.ghostButton,
          compact ? 'h-9 flex-1 px-2 text-xs' : 'w-full'
        )}
        onClick={() =>
          toast.success('Reporte de turno descargado', {
            description: `turno-${shift.startAt.toISOString().slice(0, 10)}.xlsx`,
          })
        }
      >
        <DownloadIcon className="size-4" />{' '}
        {compact ? 'XLSX' : 'Descargar XLSX'}
      </button>
      <button
        type="button"
        className={cn(
          ui.ghostButton,
          compact ? 'h-9 flex-1 px-2 text-xs' : 'w-full'
        )}
        onClick={() =>
          toast.success('Reporte enviado al Administrador', {
            description: UNIT.adminEmail,
          })
        }
      >
        <MailIcon className="size-4" />{' '}
        {compact ? 'Enviar' : 'Enviar al Administrador'}
      </button>
    </div>
  );
}

export function CloseShiftSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const store = usePortero();
  const now = useNow();
  const [closed, setClosed] = useState<Shift | undefined>();
  const shift = store.shift;
  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setClosed(undefined);
        onClose();
      }}
      title={closed ? 'Turno cerrado' : 'Cerrar turno'}
    >
      {closed ? (
        <div className="space-y-4">
          <p className="text-sm text-[#45464d]">
            {formatTime(closed.startAt)} – {formatTime(closed.endAt ?? now)} ·{' '}
            {formatElapsed(closed.startAt, closed.endAt)} · {closed.total}{' '}
            Visitas ({closed.passCount} Pase, {closed.manualCount} manual).
          </p>
          <p className={ui.overline}>Reporte de turno</p>
          <ReportActions shift={closed} />
        </div>
      ) : (
        shift && (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-[#45464d]">
                Desde {formatTime(shift.startAt)} ·{' '}
                {formatElapsed(shift.startAt, now)}
              </p>
              <p className="text-3xl font-bold">{store.metrics.total}</p>
            </div>
            <ShiftBreakdown />
            <p className="text-sm text-[#45464d]">
              Salidas registradas: {store.metrics.exits}
            </p>
            {store.inside.length > 0 && (
              <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangleIcon className="size-4 shrink-0" />
                Quedan {store.inside.length} Visitantes dentro. Sus Visitas
                siguen abiertas para el próximo Portero.
              </p>
            )}
            <p className="text-xs text-[#76777d]">
              Sin Turno abierto no podrá registrar Ingresos ni Salidas.
            </p>
            <button
              type="button"
              className={ui.primaryButton}
              onClick={() => setClosed(store.closeShift())}
            >
              Cerrar turno
            </button>
          </div>
        )
      )}
    </BottomSheet>
  );
}

export function StartShiftPanel({ dark }: { dark?: boolean }) {
  const store = usePortero();
  return (
    <div className="space-y-3">
      {store.otherUnitShiftOpen && (
        <p
          className={cn(
            'flex gap-2 rounded-lg p-3 text-left text-sm',
            dark
              ? 'bg-amber-400/15 text-amber-100'
              : 'bg-amber-50 text-amber-900'
          )}
        >
          <AlertTriangleIcon className="size-4 shrink-0" />
          Tiene un Turno abierto en {UNIT.otherUnitName} desde las 6:00 a. m. Al
          iniciar aquí, ese Turno se cierra.
        </p>
      )}
      <button
        type="button"
        className={cn(ui.actionButton, 'h-14 w-full text-lg')}
        onClick={() => {
          store.startShift();
          toast.success(
            store.otherUnitShiftOpen
              ? `Turno en ${UNIT.otherUnitName} cerrado. Turno iniciado.`
              : 'Turno iniciado'
          );
        }}
      >
        {store.otherUnitShiftOpen
          ? 'Cerrar el otro e iniciar turno'
          : 'Iniciar turno'}
      </button>
    </div>
  );
}

export function ShiftHistoryList({ dark }: { dark?: boolean }) {
  const store = usePortero();
  const now = useNow(30_000);
  return (
    <div className="space-y-2">
      {store.shift && (
        <div
          className={cn(
            'rounded-xl border p-4',
            dark
              ? 'border-[#4edea3]/40 bg-[#16213a]'
              : 'border-[#4edea3] bg-white'
          )}
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold">
              Hoy · desde {formatTime(store.shift.startAt)}
            </p>
            <span className="rounded-full bg-[#4edea3]/20 px-2 py-0.5 text-[11px] font-bold tracking-wider text-[#00794f] uppercase">
              En curso
            </span>
          </div>
          <p
            className={cn('text-sm', dark ? 'text-white/60' : 'text-[#45464d]')}
          >
            {formatElapsed(store.shift.startAt, now)} · {store.metrics.total}{' '}
            Visitas
          </p>
        </div>
      )}
      {store.history.map((shift) => (
        <div
          key={shift.id}
          className={cn(
            'space-y-3 rounded-xl border p-4',
            dark
              ? 'border-white/10 bg-[#16213a]'
              : 'border-[#c6c6cd] bg-white shadow-sm'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold first-letter:uppercase">
                {formatShortDate(shift.startAt)}
              </p>
              <p
                className={cn(
                  'text-sm',
                  dark ? 'text-white/60' : 'text-[#45464d]'
                )}
              >
                {formatTime(shift.startAt)} –{' '}
                {shift.endAt ? formatTime(shift.endAt) : '…'} ·{' '}
                {formatElapsed(shift.startAt, shift.endAt)}
              </p>
              {shift.autoClosed && (
                <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  Cerrado automáticamente (16 h)
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{shift.total}</p>
              <p
                className={cn(
                  'text-[11px]',
                  dark ? 'text-white/50' : 'text-[#76777d]'
                )}
              >
                {shift.passCount} Pase · {shift.manualCount} manual
              </p>
            </div>
          </div>
          <ReportActions shift={shift} compact />
        </div>
      ))}
    </div>
  );
}

/* ---------- Aviso de privacidad ---------- */

export function PrivacyLink({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        Aviso de privacidad · v{UNIT.noticeVersion}
      </button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Aviso de privacidad · v${UNIT.noticeVersion}`}
      >
        <div className="space-y-3 text-sm leading-relaxed text-[#45464d]">
          <p className="flex items-center gap-2 font-medium text-[#0b1c30]">
            <ShieldIcon className="size-4 text-[#0051d5]" /> {UNIT.name}, NIT
            900.123.456-7, Cra. 15 # 93-40, Bogotá.
          </p>
          <p>
            {UNIT.name} es Responsable de los datos que registra la portería
            (nombre, documento, Apartamento visitado, placa y horas de Ingreso y
            Salida) y los usa solo para controlar el acceso y la seguridad de la
            copropiedad. Visit Pass los trata por encargo de la unidad.
          </p>
          <p>
            Se conservan {UNIT.retentionMonths} meses desde el Ingreso y luego
            se anonimizan. Puede conocer, actualizar, rectificar o suprimir sus
            datos escribiendo a {UNIT.adminEmail}.
          </p>
          <p className="text-xs text-[#76777d]">
            Política de tratamiento: visitpass.co/privacidad/torres-del-parque
          </p>
        </div>
      </BottomSheet>
    </>
  );
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        className={cn(
          "mx-auto max-h-[92dvh] max-w-md gap-0 overflow-y-auto rounded-t-2xl bg-white p-0 pb-16 font-['Inter',sans-serif] text-[#0b1c30]",
          className
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-[#c6c6cd]" />
        <div className="px-5 pt-3 pb-4">
          <SheetTitle className="text-xl font-semibold text-black">
            {title}
          </SheetTitle>
        </div>
        <div className="px-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

/* ---------- Actividad reciente ---------- */

export type ActivityEvent =
  | { kind: 'ingreso'; id: string; at: Date; visit: Visit }
  | { kind: 'salida'; id: string; at: Date; visit: Visit }
  | { kind: 'rechazo'; id: string; at: Date; rejection: Rejection };

/** Today's Ingresos, Salidas and rejected scans at this portería, newest first. */
export const useActivity = () => {
  const store = usePortero();
  const today = new Date().toDateString();
  const events: Array<ActivityEvent> = [
    ...store.visits
      .filter(
        (visit) =>
          !visit.annulledReason && visit.entryAt.toDateString() === today
      )
      .map((visit) => ({
        kind: 'ingreso' as const,
        id: `i-${visit.id}`,
        at: visit.entryAt,
        visit,
      })),
    ...store.visits.flatMap((visit) =>
      visit.exitAt && !visit.annulledReason
        ? [
            {
              kind: 'salida' as const,
              id: `s-${visit.id}`,
              at: visit.exitAt,
              visit,
            },
          ]
        : []
    ),
    ...store.rejections.map((rejection) => ({
      kind: 'rechazo' as const,
      id: rejection.id,
      at: rejection.at,
      rejection,
    })),
  ];
  return [...events].sort((a, b) => b.at.getTime() - a.at.getTime());
};

/** "Mi turno": live clock, total and breakdown, with the way to close it. */
export function MyShiftSheet({
  open,
  onClose,
  onCloseShift,
}: {
  open: boolean;
  onClose: () => void;
  onCloseShift: () => void;
}) {
  const store = usePortero();
  const now = useNow();
  return (
    <BottomSheet open={open} onClose={onClose} title="Mi turno">
      {store.shift ? (
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-mono text-3xl font-bold">
                {formatClock(store.shift.startAt, now)}
              </p>
              <p className="text-sm text-[#45464d]">
                Desde {formatTime(store.shift.startAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{store.metrics.total}</p>
              <p className="text-xs text-[#76777d]">
                Visitas · {store.metrics.exits} Salidas
              </p>
            </div>
          </div>
          <ShiftBreakdown />
          <button
            type="button"
            className={ui.primaryButton}
            onClick={() => {
              onClose();
              onCloseShift();
            }}
          >
            Cerrar turno
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[#45464d]">
            No tiene un turno abierto en {UNIT.name}.
          </p>
          <StartShiftPanel />
        </div>
      )}
    </BottomSheet>
  );
}
