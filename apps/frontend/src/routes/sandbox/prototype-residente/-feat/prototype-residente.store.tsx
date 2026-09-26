/*
 * PROTOTYPE, throwaway: in-memory stand-in for the Residente's backend.
 * Nothing persists; reloading the page resets the seed.
 */
import type * as React from 'react';
import { createContext, useContext, useState } from 'react';

export type VisitType = 'temporal' | 'evento' | 'servicio';
export type RelationshipKind = 'familiar' | 'amigo' | 'otro';
export type Relationship = { kind: RelationshipKind; note?: string };

export type Favorite = {
  id: string;
  name: string;
  document?: string;
  relationship: Relationship;
};

export type PassStatus = 'disponible' | 'usado' | 'cancelado';
export type Pass = {
  id: string;
  token: string;
  visitorName: string;
  document?: string;
  status: PassStatus;
};

export type Authorization = {
  id: string;
  type: VisitType;
  createdBy: string;
  /** ISO dates (yyyy-mm-dd), America/Bogota. Temporal and Evento: start = end. */
  startDate: string;
  endDate: string;
  /** Servicio only: 0 = domingo … 6 = sábado. */
  weekdays: Array<number>;
  eventName?: string;
  cancelled: boolean;
  passes: Array<Pass>;
};

export type Visit = {
  id: string;
  visitorName: string;
  document?: string;
  type: VisitType;
  origin: 'pase' | 'manual';
  authorizationId?: string;
  entryAt: Date;
  exitAt?: Date;
  plate?: string;
};

export type Notice = { id: string; visitId: string; at: Date; read: boolean };

export type AuthorizationInput = {
  type: VisitType;
  startDate: string;
  endDate: string;
  weekdays: Array<number>;
  eventName?: string;
  guests: Array<{ name: string; document?: string }>;
  saveAsFavorite?: Relationship;
};

export const RESIDENT = {
  name: 'Fernanda Ospina',
  initials: 'FO',
  apartment: 'Torre 2 · Apto 402',
  unit: 'Conjunto Torres del Parque',
};

export const WEEKDAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const WEEKDAY_NAMES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export const TYPE_LABELS: Record<VisitType, string> = {
  temporal: 'Temporal',
  evento: 'Evento',
  servicio: 'Servicio',
};

export const RELATIONSHIP_LABELS: Record<RelationshipKind, string> = {
  familiar: 'Familiar',
  amigo: 'Amigo',
  otro: 'Otro',
};

export const describeRelationship = (relationship: Relationship) =>
  relationship.kind === 'otro' && relationship.note
    ? relationship.note
    : RELATIONSHIP_LABELS[relationship.kind];

const pad = (value: number) => String(value).padStart(2, '0');
export const toIso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const fromIso = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
};
export const todayIso = () => toIso(new Date());
export const addDays = (iso: string, days: number) => {
  const date = fromIso(iso);
  date.setDate(date.getDate() + days);
  return toIso(date);
};
const at = (daysAgo: number, hours: number, minutes: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  return date;
};
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;
const newToken = () =>
  Array.from({ length: 22 }, () =>
    'abcdefghijkmnpqrstuvwxyz23456789'.charAt(Math.floor(Math.random() * 32))
  ).join('');

const makePass = (
  visitorName: string,
  document?: string,
  status: PassStatus = 'disponible'
): Pass => ({
  id: nextId('pase'),
  token: newToken(),
  visitorName,
  document,
  status,
});

/** Derived Autorización state: only `cancelada` is stored, the rest comes from dates. */
export const authorizationState = (authorization: Authorization) => {
  if (authorization.cancelled) return 'cancelada' as const;
  if (authorization.endDate < todayIso()) return 'vencida' as const;
  if (authorization.startDate > todayIso()) return 'programada' as const;
  return 'vigente' as const;
};

/** Whether a Pase would pass the Portero's scan today (ignores "ya dentro"). */
export const isValidToday = (authorization: Authorization, pass: Pass) => {
  const today = todayIso();
  const inRange =
    authorization.startDate <= today && authorization.endDate >= today;
  const dayAllowed =
    authorization.type !== 'servicio' ||
    authorization.weekdays.includes(new Date().getDay());
  return (
    !authorization.cancelled &&
    inRange &&
    dayAllowed &&
    pass.status === 'disponible'
  );
};

