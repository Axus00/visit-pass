import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';

import type { Id } from '#convex/_generated/dataModel';

import { DatabaseReader, DatabaseWriter } from '../../../_generated/services';
import * as AuthorizationsApplication from '../../authorizations/application';
import * as AuthorizationsDomain from '../../authorizations/domain';
import * as CalendarDomain from '../../calendar/domain';
import * as MembershipsApplication from '../../memberships/application';
import type * as MembershipsDomain from '../../memberships/domain';
import * as ResidentialUnitsApplication from '../../residentialUnits/application';
import * as ResidentialUnitsDomain from '../../residentialUnits/domain';
import * as VisitsDomain from '../../visits/domain';
import * as Domain from '../domain';

const MONDAY_TO_FRIDAY: ReadonlyArray<CalendarDomain.Weekday> = [1, 2, 3, 4, 5];

interface SeededUnit {
  readonly residentialUnitId: Id<'residentialUnits'>;
  readonly apartment: (tower: string, number: string) => Id<'apartments'>;
  readonly today: CalendarDomain.LocalDate;
  /** The instant of a wall-clock time `days` from today in the unit's zone. */
  readonly at: (days: number, time: string) => number;
}

/**
 * Inserts `sample` with its Apartamentos and hands it to `populate`, unless a
 * unit with that name exists: setup reseeds on every run, so the first run's
 * data stays and later runs change nothing.
 */
const seedUnitOnce = Effect.fn('DevelopmentSeeder.seedUnitOnce')(function* <
  E,
  R,
>(
  sample: Domain.SampleUnit,
  populate: (unit: SeededUnit) => Effect.Effect<void, E, R>
) {
  const reader = yield* DatabaseReader;
  const writer = yield* DatabaseWriter;

  const existing = yield* reader
    .table('residentialUnits')
    .index('by_name', (q) => q.eq('name', sample.name))
    .first();

  if (Option.isSome(existing)) {
    yield* Effect.logInfo('Sample unit already seeded', { name: sample.name });
    return;
  }

  const timeZone = CalendarDomain.DEFAULT_TIME_ZONE;
  const residentialUnitId = yield* writer.table('residentialUnits').insert({
    name: sample.name,
    city: sample.city,
    timeZone,
    visitRetentionMonths: ResidentialUnitsDomain.DEFAULT_VISIT_RETENTION_MONTHS,
  });

  const apartmentEntries = yield* Effect.forEach(
    // Apartamento numbers floor by floor in every tower: `101`, `102`, …, `201`, …
    sample.towers.flatMap((tower) =>
      Array.from({ length: sample.floors }, (_, floorIndex) =>
        Array.from(
          { length: sample.apartmentsPerFloor },
          (__, apartmentIndex) => ({
            tower,
            number: `${floorIndex + 1}${String(apartmentIndex + 1).padStart(2, '0')}`,
          })
        )
      ).flat()
    ),
    ({ tower, number }) =>
      writer
        .table('apartments')
        .insert({ residentialUnitId, tower, number })
        .pipe(
          Effect.map(
            (apartmentId) => [`${tower}·${number}`, apartmentId] as const
          )
        )
  );
  const apartmentIdsByKey = new Map(apartmentEntries);

  const now = yield* Clock.currentTimeMillis;
  const today = CalendarDomain.toLocalDate(now, timeZone);

  yield* populate({
    residentialUnitId,
    apartment: (tower, number) => {
      const apartmentId = apartmentIdsByKey.get(`${tower}·${number}`);

      if (Predicate.isUndefined(apartmentId))
        throw new Error(`Sample Apartamento ${tower}·${number} is missing`);

      return apartmentId;
    },
    today,
    // Exact for zones without daylight saving, such as Colombia's.
    at: (days, time) => {
      const wallClockAsUtc = Date.parse(
        `${CalendarDomain.addDays(today, days)}T${time}:00Z`
      );

      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).formatToParts(wallClockAsUtc);

      const part = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((candidate) => candidate.type === type)?.value ?? 0);

      const zoneWallClockAsUtc = Date.UTC(
        part('year'),
        part('month') - 1,
        part('day'),
        part('hour'),
        part('minute'),
        part('second')
      );
      const zoneOffsetMillis = zoneWallClockAsUtc - wallClockAsUtc;

      return wallClockAsUtc - zoneOffsetMillis;
    },
  });

  yield* Effect.logInfo('Sample unit seeded', { name: sample.name });
});

