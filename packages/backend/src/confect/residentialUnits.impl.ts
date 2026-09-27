import { FunctionImpl, GroupImpl } from '@confect/server';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';

import type { Id } from '#convex/_generated/dataModel';

import databaseSchema from './_generated/schema';
import { DatabaseReader, DatabaseWriter } from './_generated/services';
import RequireUserIdentity from './middleware/RequireUserIdentity.impl';
import * as Calendar from './modules/calendar';
import * as Memberships from './modules/memberships';
import * as ResidentialUnits from './modules/residentialUnits';
import residentialUnitsSpec from './residentialUnits.spec';

// Convex has no count operator. These bounds keep every read inside one
// transaction; the MVP's copropiedades stay well below them, and a unit that
// outgrows them needs denormalized counters (or `@convex-dev/aggregate`).
const APARTMENTS_PER_UNIT_LIMIT = 2000;
const MEMBERSHIPS_PER_ROLE_LIMIT = 2000;
const OPEN_SHIFTS_LIMIT = 100;
const VISITS_COUNT_LIMIT = 2000;
const UNITS_LIMIT = 500;
const ADMINISTRATORS_PER_UNIT_LIMIT = 50;

/**
 * Wider than any calendar day in any time zone, so scanning Ingresos since
 * `now - VISITS_TODAY_WINDOW` and filtering by local date finds all of today.
 */
const VISITS_TODAY_WINDOW_MILLIS = 36 * 60 * 60 * 1000;

// -*******************************************************************************-
// Public
// -*******************************************************************************-

/** Voided Visitas count neither as today's Visitas nor as Visitantes inside. */
const getOverviewImpl = FunctionImpl.make(
  databaseSchema,
  residentialUnitsSpec,
  'getOverview',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['administrator']
      );
      const residentialUnitId = membership.residentialUnitId;

      const membershipsWithRole = (role: Memberships.Role) =>
        reader
          .table('memberships')
          .index('by_residentialUnitId_and_role', (q) =>
            q.eq('residentialUnitId', residentialUnitId).eq('role', role)
          )
          .take(MEMBERSHIPS_PER_ROLE_LIMIT);

      const [
        unit,
        apartments,
        residents,
        porters,
        administrators,
        openShifts,
        recentVisits,
        visitsInside,
      ] = yield* Effect.all(
        [
          reader.table('residentialUnits').get(residentialUnitId),
          reader
            .table('apartments')
            .index('by_residentialUnitId_and_tower_and_number', (q) =>
              q.eq('residentialUnitId', residentialUnitId)
            )
            .take(APARTMENTS_PER_UNIT_LIMIT),
          membershipsWithRole('resident'),
          membershipsWithRole('porter'),
          membershipsWithRole('administrator'),
          reader
            .table('shifts')
            .index('by_residentialUnitId_and_status', (q) =>
              q.eq('residentialUnitId', residentialUnitId).eq('status', 'open')
            )
            .take(OPEN_SHIFTS_LIMIT),
          reader
            .table('visits')
            .index('by_residentialUnitId_and_enteredAt', (q) =>
              q
                .eq('residentialUnitId', residentialUnitId)
                .gte('enteredAt', args.now - VISITS_TODAY_WINDOW_MILLIS)
            )
            .take(VISITS_COUNT_LIMIT),
          // Newest first, so Visitas left open long ago fall off the limit.
          reader
            .table('visits')
            .index(
              'by_residentialUnitId_and_exitedAt',
              (q) =>
                q
                  .eq('residentialUnitId', residentialUnitId)
                  .eq('exitedAt', undefined),
              'desc'
            )
            .take(VISITS_COUNT_LIMIT),
        ],
        { concurrency: 'unbounded' }
      ).pipe(
        Effect.catchTag(['GetByIdFailure', 'DocumentDecodeError'], Effect.die)
      );

      const today = Calendar.toLocalDate(args.now, unit.timeZone);
      const allMemberships = [...residents, ...porters, ...administrators];

      return {
        unit: {
          _id: unit._id,
          name: unit.name,
          city: unit.city,
          timeZone: unit.timeZone,
          visitRetentionMonths: unit.visitRetentionMonths,
        },
        apartmentCount: apartments.length,
        activeResidentCount: residents.filter(
          (resident) => resident.status === 'active'
        ).length,
        porterCount: porters.filter((porter) => porter.status === 'active')
          .length,
        pendingMembershipCount: allMemberships.filter(
          (member) => member.status === 'pending'
        ).length,
        openShiftCount: openShifts.length,
        visitsToday: recentVisits.filter(
          (visit) =>
            Predicate.isUndefined(visit.voidedAt) &&
            Calendar.toLocalDate(visit.enteredAt, unit.timeZone) === today
        ).length,
        visitorsInside: visitsInside.filter((visit) =>
          Predicate.isUndefined(visit.voidedAt)
        ).length,
      };
    })
);

