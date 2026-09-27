import { FunctionImpl, GroupImpl } from '@confect/server';
import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';

import databaseSchema from './_generated/schema';
import { DatabaseReader, DatabaseWriter } from './_generated/services';
import RequireUserIdentity from './middleware/RequireUserIdentity.impl';
import * as Memberships from './modules/memberships';
import * as Shifts from './modules/shifts';
import shiftsSpec from './shifts.spec';

const UPCOMING_LIMIT = 5;
const SCHEDULED_SCAN_LIMIT = 100;
const LIST_MINE_LIMIT = 20;
const OPEN_FOR_UNIT_LIMIT = 50;
const CLOSED_FOR_UNIT_LIMIT = 30;
/** Counters stop here; a single Turno registering more Visitas is not expected. */
const SHIFT_STATS_VISIT_LIMIT = 1000;
const MILLIS_PER_HOUR = 60 * 60 * 1000;

// -*******************************************************************************-
// Public — Portero
// -*******************************************************************************-

const getMyStateImpl = FunctionImpl.make(
  databaseSchema,
  shiftsSpec,
  'getMyState',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['porter']
      );

      const [openShift, scheduledShifts] = yield* Effect.all(
        [
          Shifts.findOpenShift(membership._id),
          reader
            .table('shifts')
            .index('by_porterMembershipId_and_status_and_plannedEnd', (q) =>
              q
                .eq('porterMembershipId', membership._id)
                .eq('status', 'scheduled')
                .gt('plannedEnd', Shifts.earliestStartablePlannedEnd(args.now))
            )
            .take(SCHEDULED_SCAN_LIMIT)
            .pipe(Effect.orDie),
        ],
        { concurrency: 'unbounded' }
      );

      const upcomingShifts = Shifts.listStartableShifts(
        scheduledShifts,
        args.now
      ).slice(0, UPCOMING_LIMIT);

      const openShiftVisits = Predicate.isNull(openShift)
        ? []
        : yield* reader
            .table('visits')
            .index('by_shiftId', (q) => q.eq('shiftId', openShift._id))
            .take(SHIFT_STATS_VISIT_LIMIT)
            .pipe(Effect.orDie);

      const [openShiftSummaries, upcoming] = yield* Effect.all(
        [
          Shifts.toShiftSummaries(
            Predicate.isNull(openShift) ? [] : [openShift]
          ),
          Shifts.toShiftSummaries(upcomingShifts),
        ],
        { concurrency: 'unbounded' }
      );

      return {
        openShift: openShiftSummaries[0] ?? null,
        openShiftStats: Predicate.isNull(openShift)
          ? null
          : Shifts.summarizeShiftVisits(openShiftVisits),
        upcoming,
      };
    })
);

/**
 * A Portero may hold open Turnos in several units, one per Membresía; the
 * check is per Membresía. A chosen planned Turno starts only inside its
 * startable window (`Shifts.isStartableAt`).
 */
const startImpl = FunctionImpl.make(
  databaseSchema,
  shiftsSpec,
  'start',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const writer = yield* DatabaseWriter;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['porter']
      );

      const openShift = yield* Shifts.findOpenShift(membership._id);
      if (Predicate.isNotNull(openShift))
        return yield* new Shifts.ShiftAlreadyOpenError();

      const now = yield* Clock.currentTimeMillis;

      if (Predicate.isUndefined(args.shiftId)) {
        // Soonest planned end first, so Turnos never started long ago are out
        // of range instead of crowding out the current plan.
        const scheduledShifts = yield* reader
          .table('shifts')
          .index('by_porterMembershipId_and_status_and_plannedEnd', (q) =>
            q
              .eq('porterMembershipId', membership._id)
              .eq('status', 'scheduled')
              .gt('plannedEnd', Shifts.earliestStartablePlannedEnd(now))
          )
          .take(SCHEDULED_SCAN_LIMIT)
          .pipe(Effect.orDie);

        // "Iniciar turno" during a planned Turno starts that one, so the plan
        // and the real start never end up as two separate Turnos.
        const plannedShift = Shifts.findPlannedShiftToStart(
          scheduledShifts,
          now
        );

        if (Predicate.isNotUndefined(plannedShift)) {
          yield* writer
            .table('shifts')
            .patch(plannedShift._id, { status: 'open', startedAt: now })
            .pipe(Effect.orDie);

          return plannedShift._id;
        }

        return yield* writer
          .table('shifts')
          .insert({
            residentialUnitId: membership.residentialUnitId,
            porterMembershipId: membership._id,
            status: 'open',
            startedAt: now,
          })
          .pipe(Effect.orDie);
      }

      const shift = yield* reader
        .table('shifts')
        .get(args.shiftId)
        .pipe(
          Effect.catchTags({
            GetByIdFailure: () => Effect.succeed(null),
            DocumentDecodeError: Effect.die,
          })
        );

      const isOwnShift =
        Predicate.isNotNull(shift) &&
        shift.porterMembershipId === membership._id;
      if (!isOwnShift) return yield* new Shifts.ShiftNotFoundError();

      // Not scheduled, or outside the window around its plan.
      if (!Shifts.isStartableAt(shift, now))
        return yield* new Shifts.InvalidShiftTransitionError();

      yield* writer
        .table('shifts')
        .patch(shift._id, { status: 'open', startedAt: now })
        .pipe(Effect.orDie);

      return shift._id;
    })
);

