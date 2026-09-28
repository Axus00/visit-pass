/*
 * PROTOTYPE, throwaway: in-memory state for the Portero view. Fixtures cover
 * every scan outcome from the Autorización/Pase/Visita lifecycle decision (#8)
 * and the Turno rules (#9). Nothing persists; reload resets the scenario.
 */
import type * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

export type VisitType = 'temporal' | 'evento' | 'servicio';
export type DocType = 'CC' | 'CE' | 'TI' | 'PAS' | 'PPT';
export type Scenario = 'sin-turno' | 'turno-en-curso';

export const TYPE_LABELS: Record<VisitType, string> = {
  temporal: 'Temporal',
  evento: 'Evento',
  servicio: 'Servicio',
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  TI: 'Tarjeta de identidad',
  PAS: 'Pasaporte',
  PPT: 'Permiso por protección temporal',
};

export const WEEKDAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export const UNIT = {
  name: 'Torres del Parque',
  otherUnitName: 'Conjunto Los Pinos',
  adminEmail: 'administracion@torresdelparque.co',
  noticeVersion: 3,
  retentionMonths: 12,
  porteroName: 'Wilson Cárdenas',
};

export type Apartment = {
  id: string;
  group: string;
  number: string;
  hasActiveResident: boolean;
};

export const APARTMENTS: ReadonlyArray<Apartment> = [
  ...['101', '203', '402', '803'].map((number) => ({
    id: `t1-${number}`,
    group: 'Torre 1',
    number,
    hasActiveResident: true,
  })),
  ...['302', '402', '1101'].map((number) => ({
    id: `t2-${number}`,
    group: 'Torre 2',
    number,
    hasActiveResident: true,
  })),
  ...['504', '1204'].map((number) => ({
    id: `t3-${number}`,
    group: 'Torre 3',
    number,
    hasActiveResident: number !== '1204',
  })),
];

export const apartmentLabel = (id: string) => {
  const apartment = APARTMENTS.find((candidate) => candidate.id === id);
  return apartment ? `${apartment.group} · ${apartment.number}` : id;
};

export const apartmentShort = (id: string) => {
  const apartment = APARTMENTS.find((candidate) => candidate.id === id);
  return apartment
    ? `${apartment.group.replace('Torre ', 'T')}-${apartment.number}`
    : id;
};

/* ---------- Pases ---------- */

export type Pass = {
  token: string;
  code?: string;
  /** Short label for the prototype's "simular lectura" picker. */
  demoLabel: string;
  visitorName: string;
  docType?: DocType;
  document?: string;
  apartmentId: string;
  type: VisitType;
  eventName?: string;
  authorizedBy: string;
  validFrom: string;
  validTo: string;
  weekdays?: ReadonlyArray<number>;
  status: 'disponible' | 'usado' | 'cancelado' | 'reemplazado';
  authorizationCancelled?: boolean;
  usedAt?: Date;
  otherUnit?: boolean;
};

export type RejectReason =
  | 'no-valido'
  | 'reemplazado'
  | 'cancelado'
  | 'vencido'
  | 'no-vigente'
  | 'dia-no-permitido'
  | 'usado'
  | 'sin-residente';

export const REJECT_COPY: Record<
  RejectReason,
  { title: string; detail: string }
> = {
  'no-valido': {
    title: 'Pase no válido en esta unidad',
    detail: 'El código no existe o pertenece a otra Unidad residencial.',
  },
  reemplazado: {
    title: 'Pase reemplazado',
    detail:
      'El Residente generó un Pase nuevo. Pida al Visitante el más reciente.',
  },
  cancelado: {
    title: 'Autorización cancelada',
    detail: 'El Residente canceló esta Autorización.',
  },
  vencido: {
    title: 'Autorización vencida',
    detail: 'La fecha autorizada ya pasó.',
  },
  'no-vigente': {
    title: 'Aún no vigente',
    detail: 'El Pase vale a partir de una fecha futura.',
  },
  'dia-no-permitido': {
    title: 'Día no permitido',
    detail: 'Este Servicio no incluye el día de hoy.',
  },
  usado: {
    title: 'Pase ya usado',
    detail:
      'Este Pase ya registró su Ingreso. Un reingreso va por Registro manual.',
  },
  'sin-residente': {
    title: 'Apartamento sin Residente activo',
    detail: 'Nadie en el Apartamento puede responder por esta visita.',
  },
};

