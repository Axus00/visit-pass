import { describe, it } from '@effect/vitest';
import * as EffectVitestUtils from '@effect/vitest/utils';
import type { GenericId } from 'convex/values';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';

import { Id } from './_generated/id';
import refs from './_generated/refs';
import { DatabaseReader, DatabaseWriter } from './_generated/services';
import * as Calendar from './modules/calendar';
import * as Retention from './modules/retention';
import * as TestConfect from './test.setup';

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
const TIME_ZONE = 'America/Bogota';

/**
 * The clock the functions under test read; `it.effect` swaps Effect's clock
 * for a TestClock.
 */
// oxlint-disable-next-line effecttsgo/global-date -- Must match the real clock convex-test runs functions with.
const wallClockMillis = () => Date.now();

const localDateFromToday = (days: number) =>
  Calendar.addDays(Calendar.toLocalDate(wallClockMillis(), TIME_ZONE), days);

const World = Schema.Struct({
  oldVisitA: Id('visits'),
  oldVoidedVisitA: Id('visits'),
  recentVisitA: Id('visits'),
  oldVisitB: Id('visits'),
  usedPass: Id('passes'),
  unusedPassOfUsedAuthorization: Id('passes'),
  forcedEntryPass: Id('passes'),
  expiredAuthorization: Id('authorizations'),
  unusedPassOfExpiredAuthorization: Id('passes'),
  recentAuthorization: Id('authorizations'),
  unusedPassOfRecentAuthorization: Id('passes'),
});

/**
 * Unit A keeps Visitas 3 months, unit B 12. Both get a Visita from 100 days
 * ago; unit A also gets a recent one, a voided old one, and Autorizaciones
 * that ended 40 and 5 days ago.
 */