const endImpl = FunctionImpl.make(databaseSchema, shiftsSpec, 'end', (args) =>
  Effect.gen(function* () {
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;

    const { membership } = yield* Memberships.requireMembership(
      args.membershipId,
      ['porter']
    );

    const shift = yield* reader
      .table('shifts')
      .get(args.shiftId)
      .pipe(
        Effect.catchTags({
          GetByIdFailure: () => Effect.succeed(null),
          DocumentDecodeError: Effect.die,
        })
      );

    const isOwnShift =
      Predicate.isNotNull(shift) && shift.porterMembershipId === membership._id;
    if (!isOwnShift) return yield* new Shifts.ShiftNotFoundError();

    if (shift.status !== 'open')
      return yield* new Shifts.InvalidShiftTransitionError();

    const now = yield* Clock.currentTimeMillis;

    yield* writer
      .table('shifts')
      .patch(shift._id, { status: 'closed', endedAt: now })
      .pipe(Effect.orDie);

    return null;
  })
);

/** Started Turnos (open and closed), latest start first. */
const listMineImpl = FunctionImpl.make(
  databaseSchema,
  shiftsSpec,
  'listMine',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['porter']
      );

      // Scheduled Turnos have no `startedAt`, which sorts below every number.
      const shifts = yield* reader
        .table('shifts')
        .index(
          'by_porterMembershipId_and_startedAt',
          (q) => q.eq('porterMembershipId', membership._id).gte('startedAt', 0),
          'desc'
        )
        .take(LIST_MINE_LIMIT)
        .pipe(Effect.orDie);

      return yield* Shifts.toShiftSummaries(shifts);
    })
);

// -*******************************************************************************-
// Public — Administrador
// -*******************************************************************************-

/**
 * Open Turnos latest start first, then scheduled ones still startable at `now`
 * soonest first, then the latest closed by end.
 */
const listForUnitImpl = FunctionImpl.make(
  databaseSchema,
  shiftsSpec,
  'listForUnit',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['administrator']
      );

      const [openShifts, scheduledShifts, closedShifts] = yield* Effect.all(
        [
          // Latest start first.
          reader
            .table('shifts')
            .index(
              'by_residentialUnitId_and_status_and_startedAt',
              (q) =>
                q
                  .eq('residentialUnitId', membership.residentialUnitId)
                  .eq('status', 'open'),
              'desc'
            )
            .take(OPEN_FOR_UNIT_LIMIT)
            .pipe(Effect.orDie),
          // Soonest planned end first, so the Turnos due next are never
          // crowded out by ones planned far ahead or missed long ago.
          reader
            .table('shifts')
            .index('by_residentialUnitId_and_status_and_plannedEnd', (q) =>
              q
                .eq('residentialUnitId', membership.residentialUnitId)
                .eq('status', 'scheduled')
                .gt('plannedEnd', Shifts.earliestStartablePlannedEnd(args.now))
            )
            .take(SCHEDULED_SCAN_LIMIT)
            .pipe(Effect.orDie),
          // Latest end first, so a Turno planned long ago but closed just now
          // is not crowded out by Turnos created after it.
          reader
            .table('shifts')
            .index(
              'by_residentialUnitId_and_status_and_endedAt',
              (q) =>
                q
                  .eq('residentialUnitId', membership.residentialUnitId)
                  .eq('status', 'closed'),
              'desc'
            )
            .take(CLOSED_FOR_UNIT_LIMIT)
            .pipe(Effect.orDie),
        ],
        { concurrency: 'unbounded' }
      );

      return yield* Shifts.toShiftSummaries([
        ...openShifts,
        ...scheduledShifts.toSorted(
          (a, b) => (a.plannedStart ?? 0) - (b.plannedStart ?? 0)
        ),
        ...closedShifts,
      ]);
    })
);