interface SampleVisitor {
  readonly name: string;
  readonly document?: string;
  readonly favoriteId?: Id<'favorites'>;
  readonly status?: AuthorizationsDomain.PassStatus;
  readonly entryCount?: number;
  readonly lastEntryAt?: number;
}

interface SampleVisit {
  readonly visitorName: string;
  readonly visitorDocument: string;
  readonly apartmentId: Id<'apartments'>;
  readonly visitType: VisitsDomain.VisitType;
  readonly plate?: string;
  readonly pass?: {
    readonly passId: Id<'passes'>;
    readonly authorizationId: Id<'authorizations'>;
  };
  readonly overriddenRejection?: AuthorizationsDomain.PassRejectionReason;
  readonly enteredAt: number;
  readonly exitedAt?: number;
}

const populateAlmendros = Effect.fn('DevelopmentSeeder.populateAlmendros')(
  function* (unit: SeededUnit) {
    const writer = yield* DatabaseWriter;

    const { residentialUnitId, apartment, today, at } = unit;

    const invite = (invitation: MembershipsDomain.InviteMemberDto) =>
      MembershipsApplication.inviteMember(residentialUnitId, invitation);

    // Membresías: every development account, plus two pending invitations.
    yield* invite({ email: 'agent@example.org', role: 'administrator' });
    const agentPorter = yield* invite({
      email: 'agent@example.org',
      role: 'porter',
    });
    const agentResident = yield* invite({
      email: 'agent@example.org',
      role: 'resident',
      apartmentId: apartment('1', '101'),
      occupancyType: 'owner',
    });
    const humanResident = yield* invite({
      email: 'human@example.org',
      role: 'resident',
      apartmentId: apartment('2', '202'),
      occupancyType: 'tenant',
    });
    const residenteResident = yield* invite({
      email: 'residente@example.org',
      role: 'resident',
      apartmentId: apartment('1', '101'),
      occupancyType: 'tenant',
    });
    const porteroPorter = yield* invite({
      email: 'portero@example.org',
      role: 'porter',
    });
    yield* invite({
      email: 'administrador@example.org',
      role: 'administrator',
    });
    yield* invite({
      email: 'nuevo.residente@example.org',
      displayName: 'Nuevo Residente',
      role: 'resident',
      apartmentId: apartment('2', '301'),
      occupancyType: 'owner',
    });
    yield* invite({
      email: 'portero.noche@example.org',
      displayName: 'Portero Nocturno',
      role: 'porter',
    });

    // Favoritos of both Residentes of Torre 1 · 101.
    const favorite = (args: {
      membershipId: Id<'memberships'>;
      visitorName: string;
      visitorDocument?: string;
      relationship: AuthorizationsDomain.Relationship;
      relationshipNote?: string;
      lastAuthorizedAt?: number;
    }) => writer.table('favorites').insert({ residentialUnitId, ...args });

    yield* favorite({
      membershipId: agentResident,
      visitorName: 'María Fernanda Gómez',
      visitorDocument: '52345678',
      relationship: 'family',
      relationshipNote: 'Hermana',
    });
    const andresFavorite = yield* favorite({
      membershipId: agentResident,
      visitorName: 'Andrés Felipe Castro',
      visitorDocument: '1020304050',
      relationship: 'friend',
      lastAuthorizedAt: at(0, '07:00'),
    });
    const rosaFavorite = yield* favorite({
      membershipId: agentResident,
      visitorName: 'Rosa Elena Pardo',
      visitorDocument: '41234567',
      relationship: 'other',
      relationshipNote: 'Empleada doméstica',
      lastAuthorizedAt: at(-14, '08:00'),
    });
    yield* favorite({
      membershipId: residenteResident,
      visitorName: 'Jorge Gómez',
      visitorDocument: '19456789',
      relationship: 'family',
      relationshipNote: 'Papá',
    });
    const valentinaFavorite = yield* favorite({
      membershipId: residenteResident,
      visitorName: 'Valentina Ríos',
      visitorDocument: '1032456789',
      relationship: 'friend',
      lastAuthorizedAt: at(-2, '20:00'),
    });
    yield* favorite({
      membershipId: residenteResident,
      visitorName: 'Luis Alberto Mora',
      visitorDocument: '80456123',
      relationship: 'other',
      relationshipNote: 'Plomero',
    });

    // Autorizaciones, one Pase per Visitante.
    const authorize = Effect.fn(function* (args: {
      apartmentId: Id<'apartments'>;
      createdByMembershipId: Id<'memberships'>;
      type: AuthorizationsDomain.AuthorizationType;
      startDate: CalendarDomain.LocalDate;
      endDate?: CalendarDomain.LocalDate;
      weekdays?: ReadonlyArray<CalendarDomain.Weekday>;
      eventName?: string;
      cancelledAt?: number;
      visitors: ReadonlyArray<SampleVisitor>;
    }) {
      const isCancelled = Predicate.isNotUndefined(args.cancelledAt);

      const authorizationId = yield* writer.table('authorizations').insert({
        residentialUnitId,
        apartmentId: args.apartmentId,
        createdByMembershipId: args.createdByMembershipId,
        type: args.type,
        startDate: args.startDate,
        endDate: args.endDate ?? args.startDate,
        weekdays: args.weekdays ?? AuthorizationsDomain.ALL_WEEKDAYS,
        eventName: args.eventName,
        status: isCancelled ? 'cancelled' : 'active',
        cancelledAt: args.cancelledAt,
        cancelledByMembershipId: isCancelled
          ? args.createdByMembershipId
          : undefined,
      });

      const passIds = yield* Effect.forEach(args.visitors, (visitor) =>
        AuthorizationsApplication.generatePassToken.pipe(
          Effect.flatMap((token) =>
            writer.table('passes').insert({
              authorizationId,
              residentialUnitId,
              apartmentId: args.apartmentId,
              visitorName: visitor.name,
              visitorDocument: visitor.document,
              token,
              status: isCancelled ? 'cancelled' : (visitor.status ?? 'active'),
              entryCount: visitor.entryCount ?? 0,
              lastEntryAt: visitor.lastEntryAt,
              favoriteId: visitor.favoriteId,
            })
          )
        )
      );

      return passIds.map((passId) => ({ passId, authorizationId }));
    });

    yield* authorize({
      apartmentId: apartment('1', '101'),
      createdByMembershipId: agentResident,
      type: 'temporary',
      startDate: today,
      visitors: [
        {
          name: 'Andrés Felipe Castro',
          document: '1020304050',
          favoriteId: andresFavorite,
        },
      ],
    });
    yield* authorize({
      apartmentId: apartment('1', '101'),
      createdByMembershipId: residenteResident,
      type: 'event',
      startDate: CalendarDomain.addDays(today, 1),
      eventName: 'Cumpleaños de Laura',
      visitors: [
        { name: 'Camila Torres', document: '1019876543' },
        { name: 'Santiago Herrera' },
        { name: 'Daniela Vargas', document: '1001234567' },
      ],
    });

    // Rosa comes Monday to Friday; her last Ingreso was yesterday if allowed.
    const yesterday = CalendarDomain.addDays(today, -1);
    const isServiceDayYesterday = MONDAY_TO_FRIDAY.includes(
      CalendarDomain.weekdayOf(yesterday)
    );
    const serviceStart = CalendarDomain.addDays(today, -14);
    const [rosaPass] = yield* authorize({
      apartmentId: apartment('1', '101'),
      createdByMembershipId: agentResident,
      type: 'service',
      startDate: serviceStart,
      endDate: CalendarDomain.addDays(serviceStart, 90),
      weekdays: MONDAY_TO_FRIDAY,
      visitors: [
        {
          name: 'Rosa Elena Pardo',
          document: '41234567',
          favoriteId: rosaFavorite,
          entryCount: isServiceDayYesterday ? 1 : 0,
          lastEntryAt: isServiceDayYesterday ? at(-1, '07:15') : undefined,
        },
      ],
    });
    yield* authorize({
      apartmentId: apartment('1', '101'),
      createdByMembershipId: residenteResident,
      type: 'temporary',
      startDate: CalendarDomain.addDays(today, 1),
      cancelledAt: at(0, '06:30'),
      visitors: [{ name: 'Pedro Salazar', document: '79876543' }],
    });
    const [valentinaPass] = yield* authorize({
      apartmentId: apartment('1', '101'),
      createdByMembershipId: residenteResident,
      type: 'temporary',
      startDate: yesterday,
      visitors: [
        {
          name: 'Valentina Ríos',
          document: '1032456789',
          favoriteId: valentinaFavorite,
          status: 'used',
          entryCount: 1,
          lastEntryAt: at(-1, '10:30'),
        },
      ],
    });
    yield* authorize({
      apartmentId: apartment('2', '202'),
      createdByMembershipId: humanResident,
      type: 'temporary',
      startDate: today,
      visitors: [{ name: 'Martín Ospina', document: '1045678901' }],
    });

    // Turnos: two closed with Visitas, two scheduled.
    const shift = (args: {
      porterMembershipId: Id<'memberships'>;
      status: 'scheduled' | 'closed';
      plannedStart: number;
      plannedEnd: number;
      startedAt?: number;
      endedAt?: number;
    }) => writer.table('shifts').insert({ residentialUnitId, ...args });

    const porteroYesterday = yield* shift({
      porterMembershipId: porteroPorter,
      status: 'closed',
      plannedStart: at(-1, '06:00'),
      plannedEnd: at(-1, '18:00'),
      startedAt: at(-1, '05:55'),
      endedAt: at(-1, '18:05'),
    });
    const agentNight = yield* shift({
      porterMembershipId: agentPorter,
      status: 'closed',
      plannedStart: at(-3, '18:00'),
      plannedEnd: at(-2, '06:00'),
      startedAt: at(-3, '17:58'),
      endedAt: at(-2, '06:02'),
    });
    yield* shift({
      porterMembershipId: agentPorter,
      status: 'scheduled',
      plannedStart: at(0, '18:00'),
      plannedEnd: at(1, '06:00'),
    });
    yield* shift({
      porterMembershipId: porteroPorter,
      status: 'scheduled',
      plannedStart: at(1, '06:00'),
      plannedEnd: at(1, '18:00'),
    });

    const visitsByShift: ReadonlyArray<{
      readonly shiftId: Id<'shifts'>;
      readonly porterMembershipId: Id<'memberships'>;
      readonly visits: ReadonlyArray<SampleVisit>;
    }> = [
      {
        shiftId: porteroYesterday,
        porterMembershipId: porteroPorter,
        visits: [
          {
            visitorName: 'Rosa Elena Pardo',
            visitorDocument: '41234567',
            apartmentId: apartment('1', '101'),
            visitType: 'service',
            pass: isServiceDayYesterday ? rosaPass : undefined,
            enteredAt: at(-1, '07:15'),
            exitedAt: at(-1, '16:00'),
          },
          {
            visitorName: 'Juan Pablo Rincón',
            visitorDocument: '1098765432',
            apartmentId: apartment('2', '202'),
            visitType: 'temporary',
            enteredAt: at(-1, '08:05'),
            exitedAt: at(-1, '08:20'),
          },
          {
            visitorName: 'Óscar Iván Beltrán',
            visitorDocument: '80123456',
            apartmentId: apartment('1', '203'),
            visitType: 'service',
            plate: 'GHT219',
            enteredAt: at(-1, '09:10'),
            exitedAt: at(-1, '11:40'),
          },
          {
            visitorName: 'Valentina Ríos',
            visitorDocument: '1032456789',
            apartmentId: apartment('1', '101'),
            visitType: 'temporary',
            plate: 'KJU482',
            pass: valentinaPass,
            enteredAt: at(-1, '10:30'),
            exitedAt: at(-1, '13:45'),
          },
          {
            visitorName: 'Lucía Méndez',
            visitorDocument: '52987654',
            apartmentId: apartment('2', '202'),
            visitType: 'temporary',
            plate: 'BCD345',
            enteredAt: at(-1, '11:50'),
            exitedAt: at(-1, '15:10'),
          },
          {
            visitorName: 'Hernán Quintero',
            visitorDocument: '79345678',
            apartmentId: apartment('1', '101'),
            visitType: 'temporary',
            overriddenRejection: 'expired',
            enteredAt: at(-1, '12:30'),
            exitedAt: at(-1, '12:55'),
          },
          {
            visitorName: 'Felipe Arango',
            visitorDocument: '1015432198',
            apartmentId: apartment('2', '104'),
            visitType: 'event',
            enteredAt: at(-1, '14:00'),
            exitedAt: at(-1, '17:30'),
          },
          {
            visitorName: 'Natalia Cárdenas',
            visitorDocument: '1022345678',
            apartmentId: apartment('1', '302'),
            visitType: 'temporary',
            plate: 'RTY963',
            enteredAt: at(-1, '15:20'),
            exitedAt: at(-1, '16:45'),
          },
          // Still inside: nobody registered their Salida.
          {
            visitorName: 'Gloria Patricia Nieto',
            visitorDocument: '51876543',
            apartmentId: apartment('1', '101'),
            visitType: 'temporary',
            enteredAt: at(-1, '16:40'),
          },
          {
            visitorName: 'Ricardo Salcedo',
            visitorDocument: '91234567',
            apartmentId: apartment('2', '202'),
            visitType: 'service',
            plate: 'MNO678',
            enteredAt: at(-1, '17:20'),
          },
        ],
      },
      {
        shiftId: agentNight,
        porterMembershipId: agentPorter,
        visits: [
          {
            visitorName: 'Diana Marcela Rojas',
            visitorDocument: '1030567890',
            apartmentId: apartment('1', '201'),
            visitType: 'temporary',
            enteredAt: at(-3, '19:10'),
            exitedAt: at(-3, '21:45'),
          },
          {
            visitorName: 'Sergio Londoño',
            visitorDocument: '80765432',
            apartmentId: apartment('2', '401'),
            visitType: 'service',
            plate: 'WQE741',
            enteredAt: at(-3, '20:30'),
            exitedAt: at(-3, '21:00'),
          },
          {
            visitorName: 'Camilo Andrés Pérez',
            visitorDocument: '1012345678',
            apartmentId: apartment('1', '101'),
            visitType: 'temporary',
            enteredAt: at(-2, '00:15'),
            exitedAt: at(-2, '01:30'),
          },
        ],
      },
    ];

    yield* Effect.forEach(
      visitsByShift.flatMap(({ shiftId, porterMembershipId, visits }) =>
        visits.map((visit) => ({ ...visit, shiftId, porterMembershipId }))
      ),
      ({ pass, exitedAt, porterMembershipId, ...visit }) =>
        writer.table('visits').insert({
          residentialUnitId,
          ...visit,
          origin: Predicate.isUndefined(pass) ? 'manual' : 'pass',
          passId: pass?.passId,
          authorizationId: pass?.authorizationId,
          entryPorterMembershipId: porterMembershipId,
          exitedAt,
          exitPorterMembershipId: Predicate.isUndefined(exitedAt)
            ? undefined
            : porterMembershipId,
          privacyNoticeVersion: VisitsDomain.PRIVACY_NOTICE_VERSION,
        }),
      { discard: true }
    );
  }
);