const seed = () => {
  const today = todayIso();
  const todayWeekday = new Date().getDay();
  const favorites: Array<Favorite> = [
    {
      id: nextId('fav'),
      name: 'Rosa Elena Gómez',
      document: '41562318',
      relationship: { kind: 'familiar' },
    },
    {
      id: nextId('fav'),
      name: 'Carlos Andrés Pérez',
      relationship: { kind: 'amigo' },
    },
    {
      id: nextId('fav'),
      name: 'Ana Milena Ruiz',
      document: '52987441',
      relationship: { kind: 'otro', note: 'Aseo' },
    },
    {
      id: nextId('fav'),
      name: 'Julián Torres',
      relationship: { kind: 'familiar' },
    },
  ];

  const ricardo: Authorization = {
    id: nextId('aut'),
    type: 'temporal',
    createdBy: RESIDENT.name,
    startDate: today,
    endDate: today,
    weekdays: [],
    cancelled: false,
    passes: [makePass('Ricardo Salazar', undefined, 'usado')],
  };
  const laura: Authorization = {
    id: nextId('aut'),
    type: 'temporal',
    createdBy: 'Andrés Ospina',
    startDate: today,
    endDate: today,
    weekdays: [],
    cancelled: false,
    passes: [makePass('Laura Restrepo')],
  };
  const ana: Authorization = {
    id: nextId('aut'),
    type: 'servicio',
    createdBy: RESIDENT.name,
    startDate: addDays(today, -21),
    endDate: addDays(today, 90),
    weekdays: [2, 5, todayWeekday].filter(
      (day, index, days) => days.indexOf(day) === index
    ),
    cancelled: false,
    passes: [makePass('Ana Milena Ruiz', '52987441')],
  };
  const marta: Authorization = {
    id: nextId('aut'),
    type: 'temporal',
    createdBy: RESIDENT.name,
    startDate: addDays(today, -1),
    endDate: addDays(today, -1),
    weekdays: [],
    cancelled: false,
    passes: [makePass('Marta Díaz', '1020304050', 'usado')],
  };
  const birthday: Authorization = {
    id: nextId('aut'),
    type: 'evento',
    createdBy: RESIDENT.name,
    startDate: addDays(today, 4),
    endDate: addDays(today, 4),
    weekdays: [],
    eventName: 'Cumpleaños de Sofi',
    cancelled: false,
    passes: [
      makePass('Carlos Andrés Pérez'),
      makePass('Valentina Mejía'),
      makePass('Tomás Mejía'),
    ],
  };

  const visits: Array<Visit> = [
    {
      id: nextId('vis'),
      visitorName: 'Ricardo Salazar',
      document: '80123456',
      type: 'temporal',
      origin: 'pase',
      authorizationId: ricardo.id,
      entryAt: minutesAgo(48),
    },
    {
      id: nextId('vis'),
      visitorName: 'Marta Díaz',
      document: '1020304050',
      type: 'temporal',
      origin: 'pase',
      authorizationId: marta.id,
      entryAt: at(1, 15, 10),
      exitAt: at(1, 18, 15),
    },
    {
      id: nextId('vis'),
      visitorName: 'Jhon Mora (técnico Claro)',
      document: '1032456789',
      type: 'servicio',
      origin: 'manual',
      entryAt: at(2, 9, 30),
      exitAt: at(2, 10, 5),
      plate: 'KLM-482',
    },
    {
      id: nextId('vis'),
      visitorName: 'Ana Milena Ruiz',
      document: '52987441',
      type: 'servicio',
      origin: 'pase',
      authorizationId: ana.id,
      entryAt: at(4, 8, 2),
      exitAt: at(4, 12, 10),
    },
    {
      id: nextId('vis'),
      visitorName: 'Rosa Elena Gómez',
      document: '41562318',
      type: 'temporal',
      origin: 'pase',
      entryAt: at(6, 11, 20),
      exitAt: at(6, 17, 45),
    },
  ];

  return {
    favorites,
    authorizations: [laura, ricardo, ana, birthday, marta],
    visits,
    notices: [] as Array<Notice>,
  };
};

type State = ReturnType<typeof seed>;