const scheduleImpl = FunctionImpl.make(
  databaseSchema,
  shiftsSpec,
  'schedule',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const writer = yield* DatabaseWriter;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['administrator']
      );

      const porterMembership = yield* reader
        .table('memberships')
        .get(args.porterMembershipId)
        .pipe(
          Effect.catchTags({
            GetByIdFailure: () => Effect.succeed(null),
            DocumentDecodeError: Effect.die,
          })
        );

      const isActivePorterOfUnit =
        Predicate.isNotNull(porterMembership) &&
        porterMembership.residentialUnitId === membership.residentialUnitId &&
        porterMembership.role === 'porter' &&
        porterMembership.status === 'active';
      if (!isActivePorterOfUnit)
        return yield* new Shifts.InvalidShiftScheduleError({
          reason: 'notAPorter',
        });

      if (args.plannedEnd <= args.plannedStart)
        return yield* new Shifts.InvalidShiftScheduleError({
          reason: 'endBeforeStart',
        });

      const now = yield* Clock.currentTimeMillis;
      if (args.plannedEnd <= now)
        return yield* new Shifts.InvalidShiftScheduleError({
          reason: 'endsInThePast',
        });

      const isTooLong =
        args.plannedEnd - args.plannedStart >
        Shifts.MAX_SHIFT_HOURS * MILLIS_PER_HOUR;
      if (isTooLong)
        return yield* new Shifts.InvalidShiftScheduleError({
          reason: 'tooLong',
        });

      return yield* writer
        .table('shifts')
        .insert({
          residentialUnitId: membership.residentialUnitId,
          porterMembershipId: porterMembership._id,
          plannedStart: args.plannedStart,
          plannedEnd: args.plannedEnd,
          status: 'scheduled',
        })
        .pipe(Effect.orDie);
    })
);

const cancelScheduledImpl = FunctionImpl.make(
  databaseSchema,
  shiftsSpec,
  'cancelScheduled',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['administrator']
      );

      const shift = yield* Shifts.getShiftInUnit(
        args.shiftId,
        membership.residentialUnitId
      );

      if (shift.status !== 'scheduled')
        return yield* new Shifts.InvalidShiftTransitionError();

      yield* writer.table('shifts').delete(shift._id);

      return null;
    })
);

const forceCloseImpl = FunctionImpl.make(
  databaseSchema,
  shiftsSpec,
  'forceClose',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['administrator']
      );

      const shift = yield* Shifts.getShiftInUnit(
        args.shiftId,
        membership.residentialUnitId
      );

      if (shift.status !== 'open')
        return yield* new Shifts.InvalidShiftTransitionError();

      const now = yield* Clock.currentTimeMillis;

      yield* writer
        .table('shifts')
        .patch(shift._id, {
          status: 'closed',
          endedAt: now,
          closedByMembershipId: membership._id,
        })
        .pipe(Effect.orDie);

      return null;
    })
);

// -*******************************************************************************-
// API
// -*******************************************************************************-

export default GroupImpl.make(databaseSchema, shiftsSpec).pipe(
  Layer.provide(getMyStateImpl),
  Layer.provide(startImpl),
  Layer.provide(endImpl),
  Layer.provide(listMineImpl),
  Layer.provide(listForUnitImpl),
  Layer.provide(scheduleImpl),
  Layer.provide(cancelScheduledImpl),
  Layer.provide(forceCloseImpl),
  Layer.provide(RequireUserIdentity),

  GroupImpl.finalize
);