const listApartmentsImpl = FunctionImpl.make(
  databaseSchema,
  residentialUnitsSpec,
  'listApartments',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['resident', 'porter', 'administrator']
      );

      const [apartments, residents] = yield* Effect.all(
        [
          reader
            .table('apartments')
            .index('by_residentialUnitId_and_tower_and_number', (q) =>
              q.eq('residentialUnitId', membership.residentialUnitId)
            )
            .take(APARTMENTS_PER_UNIT_LIMIT),
          reader
            .table('memberships')
            .index('by_residentialUnitId_and_role', (q) =>
              q
                .eq('residentialUnitId', membership.residentialUnitId)
                .eq('role', 'resident')
            )
            .take(MEMBERSHIPS_PER_ROLE_LIMIT),
        ],
        { concurrency: 'unbounded' }
      ).pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

      const activeResidentApartmentIds = residents
        .filter((resident) => resident.status === 'active')
        .map((resident) => resident.apartmentId)
        .filter(Predicate.isNotUndefined);

      const activeResidentCounts = new Map<Id<'apartments'>, number>();
      for (const apartmentId of activeResidentApartmentIds)
        activeResidentCounts.set(
          apartmentId,
          (activeResidentCounts.get(apartmentId) ?? 0) + 1
        );

      const compareNaturally = (left: string, right: string) =>
        left.localeCompare(right, undefined, { numeric: true });

      return [...apartments]
        .sort(
          (left, right) =>
            compareNaturally(left.tower, right.tower) ||
            compareNaturally(left.number, right.number)
        )
        .map((apartment) => ({
          _id: apartment._id,
          tower: apartment.tower,
          number: apartment.number,
          label: ResidentialUnits.formatApartmentLabel(apartment),
          activeResidentCount: activeResidentCounts.get(apartment._id) ?? 0,
        }));
    })
);

const createApartmentsImpl = FunctionImpl.make(
  databaseSchema,
  residentialUnitsSpec,
  'createApartments',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const writer = yield* DatabaseWriter;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['administrator']
      );

      const createdFlags = yield* Effect.forEach(
        [...new Set(args.numbers)],
        (number) =>
          Effect.gen(function* () {
            const existing = yield* reader
              .table('apartments')
              .index('by_residentialUnitId_and_tower_and_number', (q) =>
                q
                  .eq('residentialUnitId', membership.residentialUnitId)
                  .eq('tower', args.tower)
                  .eq('number', number)
              )
              .first()
              .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

            if (Option.isSome(existing)) return false;

            yield* writer
              .table('apartments')
              .insert({
                residentialUnitId: membership.residentialUnitId,
                tower: args.tower,
                number,
              })
              .pipe(Effect.catchTag('DocumentEncodeError', Effect.die));

            return true;
          }),
        { concurrency: 'unbounded' }
      );

      return createdFlags.filter(Boolean).length;
    })
);