const seedWorld = Effect.gen(function* () {
  const confect = yield* TestConfect.TestConfect;
  const now = wallClockMillis();

  return yield* confect.run(
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const seedUnit = Effect.fn(function* (visitRetentionMonths: number) {
        const unitId = yield* writer.table('residentialUnits').insert({
          name: `Unidad ${visitRetentionMonths}`,
          city: 'Bogotá',
          timeZone: TIME_ZONE,
          visitRetentionMonths,
        });
        const apartmentId = yield* writer.table('apartments').insert({
          residentialUnitId: unitId,
          tower: '1',
          number: '101',
        });
        const porterId = yield* writer.table('memberships').insert({
          residentialUnitId: unitId,
          email: `porter-${visitRetentionMonths}@example.test`,
          role: 'porter',
          status: 'active',
        });
        const shiftId = yield* writer.table('shifts').insert({
          residentialUnitId: unitId,
          porterMembershipId: porterId,
          status: 'open',
          startedAt: now - 200 * MILLIS_PER_DAY,
        });

        return { unitId, apartmentId, porterId, shiftId };
      });

      const unitA = yield* seedUnit(3);
      const unitB = yield* seedUnit(12);

      const insertVisit = (
        unit: typeof unitA,
        daysAgo: number,
        extra: { passId?: GenericId<'passes'>; voidedAt?: number } = {}
      ) =>
        writer.table('visits').insert({
          residentialUnitId: unit.unitId,
          apartmentId: unit.apartmentId,
          visitorName: 'Ana Gómez',
          visitorDocument: '99887766',
          plate: 'ABC123',
          visitType: 'temporary',
          origin: Predicate.isUndefined(extra.passId) ? 'manual' : 'pass',
          passId: extra.passId,
          voidedAt: extra.voidedAt,
          voidReason: Predicate.isUndefined(extra.voidedAt)
            ? undefined
            : 'Duplicado',
          shiftId: unit.shiftId,
          entryPorterMembershipId: unit.porterId,
          enteredAt: now - daysAgo * MILLIS_PER_DAY,
          privacyNoticeVersion: 'test',
        });

      const insertAuthorization = (endDate: string) =>
        writer.table('authorizations').insert({
          residentialUnitId: unitA.unitId,
          apartmentId: unitA.apartmentId,
          createdByMembershipId: unitA.porterId,
          type: 'temporary',
          startDate: endDate,
          endDate,
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          status: 'active',
        });

      const insertPass = (
        authorizationId: GenericId<'authorizations'>,
        entryCount: number,
        token: string
      ) =>
        writer.table('passes').insert({
          authorizationId,
          residentialUnitId: unitA.unitId,
          apartmentId: unitA.apartmentId,
          visitorName: 'Luis',
          visitorDocument: '11112222',
          token,
          status: entryCount > 0 ? 'used' : 'active',
          entryCount,
        });

      const usedAuthorization = yield* insertAuthorization(
        localDateFromToday(-40)
      );
      const usedPass = yield* insertPass(usedAuthorization, 1, 'used');
      const unusedPassOfUsedAuthorization = yield* insertPass(
        usedAuthorization,
        0,
        'unused'
      );
      // A forced Registro manual names the rejected Pase without using it.
      const forcedEntryPass = yield* insertPass(usedAuthorization, 0, 'forced');

      const expiredAuthorization = yield* insertAuthorization(
        localDateFromToday(-40)
      );
      const unusedPassOfExpiredAuthorization = yield* insertPass(
        expiredAuthorization,
        0,
        'expired'
      );

      const recentAuthorization = yield* insertAuthorization(
        localDateFromToday(-5)
      );
      const unusedPassOfRecentAuthorization = yield* insertPass(
        recentAuthorization,
        0,
        'recent'
      );

      return {
        oldVisitA: yield* insertVisit(unitA, 100, { passId: usedPass }),
        oldVoidedVisitA: yield* insertVisit(unitA, 100, {
          voidedAt: now - 99 * MILLIS_PER_DAY,
        }),
        recentVisitA: yield* insertVisit(unitA, 10, {
          passId: forcedEntryPass,
        }),
        oldVisitB: yield* insertVisit(unitB, 100),
        usedPass,
        unusedPassOfUsedAuthorization,
        forcedEntryPass,
        expiredAuthorization,
        unusedPassOfExpiredAuthorization,
        recentAuthorization,
        unusedPassOfRecentAuthorization,
      };
    }).pipe(Effect.orDie),
    World
  );
});

const Snapshot = Schema.Struct({
  visits: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        _id: Id('visits'),
        visitorName: Schema.String,
        visitorDocument: Schema.optional(Schema.String),
        plate: Schema.optional(Schema.String),
        isAnonymized: Schema.Boolean,
      })
    )
  ),
  passIds: Schema.mutable(Schema.Array(Id('passes'))),
  authorizationIds: Schema.mutable(Schema.Array(Id('authorizations'))),
});

const readSnapshot = Effect.gen(function* () {
  const confect = yield* TestConfect.TestConfect;

  return yield* confect.run(
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      const [visits, passes, authorizations] = yield* Effect.all([
        reader.table('visits').index('by_creation_time').take(100),
        reader.table('passes').index('by_creation_time').take(100),
        reader.table('authorizations').index('by_creation_time').take(100),
      ]);

      return {
        visits: visits.map((visit) => ({
          _id: visit._id,
          visitorName: visit.visitorName,
          visitorDocument: visit.visitorDocument,
          plate: visit.plate,
          isAnonymized: visit.anonymizedAt !== undefined,
        })),
        passIds: passes.map((pass) => pass._id),
        authorizationIds: authorizations.map(
          (authorization) => authorization._id
        ),
      };
    }).pipe(Effect.orDie),
    Snapshot
  );
});