const useResidentStore = () => {
  const [state, setState] = useState<State>(seed);

  const createAuthorization = (input: AuthorizationInput) => {
    const authorization: Authorization = {
      id: nextId('aut'),
      type: input.type,
      createdBy: RESIDENT.name,
      startDate: input.startDate,
      endDate: input.endDate,
      weekdays: input.weekdays,
      eventName: input.eventName,
      cancelled: false,
      passes: input.guests.map((guest) => makePass(guest.name, guest.document)),
    };
    const [firstGuest] = input.guests;
    const favorite =
      input.saveAsFavorite && firstGuest
        ? ({
            id: nextId('fav'),
            name: firstGuest.name,
            document: firstGuest.document,
            relationship: input.saveAsFavorite,
          } satisfies Favorite)
        : undefined;
    setState((current) => ({
      ...current,
      authorizations: [authorization, ...current.authorizations],
      favorites: favorite
        ? [...current.favorites, favorite]
        : current.favorites,
    }));
    return authorization;
  };

  /** One tap from a Favorito: a Temporal Autorización for today. */
  const authorizeToday = (favorite: Favorite) =>
    createAuthorization({
      type: 'temporal',
      startDate: todayIso(),
      endDate: todayIso(),
      weekdays: [],
      guests: [{ name: favorite.name, document: favorite.document }],
    });

  const cancelAuthorization = (id: string) =>
    setState((current) => ({
      ...current,
      authorizations: current.authorizations.map((authorization) =>
        authorization.id === id
          ? { ...authorization, cancelled: true }
          : authorization
      ),
    }));

  const addFavorite = (favorite: Omit<Favorite, 'id'>) =>
    setState((current) => ({
      ...current,
      favorites: [...current.favorites, { ...favorite, id: nextId('fav') }],
    }));

  /** Simulates the Portero registering an Ingreso: first Pase valid today, else a Registro manual. */
  const simulateEntry = () => {
    const openNames = new Set(
      state.visits.filter((visit) => !visit.exitAt).map((v) => v.visitorName)
    );
    const candidate = state.authorizations
      .flatMap((authorization) =>
        authorization.passes.map((pass) => ({ authorization, pass }))
      )
      .find(
        ({ authorization, pass }) =>
          isValidToday(authorization, pass) && !openNames.has(pass.visitorName)
      );
    const visit: Visit = candidate
      ? {
          id: nextId('vis'),
          visitorName: candidate.pass.visitorName,
          document: candidate.pass.document ?? '1098765432',
          type: candidate.authorization.type,
          origin: 'pase',
          authorizationId: candidate.authorization.id,
          entryAt: new Date(),
        }
      : {
          id: nextId('vis'),
          visitorName: 'Mario Castaño',
          document: '71234987',
          type: 'temporal',
          origin: 'manual',
          entryAt: new Date(),
        };
    const notice: Notice = {
      id: nextId('aviso'),
      visitId: visit.id,
      at: new Date(),
      read: false,
    };
    setState((current) => ({
      ...current,
      visits: [visit, ...current.visits],
      notices: [notice, ...current.notices],
      authorizations: current.authorizations.map((authorization) =>
        candidate &&
        authorization.id === candidate.authorization.id &&
        authorization.type !== 'servicio'
          ? {
              ...authorization,
              passes: authorization.passes.map((pass) =>
                pass.id === candidate.pass.id
                  ? { ...pass, status: 'usado' as const }
                  : pass
              ),
            }
          : authorization
      ),
    }));
    return { visit, notice };
  };

  /** Simulates the Portero registering the Salida of the oldest open Visita. */
  const simulateExit = () => {
    const open = state.visits
      .filter((visit) => !visit.exitAt)
      .sort((a, b) => a.entryAt.getTime() - b.entryAt.getTime())[0];
    if (!open) return undefined;
    setState((current) => ({
      ...current,
      visits: current.visits.map((visit) =>
        visit.id === open.id ? { ...visit, exitAt: new Date() } : visit
      ),
    }));
    return open;
  };

  const markNoticesRead = () =>
    setState((current) => ({
      ...current,
      notices: current.notices.map((notice) => ({ ...notice, read: true })),
    }));

  const visitFor = (notice: Notice) =>
    state.visits.find((visit) => visit.id === notice.visitId);

  return {
    ...state,
    createAuthorization,
    authorizeToday,
    cancelAuthorization,
    addFavorite,
    simulateEntry,
    simulateExit,
    markNoticesRead,
    visitFor,
  };
};

export type ResidentStore = ReturnType<typeof useResidentStore>;

const ResidentStoreContext = createContext<ResidentStore | null>(null);

export function ResidentStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = useResidentStore();
  return (
    <ResidentStoreContext.Provider value={store}>
      {children}
    </ResidentStoreContext.Provider>
  );
}

export const useResident = () => {
  const store = useContext(ResidentStoreContext);
  if (!store) throw new Error('useResident needs ResidentStoreProvider');
  return store;
};