const updateImpl = FunctionImpl.make(
  databaseSchema,
  residentialUnitsSpec,
  'update',
  ({ membershipId, ...changes }) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const { membership } = yield* Memberships.requireMembership(
        membershipId,
        ['administrator']
      );

      yield* writer
        .table('residentialUnits')
        .patch(membership.residentialUnitId, changes)
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );

      return null;
    })
);

const listAllImpl = FunctionImpl.make(
  databaseSchema,
  residentialUnitsSpec,
  'listAll',
  () =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      yield* ResidentialUnits.requireSuperadmin();

      const units = yield* reader
        .table('residentialUnits')
        .index('by_name')
        .take(UNITS_LIMIT)
        .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

      return yield* Effect.forEach(
        units,
        (unit) =>
          Effect.gen(function* () {
            const [administrators, apartments] = yield* Effect.all(
              [
                reader
                  .table('memberships')
                  .index('by_residentialUnitId_and_role', (q) =>
                    q
                      .eq('residentialUnitId', unit._id)
                      .eq('role', 'administrator')
                  )
                  .take(ADMINISTRATORS_PER_UNIT_LIMIT),
                reader
                  .table('apartments')
                  .index('by_residentialUnitId_and_tower_and_number', (q) =>
                    q.eq('residentialUnitId', unit._id)
                  )
                  .take(APARTMENTS_PER_UNIT_LIMIT),
              ],
              { concurrency: 'unbounded' }
            ).pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

            return {
              _id: unit._id,
              name: unit.name,
              city: unit.city,
              timeZone: unit.timeZone,
              visitRetentionMonths: unit.visitRetentionMonths,
              administratorEmails: administrators
                .filter((administrator) => administrator.status !== 'revoked')
                .map((administrator) => administrator.email),
              apartmentCount: apartments.length,
            };
          }),
        { concurrency: 'unbounded' }
      );
    })
);

/** The Administrador invitation fails the whole mutation, so no unit is orphaned. */
const createImpl = FunctionImpl.make(
  databaseSchema,
  residentialUnitsSpec,
  'create',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      yield* ResidentialUnits.requireSuperadmin();

      const residentialUnitId = yield* writer
        .table('residentialUnits')
        .insert({
          name: args.name,
          city: args.city,
          timeZone: Calendar.DEFAULT_TIME_ZONE,
          visitRetentionMonths: ResidentialUnits.DEFAULT_VISIT_RETENTION_MONTHS,
        })
        .pipe(Effect.catchTag('DocumentEncodeError', Effect.die));

      yield* Memberships.inviteMember(residentialUnitId, {
        email: args.administratorEmail,
        displayName: args.administratorName,
        role: 'administrator',
      }).pipe(
        // A brand-new unit holds neither Apartamentos nor Membresías.
        Effect.catchTag(
          [
            'Memberships/MembershipAlreadyExistsError',
            'ResidentialUnits/ApartmentNotFoundError',
          ],
          Effect.die
        )
      );

      return residentialUnitId;
    })
);

// -*******************************************************************************-
// Internal
// -*******************************************************************************-

const grantSuperadminImpl = FunctionImpl.make(
  databaseSchema,
  residentialUnitsSpec,
  'grantSuperadmin',
  (args) => ResidentialUnits.grantSuperadmin(args.email).pipe(Effect.as(null))
);

// -*******************************************************************************-
// API
// -*******************************************************************************-

export default GroupImpl.make(databaseSchema, residentialUnitsSpec).pipe(
  Layer.provide(getOverviewImpl),
  Layer.provide(listApartmentsImpl),
  Layer.provide(createApartmentsImpl),
  Layer.provide(updateImpl),
  Layer.provide(listAllImpl),
  Layer.provide(createImpl),
  Layer.provide(grantSuperadminImpl),
  Layer.provide(RequireUserIdentity),
  GroupImpl.finalize
);