describe('retention', () => {
  it.effect(
    'anonymizes old Visitas only in the unit whose retention elapsed',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* seedWorld;

        yield* confect.mutation(refs.internal.retention.run, {});
        yield* confect.finishAllScheduledFunctions(() => {});
        // A second daily run finds nothing left to change.
        yield* confect.mutation(refs.internal.retention.run, {});
        yield* confect.finishAllScheduledFunctions(() => {});

        const snapshot = yield* readSnapshot;
        const visits = new Map(
          snapshot.visits.map((visit) => [
            visit._id,
            Object.fromEntries(
              Object.entries(visit).filter(([key]) => key !== '_id')
            ),
          ])
        );
        const anonymized = {
          visitorName: Retention.ANONYMIZED_VISITOR_NAME,
          isAnonymized: true,
        };
        const untouched = {
          visitorName: 'Ana Gómez',
          visitorDocument: '99887766',
          plate: 'ABC123',
          isAnonymized: false,
        };

        EffectVitestUtils.deepStrictEqual(
          visits.get(world.oldVisitA),
          anonymized
        );
        EffectVitestUtils.deepStrictEqual(
          visits.get(world.oldVoidedVisitA),
          anonymized
        );
        EffectVitestUtils.deepStrictEqual(
          visits.get(world.recentVisitA),
          untouched
        );
        EffectVitestUtils.deepStrictEqual(
          visits.get(world.oldVisitB),
          untouched
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'deletes never-used Pases of expired Autorizaciones and the emptied ones',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* seedWorld;

        yield* confect.mutation(refs.internal.retention.run, {});
        yield* confect.finishAllScheduledFunctions(() => {});

        const snapshot = yield* readSnapshot;

        EffectVitestUtils.deepStrictEqual(
          [...snapshot.passIds].sort(),
          [
            world.usedPass,
            world.forcedEntryPass,
            world.unusedPassOfRecentAuthorization,
          ].sort()
        );
        EffectVitestUtils.assertFalse(
          snapshot.authorizationIds.includes(world.expiredAuthorization)
        );
        EffectVitestUtils.assertTrue(
          snapshot.authorizationIds.includes(world.recentAuthorization)
        );
        EffectVitestUtils.strictEqual(snapshot.authorizationIds.length, 2);
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('deletes Reportes de turno created before the cutoff', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const now = wallClockMillis();

      const reportId = yield* confect.run(
        Effect.gen(function* () {
          const writer = yield* DatabaseWriter;

          const unitId = yield* writer.table('residentialUnits').insert({
            name: 'Unidad',
            city: 'Bogotá',
            timeZone: TIME_ZONE,
            visitRetentionMonths: 12,
          });
          const porterId = yield* writer.table('memberships').insert({
            residentialUnitId: unitId,
            email: 'porter@example.test',
            role: 'porter',
            status: 'active',
          });
          const shiftId = yield* writer.table('shifts').insert({
            residentialUnitId: unitId,
            porterMembershipId: porterId,
            status: 'closed',
          });

          return yield* writer.table('shiftReports').insert({
            residentialUnitId: unitId,
            shiftId,
            requestedByMembershipId: porterId,
            fileName: 'reporte.xlsx',
            status: 'failed',
            emailStatus: 'notRequested',
            recipients: [],
          });
        }).pipe(Effect.orDie),
        Id('shiftReports')
      );

      const countReports = confect.run(
        Effect.gen(function* () {
          const reader = yield* DatabaseReader;
          const reports = yield* reader
            .table('shiftReports')
            .index('by_creation_time')
            .take(10);

          return reports.map((report) => report._id);
        }).pipe(Effect.orDie),
        Schema.mutable(Schema.Array(Id('shiftReports')))
      );

      // Too recent for a cutoff 30 days back.
      yield* confect.mutation(refs.internal.retention.purgeShiftReports, {
        cutoff: Retention.toShiftReportRetentionCutoff(now),
      });
      EffectVitestUtils.deepStrictEqual(yield* countReports, [reportId]);

      yield* confect.mutation(refs.internal.retention.purgeShiftReports, {
        cutoff: now + MILLIS_PER_DAY,
      });
      EffectVitestUtils.deepStrictEqual(yield* countReports, []);
    }).pipe(Effect.provide(TestConfect.layer))
  );
});