/* ---------- Visitas y Turnos ---------- */

export type Visit = {
  id: string;
  visitorName: string;
  docType?: DocType;
  document?: string;
  minor: boolean;
  apartmentId: string;
  type: VisitType;
  origin: 'pase' | 'manual';
  medium?: 'escaneo' | 'codigo';
  passToken?: string;
  forcedFrom?: RejectReason;
  plate?: string;
  entryAt: Date;
  entryBy: string;
  exitAt?: Date;
  exitBy?: string;
  annulledReason?: string;
};

/** A scan attempt that did not become an Ingreso. Kept only in this session. */
export type Rejection = {
  id: string;
  at: Date;
  reason: RejectReason;
  visitorName?: string;
  apartmentId?: string;
  medium: 'escaneo' | 'codigo';
};

export type Shift = {
  id: string;
  unitName: string;
  startAt: Date;
  endAt?: Date;
  autoClosed?: boolean;
  total: number;
  passCount: number;
  manualCount: number;
};

export type ScanOutcome =
  | { kind: 'valido'; pass: Pass; medium: 'escaneo' | 'codigo' }
  | {
      kind: 'dentro';
      pass: Pass;
      visit: Visit;
      canReenter: boolean;
      medium: 'escaneo' | 'codigo';
    }
  | {
      kind: 'rechazado';
      reason: RejectReason;
      pass?: Pass;
      medium: 'escaneo' | 'codigo';
    };

export type ManualEntryInput = {
  visitorName: string;
  docType?: DocType;
  document?: string;
  minor: boolean;
  apartmentId: string;
  type: VisitType;
  plate?: string;
  passToken?: string;
  forcedFrom?: RejectReason;
};

/* ---------- Dates ---------- */

