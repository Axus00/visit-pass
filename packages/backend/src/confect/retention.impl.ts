import { FunctionImpl, GroupImpl } from '@confect/server';
import * as Clock from 'effect/Clock';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import refs from './_generated/refs';
import databaseSchema from './_generated/schema';
import { DatabaseReader, Scheduler } from './_generated/services';
import * as Calendar from './modules/calendar';
import * as Retention from './modules/retention';
import retentionSpec from './retention.spec';

/** Unidades residenciales fanned out per transaction. */
const UNITS_PER_BATCH = 50;

// -*******************************************************************************-
// Internal
// -*******************************************************************************-

/**
 * Every sweep is a batched internal mutation that reschedules itself while
 * work remains. Continuations carry the first run's cutoff, so a paginated
 * cursor always resumes the same index range; the Visita sweep needs none,
 * since anonymizing a Visita moves it out of the range it reads.
 */
const runImpl = FunctionImpl.make(databaseSchema, retentionSpec, 'run', () =>
  Effect.gen(function* () {
    const scheduler = yield* Scheduler;

    const now = yield* Clock.currentTimeMillis;

    yield* Effect.all(
      [
        scheduler.runAfter(Duration.zero, refs.internal.retention.sweepUnits, {
          now,
          cursor: null,
        }),
        scheduler.runAfter(
          Duration.zero,
          refs.internal.retention.purgeShiftReports,
          { cutoff: Retention.toShiftReportRetentionCutoff(now) }
        ),
      ],
      { concurrency: 'unbounded', discard: true }
    );

    return null;
  })
);

const sweepUnitsImpl = FunctionImpl.make(
  databaseSchema,
  retentionSpec,
  'sweepUnits',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const scheduler = yield* Scheduler;

      const page = yield* reader
        .table('residentialUnits')
        .index('by_creation_time')
        .paginate({ numItems: UNITS_PER_BATCH, cursor: args.cursor })
        .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

      yield* Effect.forEach(
        page.page,
        (unit) => {
          const visitCutoff = Retention.toVisitRetentionCutoff({
            now: args.now,
            visitRetentionMonths: unit.visitRetentionMonths,
          });

          return Effect.all(
            [
              scheduler.runAfter(
                Duration.zero,
                refs.internal.retention.anonymizeVisits,
                {
                  residentialUnitId: unit._id,
                  cutoff: visitCutoff,
                  today: Calendar.toLocalDate(args.now, unit.timeZone),
                }
              ),
              scheduler.runAfter(
                Duration.zero,
                refs.internal.retention.purgeUnusedPasses,
                {
                  residentialUnitId: unit._id,
                  cutoffDate: Retention.toUnusedPassCutoffDate({
                    now: args.now,
                    timeZone: unit.timeZone,
                  }),
                  visitCutoff,
                  cursor: null,
                }
              ),
            ],
            { concurrency: 'unbounded', discard: true }
          );
        },
        { concurrency: 'unbounded', discard: true }
      );

      if (!page.isDone)
        yield* scheduler.runAfter(
          Duration.zero,
          refs.internal.retention.sweepUnits,
          { now: args.now, cursor: page.continueCursor }
        );

      return null;
    })
);

const anonymizeVisitsImpl = FunctionImpl.make(
  databaseSchema,
  retentionSpec,
  'anonymizeVisits',
  (args) =>
    Effect.gen(function* () {
      const scheduler = yield* Scheduler;

      const mayHaveMore = yield* Retention.anonymizeVisitsBatch(args);

      if (mayHaveMore)
        yield* scheduler.runAfter(
          Duration.zero,
          refs.internal.retention.anonymizeVisits,
          args
        );

      return null;
    })
);

const purgeUnusedPassesImpl = FunctionImpl.make(
  databaseSchema,
  retentionSpec,
  'purgeUnusedPasses',
  (args) =>
    Effect.gen(function* () {
      const scheduler = yield* Scheduler;

      const progress = yield* Retention.purgeUnusedPassesPage(args);

      if (!progress.isDone)
        yield* scheduler.runAfter(
          Duration.zero,
          refs.internal.retention.purgeUnusedPasses,
          { ...args, cursor: progress.continueCursor }
        );

      return null;
    })
);

const purgeShiftReportsImpl = FunctionImpl.make(
  databaseSchema,
  retentionSpec,
  'purgeShiftReports',
  (args) =>
    Effect.gen(function* () {
      const scheduler = yield* Scheduler;

      const mayHaveMore = yield* Retention.purgeShiftReportsBatch(args.cutoff);

      if (mayHaveMore)
        yield* scheduler.runAfter(
          Duration.zero,
          refs.internal.retention.purgeShiftReports,
          args
        );

      return null;
    })
);

// -*******************************************************************************-
// API
// -*******************************************************************************-

export default GroupImpl.make(databaseSchema, retentionSpec).pipe(
  Layer.provide(runImpl),
  Layer.provide(sweepUnitsImpl),
  Layer.provide(anonymizeVisitsImpl),
  Layer.provide(purgeUnusedPassesImpl),
  Layer.provide(purgeShiftReportsImpl),

  GroupImpl.finalize
);