const populateMirador = Effect.fn('DevelopmentSeeder.populateMirador')(
  function* (unit: SeededUnit) {
    const writer = yield* DatabaseWriter;

    const { residentialUnitId, apartment, at } = unit;

    yield* MembershipsApplication.inviteMember(residentialUnitId, {
      email: 'human@example.org',
      role: 'administrator',
    });
    const humanPorter = yield* MembershipsApplication.inviteMember(
      residentialUnitId,
      { email: 'human@example.org', role: 'porter' }
    );

    const shiftId = yield* writer.table('shifts').insert({
      residentialUnitId,
      porterMembershipId: humanPorter,
      status: 'closed',
      plannedStart: at(-1, '07:00'),
      plannedEnd: at(-1, '15:00'),
      startedAt: at(-1, '06:58'),
      endedAt: at(-1, '15:03'),
    });

    yield* Effect.forEach(
      [
        {
          visitorName: 'Mónica Restrepo',
          visitorDocument: '43123456',
          apartmentId: apartment('A', '101'),
          visitType: 'temporary',
          enteredAt: at(-1, '09:00'),
          exitedAt: at(-1, '10:30'),
        },
        {
          visitorName: 'Esteban Zapata',
          visitorDocument: '98765432',
          apartmentId: apartment('A', '203'),
          visitType: 'service',
          plate: 'MED123',
          enteredAt: at(-1, '11:15'),
          exitedAt: at(-1, '13:00'),
        },
      ] satisfies ReadonlyArray<SampleVisit>,
      (visit) =>
        writer.table('visits').insert({
          residentialUnitId,
          ...visit,
          origin: 'manual',
          shiftId,
          entryPorterMembershipId: humanPorter,
          exitPorterMembershipId: humanPorter,
          privacyNoticeVersion: VisitsDomain.PRIVACY_NOTICE_VERSION,
        }),
      { discard: true }
    );
  }
);

/**
 * Idempotently seeds the Superadmin and two sample Unidades residenciales.
 * Run it after the development accounts exist so their Membresías start
 * active; otherwise they stay pending until each account signs in.
 */
export const seedSampleData = Effect.fn('DevelopmentSeeder.seedSampleData')(
  function* () {
    yield* ResidentialUnitsApplication.grantSuperadmin(Domain.SUPERADMIN_EMAIL);
    yield* seedUnitOnce(Domain.ALMENDROS, populateAlmendros);
    yield* seedUnitOnce(Domain.MIRADOR, populateMirador);
  }
);
