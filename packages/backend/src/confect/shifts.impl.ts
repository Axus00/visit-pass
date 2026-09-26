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
            .index('by_porterMembershipId_and_status', (q) =>
              q
                .eq('porterMembershipId', membership._id)
                .eq('status', 'scheduled')
            )
            .take(SCHEDULED_SCAN_LIMIT)
            .pipe(Effect.orDie),
        ],
        { concurrency: 'unbounded' }
      );

      const upcomingShifts = scheduledShifts
        .filter((shift) => (shift.plannedEnd ?? 0) > args.now)
        .toSorted((a, b) => (a.plannedStart ?? 0) - (b.plannedStart ?? 0))
        .slice(0, UPCOMING_LIMIT);

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
 * check is per Membresía.
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

      if (Predicate.isUndefined(args.shiftId))
        return yield* writer
          .table('shifts')
          .insert({
            residentialUnitId: membership.residentialUnitId,
            porterMembershipId: membership._id,
            status: 'open',
            startedAt: now,
          })
          .pipe(Effect.orDie);

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

      if (shift.status !== 'scheduled')
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

/** Open Turnos, then scheduled ones soonest first, then the latest closed. */
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

      const shiftsWithStatus = (status: Shifts.ShiftStatus, limit: number) =>
        reader
          .table('shifts')
          .index(
            'by_residentialUnitId_and_status',
            (q) =>
              q
                .eq('residentialUnitId', membership.residentialUnitId)
                .eq('status', status),
            'desc'
          )
          .take(limit)
          .pipe(Effect.orDie);

      const [openShifts, scheduledShifts, closedShifts] = yield* Effect.all(
        [
          shiftsWithStatus('open', OPEN_FOR_UNIT_LIMIT),
          shiftsWithStatus('scheduled', SCHEDULED_SCAN_LIMIT),
          shiftsWithStatus('closed', CLOSED_FOR_UNIT_LIMIT),
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
