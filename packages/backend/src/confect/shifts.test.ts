import { describe, it } from '@effect/vitest';
import * as EffectVitestUtils from '@effect/vitest/utils';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';

import refs from './_generated/refs';
import * as Memberships from './modules/memberships';
import * as Shifts from './modules/shifts';
import * as PorteriaFixtures from './porteria.fixtures';
import * as TestConfect from './test.setup';

const { shifts, visits } = refs.public;

const MILLIS_PER_HOUR = 60 * 60 * 1000;

describe('shifts', () => {
  it.effect(
    'opens an unplanned Turno once, counts its Visitas and closes it',
    () =>
      Effect.gen(function* () {
        const world = yield* PorteriaFixtures.seedPorteria;
        const porterA = yield* PorteriaFixtures.as('porterA');
        const now = PorteriaFixtures.wallClockMillis();

        const shiftId = yield* porterA.mutation(shifts.start, {
          membershipId: world.porterA,
        });

        const again = yield* Effect.result(
          porterA.mutation(shifts.start, { membershipId: world.porterA })
        );
        EffectVitestUtils.assertFailure(
          again,
          new Shifts.ShiftAlreadyOpenError()
        );

        const firstVisit = yield* porterA.mutation(visits.registerManualEntry, {
          membershipId: world.porterA,
          visitorName: 'Luis',
          visitorDocument: '11112222',
          apartmentId: world.apartmentA101,
          visitType: 'service',
        });
        const mistakenVisit = yield* porterA.mutation(
          visits.registerManualEntry,
          {
            membershipId: world.porterA,
            visitorName: 'Marta',
            visitorDocument: '33334444',
            apartmentId: world.apartmentA102,
            visitType: 'temporary',
          }
        );
        yield* porterA.mutation(visits.registerExit, {
          membershipId: world.porterA,
          visitId: firstVisit,
        });
        yield* porterA.mutation(visits.voidVisit, {
          membershipId: world.porterA,
          visitId: mistakenVisit,
          reason: 'Registro duplicado',
        });

        const state = yield* porterA.query(shifts.getMyState, {
          membershipId: world.porterA,
          now,
        });
        EffectVitestUtils.strictEqual(state.openShift?._id, shiftId);
        EffectVitestUtils.strictEqual(
          state.openShift?.porterName,
          'porterA Test'
        );
        EffectVitestUtils.deepStrictEqual(state.openShiftStats, {
          total: 1,
          fromPass: 0,
          manual: 1,
          temporary: 0,
          event: 0,
          service: 1,
          stillInside: 0,
        });

        yield* porterA.mutation(shifts.end, {
          membershipId: world.porterA,
          shiftId,
        });

        const endAgain = yield* Effect.result(
          porterA.mutation(shifts.end, { membershipId: world.porterA, shiftId })
        );
        EffectVitestUtils.assertFailure(
          endAgain,
          new Shifts.InvalidShiftTransitionError()
        );

        const afterEnd = yield* porterA.query(shifts.getMyState, {
          membershipId: world.porterA,
          now,
        });
        EffectVitestUtils.strictEqual(afterEnd.openShift, null);
        EffectVitestUtils.strictEqual(afterEnd.openShiftStats, null);

        const mine = yield* porterA.query(shifts.listMine, {
          membershipId: world.porterA,
        });
        EffectVitestUtils.deepStrictEqual(
          mine.map((shift) => [shift._id, shift.status]),
          [[shiftId, 'closed']]
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('validates the Turnos an Administrador schedules', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const adminA = yield* PorteriaFixtures.as('adminA');
      const start = PorteriaFixtures.wallClockMillis() + MILLIS_PER_HOUR;

      const schedule = (
        porterMembershipId: typeof world.porterA,
        plannedStart: number,
        plannedEnd: number
      ) =>
        Effect.result(
          adminA.mutation(shifts.schedule, {
            membershipId: world.adminA,
            porterMembershipId,
            plannedStart,
            plannedEnd,
          })
        );

      EffectVitestUtils.assertFailure(
        yield* schedule(world.residentA, start, start + MILLIS_PER_HOUR),
        new Shifts.InvalidShiftScheduleError({ reason: 'notAPorter' })
      );
      EffectVitestUtils.assertFailure(
        yield* schedule(world.porterB, start, start + MILLIS_PER_HOUR),
        new Shifts.InvalidShiftScheduleError({ reason: 'notAPorter' })
      );
      EffectVitestUtils.assertFailure(
        yield* schedule(world.porterA, start, start),
        new Shifts.InvalidShiftScheduleError({ reason: 'endBeforeStart' })
      );
      EffectVitestUtils.assertFailure(
        yield* schedule(world.porterA, start, start + 25 * MILLIS_PER_HOUR),
        new Shifts.InvalidShiftScheduleError({ reason: 'tooLong' })
      );

      const scheduled = yield* schedule(
        world.porterA,
        start,
        start + 8 * MILLIS_PER_HOUR
      );
      EffectVitestUtils.assertTrue(Result.isSuccess(scheduled));
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('starts only the Portero’s own scheduled Turno', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const adminA = yield* PorteriaFixtures.as('adminA');
      const porterA = yield* PorteriaFixtures.as('porterA');
      const porterA2 = yield* PorteriaFixtures.as('porterA2');
      const now = PorteriaFixtures.wallClockMillis();

      const later = yield* adminA.mutation(shifts.schedule, {
        membershipId: world.adminA,
        porterMembershipId: world.porterA,
        plannedStart: now + 10 * MILLIS_PER_HOUR,
        plannedEnd: now + 18 * MILLIS_PER_HOUR,
      });
      const sooner = yield* adminA.mutation(shifts.schedule, {
        membershipId: world.adminA,
        porterMembershipId: world.porterA,
        plannedStart: now + MILLIS_PER_HOUR,
        plannedEnd: now + 9 * MILLIS_PER_HOUR,
      });
      yield* adminA.mutation(shifts.schedule, {
        membershipId: world.adminA,
        porterMembershipId: world.porterA,
        plannedStart: now - 10 * MILLIS_PER_HOUR,
        plannedEnd: now - 2 * MILLIS_PER_HOUR,
      });

      const state = yield* porterA.query(shifts.getMyState, {
        membershipId: world.porterA,
        now,
      });
      EffectVitestUtils.deepStrictEqual(
        state.upcoming.map((shift) => shift._id),
        [sooner, later]
      );

      const othersShift = yield* Effect.result(
        porterA2.mutation(shifts.start, {
          membershipId: world.porterA2,
          shiftId: sooner,
        })
      );
      EffectVitestUtils.assertFailure(
        othersShift,
        new Shifts.ShiftNotFoundError()
      );

      yield* porterA.mutation(shifts.start, {
        membershipId: world.porterA,
        shiftId: sooner,
      });
      yield* porterA.mutation(shifts.end, {
        membershipId: world.porterA,
        shiftId: sooner,
      });

      const restart = yield* Effect.result(
        porterA.mutation(shifts.start, {
          membershipId: world.porterA,
          shiftId: sooner,
        })
      );
      EffectVitestUtils.assertFailure(
        restart,
        new Shifts.InvalidShiftTransitionError()
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'lets the Administrador cancel planned Turnos and force-close open ones',
    () =>
      Effect.gen(function* () {
        const world = yield* PorteriaFixtures.seedPorteria;
        const adminA = yield* PorteriaFixtures.as('adminA');
        const adminB = yield* PorteriaFixtures.as('adminB');
        const porterA = yield* PorteriaFixtures.as('porterA');
        const now = PorteriaFixtures.wallClockMillis();

        const planned = yield* adminA.mutation(shifts.schedule, {
          membershipId: world.adminA,
          porterMembershipId: world.porterA2,
          plannedStart: now + MILLIS_PER_HOUR,
          plannedEnd: now + 9 * MILLIS_PER_HOUR,
        });
        const open = yield* porterA.mutation(shifts.start, {
          membershipId: world.porterA,
        });

        const listed = yield* adminA.query(shifts.listForUnit, {
          membershipId: world.adminA,
        });
        EffectVitestUtils.deepStrictEqual(
          listed.map((shift) => [shift._id, shift.status]),
          [
            [open, 'open'],
            [planned, 'scheduled'],
          ]
        );

        const cancelOpen = yield* Effect.result(
          adminA.mutation(shifts.cancelScheduled, {
            membershipId: world.adminA,
            shiftId: open,
          })
        );
        EffectVitestUtils.assertFailure(
          cancelOpen,
          new Shifts.InvalidShiftTransitionError()
        );

        const otherUnitClose = yield* Effect.result(
          adminB.mutation(shifts.forceClose, {
            membershipId: world.adminB,
            shiftId: open,
          })
        );
        EffectVitestUtils.assertFailure(
          otherUnitClose,
          new Shifts.ShiftNotFoundError()
        );

        yield* adminA.mutation(shifts.cancelScheduled, {
          membershipId: world.adminA,
          shiftId: planned,
        });
        yield* adminA.mutation(shifts.forceClose, {
          membershipId: world.adminA,
          shiftId: open,
        });

        const afterwards = yield* adminA.query(shifts.listForUnit, {
          membershipId: world.adminA,
        });
        EffectVitestUtils.strictEqual(afterwards.length, 1);
        EffectVitestUtils.strictEqual(afterwards[0]?.status, 'closed');
        EffectVitestUtils.strictEqual(
          afterwards[0]?.closedByAdministrator,
          true
        );
        EffectVitestUtils.assertTrue(
          Predicate.isNotUndefined(afterwards[0]?.endedAt)
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('keeps Porteros and Administradores to their own functions', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const porterA = yield* PorteriaFixtures.as('porterA');
      const adminA = yield* PorteriaFixtures.as('adminA');

      const porterSchedules = yield* Effect.result(
        porterA.mutation(shifts.schedule, {
          membershipId: world.porterA,
          porterMembershipId: world.porterA,
          plannedStart: 0,
          plannedEnd: MILLIS_PER_HOUR,
        })
      );
      EffectVitestUtils.assertFailure(
        porterSchedules,
        new Memberships.AccessDeniedError()
      );

      const adminStartsAsPorter = yield* Effect.result(
        adminA.mutation(shifts.start, { membershipId: world.porterA })
      );
      EffectVitestUtils.assertFailure(
        adminStartsAsPorter,
        new Memberships.AccessDeniedError()
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );
});