const pad = (value: number) => String(value).padStart(2, '0');
export const toIso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const todayIso = () => toIso(new Date());
export const addDays = (iso: string, days: number) => {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  return toIso(new Date(year, month - 1, day + days));
};
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
const atToday = (hours: number, minutes = 0) => {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

/* ---------- Fixtures ---------- */

const buildPasses = (): Array<Pass> => {
  const today = todayIso();
  const weekday = new Date().getDay();
  return [
    {
      token: 'tok-laura',
      code: '482913',
      demoLabel: 'Temporal vigente · sin documento',
      visitorName: 'Laura Gómez Arias',
      apartmentId: 't2-402',
      type: 'temporal',
      authorizedBy: 'Andrea R.',
      validFrom: today,
      validTo: today,
      status: 'disponible',
    },
    {
      token: 'tok-julian',
      code: '175204',
      demoLabel: 'Temporal vigente · con documento',
      visitorName: 'Julián Pardo',
      docType: 'CC',
      document: '1020334556',
      apartmentId: 't1-803',
      type: 'temporal',
      authorizedBy: 'Carolina M.',
      validFrom: today,
      validTo: today,
      status: 'disponible',
    },
    {
      token: 'tok-sofia',
      code: '360718',
      demoLabel: 'Evento · invitada',
      visitorName: 'Sofía Castaño',
      apartmentId: 't2-402',
      type: 'evento',
      eventName: 'Cumpleaños de Mateo',
      authorizedBy: 'Andrea R.',
      validFrom: today,
      validTo: today,
      status: 'disponible',
    },
    {
      token: 'tok-martha',
      code: '902145',
      demoLabel: 'Servicio · hoy permitido',
      visitorName: 'Martha Rincón',
      docType: 'CC',
      document: '52887123',
      apartmentId: 't1-203',
      type: 'servicio',
      authorizedBy: 'Hernán P.',
      validFrom: addDays(today, -40),
      validTo: addDays(today, 150),
      weekdays: [weekday, (weekday + 2) % 7, (weekday + 4) % 7],
      status: 'disponible',
    },
    {
      token: 'tok-rosa',
      code: '663290',
      demoLabel: 'Servicio · ya dentro (reescaneo)',
      visitorName: 'Rosa Pineda',
      docType: 'CC',
      document: '39554871',
      apartmentId: 't3-504',
      type: 'servicio',
      authorizedBy: 'Diego L.',
      validFrom: addDays(today, -90),
      validTo: addDays(today, 90),
      weekdays: [1, 2, 3, 4, 5, 6, 0],
      status: 'disponible',
    },
    {
      token: 'tok-andres-t',
      code: '731066',
      demoLabel: 'Temporal · dentro (reescaneo = Salida)',
      visitorName: 'Andrés Tobón',
      docType: 'CC',
      document: '80123777',
      apartmentId: 't1-101',
      type: 'temporal',
      authorizedBy: 'Lucía V.',
      validFrom: today,
      validTo: today,
      status: 'usado',
      usedAt: minutesAgo(95),
    },
    {
      token: 'tok-jorge',
      code: '611389',
      demoLabel: 'Servicio · día no permitido',
      visitorName: 'Jorge Téllez',
      apartmentId: 't2-1101',
      type: 'servicio',
      authorizedBy: 'Patricia G.',
      validFrom: addDays(today, -10),
      validTo: addDays(today, 60),
      weekdays: [(weekday + 1) % 7, (weekday + 3) % 7],
      status: 'disponible',
    },
    {
      token: 'tok-camilo',
      code: '258840',
      demoLabel: 'Temporal · ya usado',
      visitorName: 'Camilo Ruiz',
      docType: 'CC',
      document: '1032456789',
      apartmentId: 't1-402',
      type: 'temporal',
      authorizedBy: 'Sergio A.',
      validFrom: today,
      validTo: today,
      status: 'usado',
      usedAt: atToday(9, 12),
    },
    {
      token: 'tok-natalia',
      code: '734401',
      demoLabel: 'Vencido (ayer)',
      visitorName: 'Natalia Ortiz',
      apartmentId: 't2-302',
      type: 'temporal',
      authorizedBy: 'Mónica T.',
      validFrom: addDays(today, -1),
      validTo: addDays(today, -1),
      status: 'disponible',
    },
    {
      token: 'tok-pedro',
      code: '519026',
      demoLabel: 'Aún no vigente (mañana)',
      visitorName: 'Pedro Salas',
      apartmentId: 't1-803',
      type: 'temporal',
      authorizedBy: 'Carolina M.',
      validFrom: addDays(today, 1),
      validTo: addDays(today, 1),
      status: 'disponible',
    },
    {
      token: 'tok-diana',
      code: '847332',
      demoLabel: 'Autorización cancelada',
      visitorName: 'Diana Mejía',
      apartmentId: 't3-504',
      type: 'temporal',
      authorizedBy: 'Diego L.',
      validFrom: today,
      validTo: today,
      status: 'disponible',
      authorizationCancelled: true,
    },
    {
      token: 'tok-andres-v',
      demoLabel: 'Pase reemplazado (QR viejo)',
      visitorName: 'Andrés Vélez',
      apartmentId: 't1-101',
      type: 'temporal',
      authorizedBy: 'Lucía V.',
      validFrom: today,
      validTo: today,
      status: 'reemplazado',
    },
    {
      token: 'tok-felipe',
      code: '128467',
      demoLabel: 'Apartamento sin Residente activo',
      visitorName: 'Felipe Arango',
      apartmentId: 't3-1204',
      type: 'temporal',
      authorizedBy: 'Esteban Q.',
      validFrom: today,
      validTo: today,
      status: 'disponible',
    },
    {
      token: 'tok-otra-unidad',
      demoLabel: 'Pase de otra unidad',
      visitorName: '—',
      apartmentId: '—',
      type: 'temporal',
      authorizedBy: '—',
      validFrom: today,
      validTo: today,
      status: 'disponible',
      otherUnit: true,
    },
  ];
};

const ME = UNIT.porteroName;
const NIGHT_PORTERO = 'Luis Ospina';

const buildVisits = (scenario: Scenario): Array<Visit> => {
  const inShift = scenario === 'turno-en-curso';
  const byMe = (visit: Omit<Visit, 'entryBy'>): Array<Visit> =>
    inShift ? [{ ...visit, entryBy: ME }] : [];
  return [
    {
      id: 'v-old-1',
      visitorName: 'Óscar Benítez',
      docType: 'CC',
      document: '79456123',
      minor: false,
      apartmentId: 't2-1101',
      type: 'servicio',
      origin: 'manual',
      plate: 'KLM-482',
      entryAt: new Date(atToday(17, 40).getTime() - 86_400_000),
      entryBy: NIGHT_PORTERO,
    },
    {
      id: 'v-rosa',
      visitorName: 'Rosa Pineda',
      docType: 'CC',
      document: '39554871',
      minor: false,
      apartmentId: 't3-504',
      type: 'servicio',
      origin: 'pase',
      medium: 'escaneo',
      passToken: 'tok-rosa',
      entryAt: atToday(6, 48),
      entryBy: NIGHT_PORTERO,
    },
    {
      id: 'v-camilo',
      visitorName: 'Camilo Ruiz',
      docType: 'CC',
      document: '1032456789',
      minor: false,
      apartmentId: 't1-402',
      type: 'temporal',
      origin: 'pase',
      medium: 'escaneo',
      passToken: 'tok-camilo',
      entryAt: atToday(9, 12),
      entryBy: inShift ? ME : NIGHT_PORTERO,
      exitAt: atToday(10, 5),
      exitBy: inShift ? ME : NIGHT_PORTERO,
    },
    ...byMe({
      id: 'v-andres-t',
      visitorName: 'Andrés Tobón',
      docType: 'CC',
      document: '80123777',
      minor: false,
      apartmentId: 't1-101',
      type: 'temporal',
      origin: 'pase',
      medium: 'codigo',
      passToken: 'tok-andres-t',
      entryAt: minutesAgo(95),
    }),
    ...byMe({
      id: 'v-2',
      visitorName: 'Carlos Méndez',
      docType: 'CC',
      document: '1098765432',
      minor: false,
      apartmentId: 't1-803',
      type: 'temporal',
      origin: 'manual',
      plate: 'ABC-123',
      entryAt: minutesAgo(62),
    }),
    ...byMe({
      id: 'v-3',
      visitorName: 'Elena Rodríguez',
      docType: 'CE',
      document: '4455129',
      minor: false,
      apartmentId: 't2-302',
      type: 'evento',
      origin: 'pase',
      medium: 'escaneo',
      entryAt: minutesAgo(41),
    }),
    ...byMe({
      id: 'v-4',
      visitorName: 'Valentina Rodríguez',
      minor: true,
      apartmentId: 't2-302',
      type: 'evento',
      origin: 'manual',
      entryAt: minutesAgo(40),
    }),
    ...byMe({
      id: 'v-5',
      visitorName: 'Ricardo Salazar',
      docType: 'CC',
      document: '71234908',
      minor: false,
      apartmentId: 't1-203',
      type: 'servicio',
      origin: 'pase',
      medium: 'escaneo',
      entryAt: minutesAgo(150),
      exitAt: minutesAgo(70),
      exitBy: ME,
    }),
    ...byMe({
      id: 'v-6',
      visitorName: 'Gloria Patiño',
      docType: 'CC',
      document: '43877120',
      minor: false,
      apartmentId: 't1-402',
      type: 'temporal',
      origin: 'manual',
      forcedFrom: 'vencido',
      entryAt: minutesAgo(18),
    }),
  ];
};

const buildShiftHistory = (): Array<Shift> => {
  const day = 86_400_000;
  const at = (daysAgo: number, hours: number, minutes = 0) =>
    new Date(atToday(hours, minutes).getTime() - daysAgo * day);
  return [
    {
      id: 's-1',
      unitName: UNIT.name,
      startAt: at(1, 6, 2),
      endAt: at(1, 14, 7),
      total: 23,
      passCount: 16,
      manualCount: 7,
    },
    {
      id: 's-2',
      unitName: UNIT.name,
      startAt: at(3, 14, 0),
      endAt: at(2, 6, 0),
      autoClosed: true,
      total: 31,
      passCount: 19,
      manualCount: 12,
    },
    {
      id: 's-3',
      unitName: UNIT.name,
      startAt: at(4, 6, 0),
      endAt: at(4, 13, 58),
      total: 27,
      passCount: 21,
      manualCount: 6,
    },
    {
      id: 's-4',
      unitName: UNIT.name,
      startAt: at(5, 6, 5),
      endAt: at(5, 14, 1),
      total: 19,
      passCount: 12,
      manualCount: 7,
    },
  ];
};

/* ---------- Store ---------- */

const isOpen = (visit: Visit) => !visit.exitAt && !visit.annulledReason;

const evaluatePass = (
  pass: Pass | undefined,
  visits: ReadonlyArray<Visit>,
  medium: 'escaneo' | 'codigo'
): ScanOutcome => {
  if (!pass || pass.otherUnit)
    return { kind: 'rechazado', reason: 'no-valido', medium };
  const openVisit = visits.find(
    (visit) => visit.passToken === pass.token && isOpen(visit)
  );
  const today = todayIso();
  const reason: RejectReason | undefined = (() => {
    if (pass.status === 'reemplazado') return 'reemplazado';
    if (pass.authorizationCancelled || pass.status === 'cancelado')
      return 'cancelado';
    if (pass.validTo < today) return 'vencido';
    if (pass.validFrom > today) return 'no-vigente';
    const dayAllowed =
      pass.type !== 'servicio' ||
      (pass.weekdays ?? []).includes(new Date().getDay());
    if (!dayAllowed) return 'dia-no-permitido';
    if (pass.status === 'usado' && !openVisit) return 'usado';
    const apartment = APARTMENTS.find((a) => a.id === pass.apartmentId);
    if (apartment && !apartment.hasActiveResident) return 'sin-residente';
    return undefined;
  })();
  // A Pase with a Visita still open is a Salida by rescan, whatever else applies.
  if (openVisit)
    return {
      kind: 'dentro',
      pass,
      visit: openVisit,
      canReenter: pass.type === 'servicio' && reason === undefined,
      medium,
    };
  if (reason) return { kind: 'rechazado', reason, pass, medium };
  return { kind: 'valido', pass, medium };
};

const usePorteroState = () => {
  const [scenario, setScenario] = useState<Scenario>('turno-en-curso');
  const [otherUnitShiftOpen, setOtherUnitShiftOpen] = useState(false);
  const [passes, setPasses] = useState(buildPasses);
  const [visits, setVisits] = useState(() => buildVisits('turno-en-curso'));
  const [rejections, setRejections] = useState<Array<Rejection>>(() => [
    {
      id: 'r-seed',
      at: minutesAgo(33),
      reason: 'vencido',
      visitorName: 'Gloria Patiño',
      apartmentId: 't1-402',
      medium: 'escaneo',
    },
  ]);
  const [shift, setShift] = useState<Shift | undefined>(() => ({
    id: 's-now',
    unitName: UNIT.name,
    startAt: minutesAgo(192),
    total: 0,
    passCount: 0,
    manualCount: 0,
  }));
  const [history, setHistory] = useState(buildShiftHistory);

  const reset = (next: Scenario) => {
    setScenario(next);
    setPasses(buildPasses());
    setVisits(buildVisits(next));
    setRejections([]);
    setHistory(buildShiftHistory());
    setShift(
      next === 'turno-en-curso'
        ? {
            id: 's-now',
            unitName: UNIT.name,
            startAt: minutesAgo(192),
            total: 0,
            passCount: 0,
            manualCount: 0,
          }
        : undefined
    );
  };

  /** Visitas this Portero registered in the open Turno, deduced by time. */
  const shiftVisits = shift
    ? visits.filter(
        (visit) =>
          visit.entryBy === ME &&
          visit.entryAt >= shift.startAt &&
          !visit.annulledReason
      )
    : [];
  const shiftExits = shift
    ? visits.filter(
        (visit) =>
          visit.exitBy === ME && visit.exitAt && visit.exitAt >= shift.startAt
      )
    : [];
  const metrics = {
    total: shiftVisits.length,
    pass: shiftVisits.filter((visit) => visit.origin === 'pase').length,
    manual: shiftVisits.filter((visit) => visit.origin === 'manual').length,
    byType: {
      temporal: shiftVisits.filter((visit) => visit.type === 'temporal').length,
      evento: shiftVisits.filter((visit) => visit.type === 'evento').length,
      servicio: shiftVisits.filter((visit) => visit.type === 'servicio').length,
    } satisfies Record<VisitType, number>,
    exits: shiftExits.length,
  };

  const inside = visits
    .filter(isOpen)
    .sort((a, b) => b.entryAt.getTime() - a.entryAt.getTime());

  const logRejection = (outcome: ScanOutcome) => {
    if (outcome.kind !== 'rechazado') return;
    setRejections((current) => [
      {
        id: crypto.randomUUID(),
        at: new Date(),
        reason: outcome.reason,
        visitorName:
          outcome.reason === 'no-valido'
            ? undefined
            : outcome.pass?.visitorName,
        apartmentId:
          outcome.reason === 'no-valido'
            ? undefined
            : outcome.pass?.apartmentId,
        medium: outcome.medium,
      },
      ...current,
    ]);
  };

  const scanToken = (token: string) => {
    const outcome = evaluatePass(
      passes.find((pass) => pass.token === token),
      visits,
      'escaneo'
    );
    logRejection(outcome);
    return outcome;
  };

  /** Resolves a digited Código del Pase; ignores `VP`, spaces and dashes. */
  const enterCode = (raw: string) => {
    const digits = raw.replace(/vp/gi, '').replace(/[\s-]/g, '');
    const outcome = evaluatePass(
      passes.find((pass) => pass.code === digits),
      visits,
      'codigo'
    );
    logRejection(outcome);
    return outcome;
  };

  const registerPassEntry = (
    pass: Pass,
    details: {
      docType?: DocType;
      document?: string;
      plate?: string;
      medium: 'escaneo' | 'codigo';
    }
  ) => {
    const visit: Visit = {
      id: crypto.randomUUID(),
      visitorName: pass.visitorName,
      docType: details.docType ?? pass.docType,
      document: details.document ?? pass.document,
      minor: false,
      apartmentId: pass.apartmentId,
      type: pass.type,
      origin: 'pase',
      medium: details.medium,
      passToken: pass.token,
      plate: details.plate,
      entryAt: new Date(),
      entryBy: ME,
    };
    setVisits((current) => [...current, visit]);
    if (pass.type !== 'servicio')
      setPasses((current) =>
        current.map((candidate) =>
          candidate.token === pass.token
            ? { ...candidate, status: 'usado', usedAt: visit.entryAt }
            : candidate
        )
      );
    return visit;
  };

  const registerManualEntry = (input: ManualEntryInput) => {
    const visit: Visit = {
      id: crypto.randomUUID(),
      ...input,
      origin: 'manual',
      entryAt: new Date(),
      entryBy: ME,
    };
    setVisits((current) => [...current, visit]);
    return visit;
  };

  const registerExit = (visitId: string) => {
    const now = new Date();
    setVisits((current) =>
      current.map((visit) =>
        visit.id === visitId ? { ...visit, exitAt: now, exitBy: ME } : visit
      )
    );
  };

  const annulVisit = (visitId: string, reason: string) => {
    const visit = visits.find((candidate) => candidate.id === visitId);
    setVisits((current) =>
      current.map((candidate) =>
        candidate.id === visitId
          ? { ...candidate, annulledReason: reason }
          : candidate
      )
    );
    // An annulled Ingreso from a Temporal/Evento Pase frees the Pase again.
    if (visit?.passToken && visit.type !== 'servicio')
      setPasses((current) =>
        current.map((pass) =>
          pass.token === visit.passToken
            ? { ...pass, status: 'disponible', usedAt: undefined }
            : pass
        )
      );
  };

  const startShift = () => {
    setOtherUnitShiftOpen(false);
    setShift({
      id: crypto.randomUUID(),
      unitName: UNIT.name,
      startAt: new Date(),
      total: 0,
      passCount: 0,
      manualCount: 0,
    });
  };

  const closeShift = () => {
    if (!shift) return undefined;
    const closed: Shift = {
      ...shift,
      endAt: new Date(),
      total: metrics.total,
      passCount: metrics.pass,
      manualCount: metrics.manual,
    };
    setHistory((current) => [closed, ...current]);
    setShift(undefined);
    return closed;
  };

  return {
    scenario,
    reset,
    otherUnitShiftOpen,
    setOtherUnitShiftOpen,
    passes,
    visits,
    rejections,
    shift,
    history,
    metrics,
    inside,
    scanToken,
    enterCode,
    registerPassEntry,
    registerManualEntry,
    registerExit,
    annulVisit,
    startShift,
    closeShift,
    me: ME,
  };
};

export type PorteroStore = ReturnType<typeof usePorteroState>;

const PorteroContext = createContext<PorteroStore | undefined>(undefined);

export function PorteroStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = usePorteroState();
  return (
    <PorteroContext.Provider value={store}>{children}</PorteroContext.Provider>
  );
}

export const usePortero = () => {
  const store = useContext(PorteroContext);
  if (!store) throw new Error('usePortero outside PorteroStoreProvider');
  return store;
};

/** Re-renders every `intervalMs` so elapsed times stay live. */
export const useNow = (intervalMs = 1000) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
};
