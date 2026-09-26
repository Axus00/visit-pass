import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';

import type { Id } from '#convex/_generated/dataModel';

import {
  DatabaseReader,
  DatabaseWriter,
  StorageWriter,
} from '../../../_generated/services';
import type * as CalendarDomain from '../../calendar/domain';
import * as Domain from '../domain';

/** Visitas patched per transaction. */
const VISITS_PER_BATCH = 200;

/** Autorizaciones per transaction; each reads its Pases and their Visitas. */
const AUTHORIZATIONS_PER_BATCH = 25;

/** An Evento holds at most 100 Pases; this leaves headroom. */
const PASSES_PER_AUTHORIZATION_LIMIT = 200;

const SHIFT_REPORTS_PER_BATCH = 100;

/** Where a paginated sweep stops; the caller reschedules when `isDone` is false. */
export interface SweepProgress {
  readonly isDone: boolean;
  readonly continueCursor: string;
}

/**
 * Anonymizes one page of the unit's Visitas that entered before `cutoff`.
 * Anonymized Visitas stay in the index range, so the sweep pages with a cursor
 * instead of re-reading the first batch.
 */
export const anonymizeVisitsPage = Effect.fn('Retention.anonymizeVisitsPage')(
  function* (args: {
    readonly residentialUnitId: Id<'residentialUnits'>;
    readonly cutoff: number;
    readonly cursor: string | null;
  }) {
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;

    const page = yield* reader
      .table('visits')
      .index('by_residentialUnitId_and_enteredAt', (q) =>
        q
          .eq('residentialUnitId', args.residentialUnitId)
          .lt('enteredAt', args.cutoff)
      )
      .paginate({ numItems: VISITS_PER_BATCH, cursor: args.cursor })
      .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

    const now = yield* Clock.currentTimeMillis;

    yield* Effect.forEach(
      page.page.filter((visit) => Predicate.isUndefined(visit.anonymizedAt)),
      (visit) =>
        writer
          .table('visits')
          .patch(visit._id, {
            visitorName: Domain.ANONYMIZED_VISITOR_NAME,
            visitorDocument: undefined,
            plate: undefined,
            anonymizedAt: now,
          })
          .pipe(
            Effect.catchTag(
              ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
              Effect.die
            )
          ),
      { concurrency: 'unbounded', discard: true }
    );

    const progress: SweepProgress = {
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };

    return progress;
  }
);

/**
 * Deletes, for one page of the unit's Autorizaciones that ended before
 * `cutoffDate`, every Pase never used and never referenced by a Visita (a
 * forced Registro manual keeps the rejected Pase's id). An Autorización left
 * without Pases is deleted too: every Visita that names an Autorización also
 * names one of its Pases, so none can still reference it.
 */
export const purgeUnusedPassesPage = Effect.fn(
  'Retention.purgeUnusedPassesPage'
)(function* (args: {
  readonly residentialUnitId: Id<'residentialUnits'>;
  readonly cutoffDate: CalendarDomain.LocalDate;
  readonly cursor: string | null;
}) {
  const reader = yield* DatabaseReader;
  const writer = yield* DatabaseWriter;

  const page = yield* reader
    .table('authorizations')
    .index('by_residentialUnitId_and_endDate', (q) =>
      q
        .eq('residentialUnitId', args.residentialUnitId)
        .lt('endDate', args.cutoffDate)
    )
    .paginate({ numItems: AUTHORIZATIONS_PER_BATCH, cursor: args.cursor })
    .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

  yield* Effect.forEach(
    page.page,
    (authorization) =>
      Effect.gen(function* () {
        const passes = yield* reader
          .table('passes')
          .index('by_authorizationId', (q) =>
            q.eq('authorizationId', authorization._id)
          )
          .take(PASSES_PER_AUTHORIZATION_LIMIT)
          .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

        const deletablePasses = yield* Effect.filter(
          passes.filter((pass) => pass.entryCount === 0),
          (pass) =>
            reader
              .table('visits')
              .index('by_passId_and_exitedAt', (q) => q.eq('passId', pass._id))
              .first()
              .pipe(
                Effect.map(Option.isNone),
                Effect.catchTag('DocumentDecodeError', Effect.die)
              ),
          { concurrency: 'unbounded' }
        );

        yield* Effect.forEach(
          deletablePasses,
          (pass) => writer.table('passes').delete(pass._id),
          { concurrency: 'unbounded', discard: true }
        );

        const isLeftWithoutPasses =
          passes.length < PASSES_PER_AUTHORIZATION_LIMIT &&
          deletablePasses.length === passes.length;

        if (isLeftWithoutPasses)
          yield* writer.table('authorizations').delete(authorization._id);
      }),
    { concurrency: 'unbounded', discard: true }
  );

  const progress: SweepProgress = {
    isDone: page.isDone,
    continueCursor: page.continueCursor,
  };

  return progress;
});

/**
 * Deletes one batch of Reportes de turno created before `cutoff` with their
 * files, oldest first. Answers whether a full batch was deleted, meaning more
 * may remain.
 */
export const purgeShiftReportsBatch = Effect.fn(
  'Retention.purgeShiftReportsBatch'
)(function* (cutoff: number) {
  const reader = yield* DatabaseReader;
  const writer = yield* DatabaseWriter;
  const storageWriter = yield* StorageWriter;

  const reports = yield* reader
    .table('shiftReports')
    .index('by_creation_time', (q) => q.lt('_creationTime', cutoff))
    .take(SHIFT_REPORTS_PER_BATCH)
    .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

  yield* Effect.forEach(
    reports,
    (report) =>
      Effect.gen(function* () {
        if (Predicate.isNotUndefined(report.fileId))
          yield* storageWriter
            .delete(report.fileId)
            .pipe(Effect.catchTag('BlobNotFoundError', () => Effect.void));

        yield* writer.table('shiftReports').delete(report._id);
      }),
    { concurrency: 'unbounded', discard: true }
  );

  return reports.length === SHIFT_REPORTS_PER_BATCH;
});
