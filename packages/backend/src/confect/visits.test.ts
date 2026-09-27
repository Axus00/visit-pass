import { describe, it } from '@effect/vitest';
import * as EffectVitestUtils from '@effect/vitest/utils';
import * as Effect from 'effect/Effect';

import refs from './_generated/refs';
import * as Authorizations from './modules/authorizations';
import * as Calendar from './modules/calendar';
import * as Memberships from './modules/memberships';
import * as ResidentialUnits from './modules/residentialUnits';
import * as Shifts from './modules/shifts';
import * as Visits from './modules/visits';
import * as PorteriaFixtures from './porteria.fixtures';
import * as TestConfect from './test.setup';

const { authorizations, shifts, visits } = refs.public;

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

/** Residente `residentA` authorizes Visitantes to Torre 1 · 101 in unit A. */
const authorizeInA = Effect.fn('authorizeInA')(function* (
  world: PorteriaFixtures.Porteria,
  input: Omit<Authorizations.CreateAuthorizationDto, 'startDate'> & {
    readonly startDate?: Calendar.LocalDate;
  }
) {
  const residentA = yield* PorteriaFixtures.as('residentA');

  return yield* residentA.mutation(authorizations.create, {
    membershipId: world.residentA,
    ...input,
    startDate: input.startDate ?? PorteriaFixtures.localDateFromToday(0),
  });
});

const tokenOf = (created: Authorizations.CreatedAuthorization, index = 0) =>
  created.passes[index]?.token ?? '';

/** Portero `porterA` opens an unplanned Turno in unit A. */
const openShiftForPorterA = Effect.fn('openShiftForPorterA')(function* (
  world: PorteriaFixtures.Porteria
) {
  const porterA = yield* PorteriaFixtures.as('porterA');

  return yield* porterA.mutation(shifts.start, { membershipId: world.porterA });
});

describe('visits', () => {
  it.effect('uses a Temporal Pase up after its single Ingreso', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const porterA = yield* PorteriaFixtures.as('porterA');
      yield* openShiftForPorterA(world);

      const created = yield* authorizeInA(world, {
        type: 'temporary',
        visitors: [{ name: 'Ana', document: '1234567890' }],
      });
      const now = PorteriaFixtures.wallClockMillis();

      const preview = yield* porterA.query(visits.resolvePass, {
        membershipId: world.porterA,
        token: tokenOf(created),
        now,
      });
      EffectVitestUtils.strictEqual(preview.outcome, 'admissible');

      yield* porterA.mutation(visits.registerPassEntry, {
        membershipId: world.porterA,
        token: tokenOf(created),
        plate: 'ABC123',
      });

      const afterEntry = yield* porterA.query(visits.resolvePass, {
        membershipId: world.porterA,
        token: tokenOf(created),
        now,
      });
      EffectVitestUtils.deepStrictEqual(
        afterEntry.outcome === 'rejected' ? afterEntry.reason : undefined,
        'alreadyUsed'
      );

      const secondEntry = yield* Effect.result(
        porterA.mutation(visits.registerPassEntry, {
          membershipId: world.porterA,
          token: tokenOf(created),
        })
      );
      EffectVitestUtils.assertFailure(
        secondEntry,
        new Visits.PassRejectedError({ reason: 'alreadyUsed' })
      );

      const inside = yield* porterA.query(visits.listInside, {
        membershipId: world.porterA,
      });
      EffectVitestUtils.strictEqual(inside.length, 1);
      EffectVitestUtils.strictEqual(inside[0]?.visitorDocument, '1234567890');
      EffectVitestUtils.strictEqual(inside[0]?.plate, 'ABC123');
      EffectVitestUtils.strictEqual(inside[0]?.origin, 'pass');
      EffectVitestUtils.strictEqual(inside[0]?.visitType, 'temporary');
      EffectVitestUtils.strictEqual(inside[0]?.apartmentLabel, 'Torre 1 · 101');
      EffectVitestUtils.strictEqual(inside[0]?.entryPorterName, 'porterA Test');
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'admits a Servicio several times on an allowed day, once inside at a time',
    () =>
      Effect.gen(function* () {
        const world = yield* PorteriaFixtures.seedPorteria;
        const porterA = yield* PorteriaFixtures.as('porterA');
        yield* openShiftForPorterA(world);

        const created = yield* authorizeInA(world, {
          type: 'service',
          endDate: PorteriaFixtures.localDateFromToday(30),
          weekdays: Authorizations.ALL_WEEKDAYS,
          visitors: [{ name: 'Jardinero', document: '98765432' }],
        });

        const firstVisit = yield* porterA.mutation(visits.registerPassEntry, {
          membershipId: world.porterA,
          token: tokenOf(created),
        });

        const whileInside = yield* Effect.result(
          porterA.mutation(visits.registerPassEntry, {
            membershipId: world.porterA,
            token: tokenOf(created),
          })
        );
        EffectVitestUtils.assertFailure(
          whileInside,
          new Visits.PassRejectedError({ reason: 'alreadyInside' })
        );

        yield* porterA.mutation(visits.registerExit, {
          membershipId: world.porterA,
          visitId: firstVisit,
        });
        yield* porterA.mutation(visits.registerPassEntry, {
          membershipId: world.porterA,
          token: tokenOf(created),
        });

        const residentA = yield* PorteriaFixtures.as('residentA');
        const [listed] = yield* residentA.query(
          authorizations.listForApartment,
          {
            membershipId: world.residentA,
            now: PorteriaFixtures.wallClockMillis(),
          }
        );
        EffectVitestUtils.strictEqual(listed?.passes[0]?.entryCount, 2);
        EffectVitestUtils.strictEqual(listed?.passes[0]?.status, 'active');
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('rejects a Servicio on a weekday it does not allow', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const porterA = yield* PorteriaFixtures.as('porterA');
      yield* openShiftForPorterA(world);

      const todayWeekday = Calendar.weekdayOf(
        PorteriaFixtures.localDateFromToday(0)
      );
      const created = yield* authorizeInA(world, {
        type: 'service',
        endDate: PorteriaFixtures.localDateFromToday(14),
        weekdays: Authorizations.ALL_WEEKDAYS.filter(
          (weekday) => weekday !== todayWeekday
        ),
        visitors: [{ name: 'Jardinero' }],
      });

      const entry = yield* Effect.result(
        porterA.mutation(visits.registerPassEntry, {
          membershipId: world.porterA,
          token: tokenOf(created),
        })
      );
      EffectVitestUtils.assertFailure(
        entry,
        new Visits.PassRejectedError({ reason: 'weekdayNotAllowed' })
      );

      const now = PorteriaFixtures.wallClockMillis();
      const tomorrow = yield* porterA.query(visits.resolvePass, {
        membershipId: world.porterA,
        token: tokenOf(created),
        now: now + MILLIS_PER_DAY,
      });
      EffectVitestUtils.strictEqual(tomorrow.outcome, 'admissible');
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('admits each Evento guest once with their own Pase', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const porterA = yield* PorteriaFixtures.as('porterA');
      yield* openShiftForPorterA(world);

      const created = yield* authorizeInA(world, {
        type: 'event',
        eventName: 'Cumpleaños',
        visitors: [{ name: 'Ana' }, { name: 'Luis' }],
      });

      yield* porterA.mutation(visits.registerPassEntry, {
        membershipId: world.porterA,
        token: tokenOf(created, 0),
      });
      yield* porterA.mutation(visits.registerPassEntry, {
        membershipId: world.porterA,
        token: tokenOf(created, 1),
      });

      const repeated = yield* Effect.result(
        porterA.mutation(visits.registerPassEntry, {
          membershipId: world.porterA,
          token: tokenOf(created, 0),
        })
      );
      EffectVitestUtils.assertFailure(
        repeated,
        new Visits.PassRejectedError({ reason: 'alreadyUsed' })
      );

      const recent = yield* porterA.query(visits.listRecentForUnit, {
        membershipId: world.porterA,
      });
      EffectVitestUtils.deepStrictEqual(
        recent.map((visit) => visit.visitorName).toSorted(),
        ['Ana', 'Luis']
      );
      EffectVitestUtils.assertTrue(
        recent.every((visit) => visit.visitType === 'event')
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('rejects Pases outside their day and cancelled ones', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const porterA = yield* PorteriaFixtures.as('porterA');
      const residentA = yield* PorteriaFixtures.as('residentA');
      yield* openShiftForPorterA(world);
      const now = PorteriaFixtures.wallClockMillis();

      const tomorrowPass = yield* authorizeInA(world, {
        type: 'temporary',
        startDate: PorteriaFixtures.localDateFromToday(1),
        visitors: [{ name: 'Ana' }],
      });

      const resolveAt = (at: number) =>
        porterA
          .query(visits.resolvePass, {
            membershipId: world.porterA,
            token: tokenOf(tomorrowPass),
            now: at,
          })
          .pipe(
            Effect.map((resolution) =>
              resolution.outcome === 'rejected'
                ? resolution.reason
                : resolution.outcome
            )
          );

      EffectVitestUtils.strictEqual(yield* resolveAt(now), 'notYetValid');
      EffectVitestUtils.strictEqual(
        yield* resolveAt(now + MILLIS_PER_DAY),
        'admissible'
      );
      EffectVitestUtils.strictEqual(
        yield* resolveAt(now + 2 * MILLIS_PER_DAY),
        'expired'
      );

      const earlyEntry = yield* Effect.result(
        porterA.mutation(visits.registerPassEntry, {
          membershipId: world.porterA,
          token: tokenOf(tomorrowPass),
        })
      );
      EffectVitestUtils.assertFailure(
        earlyEntry,
        new Visits.PassRejectedError({ reason: 'notYetValid' })
      );

      const todayPass = yield* authorizeInA(world, {
        type: 'temporary',
        visitors: [{ name: 'Luis' }],
      });
      yield* residentA.mutation(authorizations.cancel, {
        membershipId: world.residentA,
        authorizationId: todayPass.authorizationId,
      });

      const cancelledEntry = yield* Effect.result(
        porterA.mutation(visits.registerPassEntry, {
          membershipId: world.porterA,
          token: tokenOf(todayPass),
        })
      );
      EffectVitestUtils.assertFailure(
        cancelledEntry,
        new Visits.PassRejectedError({ reason: 'cancelled' })
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'requires the Portero’s own open Turno to register an Ingreso',
    () =>
      Effect.gen(function* () {
        const world = yield* PorteriaFixtures.seedPorteria;
        const porterA2 = yield* PorteriaFixtures.as('porterA2');
        // Another Portero's open Turno does not count.
        yield* openShiftForPorterA(world);

        const created = yield* authorizeInA(world, {
          type: 'temporary',
          visitors: [{ name: 'Ana' }],
        });

        const passEntry = yield* Effect.result(
          porterA2.mutation(visits.registerPassEntry, {
            membershipId: world.porterA2,
            token: tokenOf(created),
          })
        );
        EffectVitestUtils.assertFailure(
          passEntry,
          new Shifts.NoOpenShiftError()
        );

        const manualEntry = yield* Effect.result(
          porterA2.mutation(visits.registerManualEntry, {
            membershipId: world.porterA2,
            visitorName: 'Luis',
            visitorDocument: '11112222',
            apartmentId: world.apartmentA101,
            visitType: 'temporary',
          })
        );
        EffectVitestUtils.assertFailure(
          manualEntry,
          new Shifts.NoOpenShiftError()
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'records the overridden rejection of a forced Registro manual',
    () =>
      Effect.gen(function* () {
        const world = yield* PorteriaFixtures.seedPorteria;
        const porterA = yield* PorteriaFixtures.as('porterA');
        yield* openShiftForPorterA(world);

        const used = yield* authorizeInA(world, {
          type: 'temporary',
          visitors: [{ name: 'Ana', document: '1234567890' }],
        });
        yield* porterA.mutation(visits.registerPassEntry, {
          membershipId: world.porterA,
          token: tokenOf(used),
        });
        const admissible = yield* authorizeInA(world, {
          type: 'temporary',
          visitors: [{ name: 'Luis' }],
        });

        yield* porterA.mutation(visits.registerManualEntry, {
          membershipId: world.porterA,
          visitorName: 'Ana',
          visitorDocument: '1234567890',
          apartmentId: world.apartmentA101,
          visitType: 'temporary',
          rejectedPassToken: tokenOf(used),
        });
        yield* porterA.mutation(visits.registerManualEntry, {
          membershipId: world.porterA,
          visitorName: 'Luis',
          visitorDocument: '55556666',
          apartmentId: world.apartmentA101,
          visitType: 'temporary',
          rejectedPassToken: tokenOf(admissible),
        });

        const recent = yield* porterA.query(visits.listRecentForUnit, {
          membershipId: world.porterA,
        });
        const manual = recent.filter((visit) => visit.origin === 'manual');
        EffectVitestUtils.deepStrictEqual(
          manual.map((visit) => [visit.visitorName, visit.overriddenRejection]),
          [
            ['Luis', undefined],
            ['Ana', 'alreadyUsed'],
          ]
        );

        const otherUnitApartment = yield* Effect.result(
          porterA.mutation(visits.registerManualEntry, {
            membershipId: world.porterA,
            visitorName: 'Marta',
            visitorDocument: '77778888',
            apartmentId: world.apartmentB101,
            visitType: 'temporary',
          })
        );
        EffectVitestUtils.assertFailure(
          otherUnitApartment,
          new ResidentialUnits.ApartmentNotFoundError()
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('registers a Salida once, only inside the unit', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const porterA = yield* PorteriaFixtures.as('porterA');
      const porterA2 = yield* PorteriaFixtures.as('porterA2');
      const porterB = yield* PorteriaFixtures.as('porterB');
      yield* openShiftForPorterA(world);

      const visitId = yield* porterA.mutation(visits.registerManualEntry, {
        membershipId: world.porterA,
        visitorName: 'Luis',
        visitorDocument: '11112222',
        apartmentId: world.apartmentA101,
        visitType: 'temporary',
      });

      const fromOtherUnit = yield* Effect.result(
        porterB.mutation(visits.registerExit, {
          membershipId: world.porterB,
          visitId,
        })
      );
      EffectVitestUtils.assertFailure(
        fromOtherUnit,
        new Visits.VisitNotFoundError()
      );

      // Any Portero of the unit may register it, without an open Turno.
      yield* porterA2.mutation(visits.registerExit, {
        membershipId: world.porterA2,
        visitId,
      });

      const twice = yield* Effect.result(
        porterA.mutation(visits.registerExit, {
          membershipId: world.porterA,
          visitId,
        })
      );
      EffectVitestUtils.assertFailure(
        twice,
        new Visits.VisitAlreadyExitedError()
      );

      const inside = yield* porterA.query(visits.listInside, {
        membershipId: world.porterA,
      });
      EffectVitestUtils.strictEqual(inside.length, 0);
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('shows Residentes only their Apartamento, documents masked', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const porterA = yield* PorteriaFixtures.as('porterA');
      const coResidentA = yield* PorteriaFixtures.as('coResidentA');
      const residentA102 = yield* PorteriaFixtures.as('residentA102');
      const adminA = yield* PorteriaFixtures.as('adminA');
      yield* openShiftForPorterA(world);

      yield* porterA.mutation(visits.registerManualEntry, {
        membershipId: world.porterA,
        visitorName: 'Luis',
        visitorDocument: '1012345678',
        apartmentId: world.apartmentA101,
        visitType: 'service',
      });

      const forApartment = yield* coResidentA.query(visits.listForApartment, {
        membershipId: world.coResidentA,
      });
      EffectVitestUtils.strictEqual(forApartment.length, 1);
      EffectVitestUtils.strictEqual(
        forApartment[0]?.visitorDocument,
        '••••5678'
      );

      const otherApartment = yield* residentA102.query(
        visits.listForApartment,
        { membershipId: world.residentA102 }
      );
      EffectVitestUtils.strictEqual(otherApartment.length, 0);

      const forAdministrator = yield* adminA.query(visits.listRecentForUnit, {
        membershipId: world.adminA,
      });
      EffectVitestUtils.strictEqual(
        forAdministrator[0]?.visitorDocument,
        '1012345678'
      );

      const residentReadsUnit = yield* Effect.result(
        coResidentA.query(visits.listInside, {
          membershipId: world.coResidentA,
        })
      );
      EffectVitestUtils.assertFailure(
        residentReadsUnit,
        new Memberships.AccessDeniedError()
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('rejects the old QR of a regenerated Pase as replaced', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const porterA = yield* PorteriaFixtures.as('porterA');
      const residentA = yield* PorteriaFixtures.as('residentA');
      yield* openShiftForPorterA(world);

      const created = yield* authorizeInA(world, {
        type: 'temporary',
        visitors: [{ name: 'Ana' }],
      });
      const replacement = yield* residentA.mutation(
        authorizations.regeneratePass,
        { membershipId: world.residentA, passId: created.passes[0]!._id }
      );

      const oldEntry = yield* Effect.result(
        porterA.mutation(visits.registerPassEntry, {
          membershipId: world.porterA,
          token: tokenOf(created),
        })
      );
      EffectVitestUtils.assertFailure(
        oldEntry,
        new Visits.PassRejectedError({ reason: 'replaced' })
      );

      yield* porterA.mutation(visits.registerPassEntry, {
        membershipId: world.porterA,
        token: replacement.token,
      });
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('keeps a Visitante inside across a regenerated Servicio Pase', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const porterA = yield* PorteriaFixtures.as('porterA');
      const residentA = yield* PorteriaFixtures.as('residentA');
      yield* openShiftForPorterA(world);

      const created = yield* authorizeInA(world, {
        type: 'service',
        endDate: PorteriaFixtures.localDateFromToday(30),
        weekdays: Authorizations.ALL_WEEKDAYS,
        visitors: [{ name: 'Jardinero', document: '98765432' }],
      });
      const visitId = yield* porterA.mutation(visits.registerPassEntry, {
        membershipId: world.porterA,
        token: tokenOf(created),
      });

      const first = yield* residentA.mutation(authorizations.regeneratePass, {
        membershipId: world.residentA,
        passId: created.passes[0]!._id,
      });
      const second = yield* residentA.mutation(authorizations.regeneratePass, {
        membershipId: world.residentA,
        passId: first._id,
      });

      const whileInside = yield* Effect.result(
        porterA.mutation(visits.registerPassEntry, {
          membershipId: world.porterA,
          token: second.token,
        })
      );
      EffectVitestUtils.assertFailure(
        whileInside,
        new Visits.PassRejectedError({ reason: 'alreadyInside' })
      );

      yield* porterA.mutation(visits.registerExit, {
        membershipId: world.porterA,
        visitId,
      });
      yield* porterA.mutation(visits.registerPassEntry, {
        membershipId: world.porterA,
        token: second.token,
      });
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'lists Visitantes inside latest Ingreso first, not voided ones',
    () =>
      Effect.gen(function* () {
        const world = yield* PorteriaFixtures.seedPorteria;
        const porterA = yield* PorteriaFixtures.as('porterA');
        yield* openShiftForPorterA(world);

        const enter = (visitorName: string) =>
          porterA.mutation(visits.registerManualEntry, {
            membershipId: world.porterA,
            visitorName,
            visitorDocument: '11112222',
            apartmentId: world.apartmentA101,
            visitType: 'temporary',
          });

        yield* enter('Luis');
        const mistaken = yield* enter('Marta');
        yield* enter('Ana');
        yield* porterA.mutation(visits.voidVisit, {
          membershipId: world.porterA,
          visitId: mistaken,
          reason: 'Registro duplicado',
        });

        const inside = yield* porterA.query(visits.listInside, {
          membershipId: world.porterA,
        });
        EffectVitestUtils.deepStrictEqual(
          inside.map((visit) => visit.visitorName),
          ['Ana', 'Luis']
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('lets the Portero complete a document the Pase lacks', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const porterA = yield* PorteriaFixtures.as('porterA');
      yield* openShiftForPorterA(world);

      const created = yield* authorizeInA(world, {
        type: 'event',
        visitors: [{ name: 'Ana' }, { name: 'Luis', document: '1234567890' }],
      });

      yield* porterA.mutation(visits.registerPassEntry, {
        membershipId: world.porterA,
        token: tokenOf(created, 0),
        visitorDocument: '55556666',
      });
      yield* porterA.mutation(visits.registerPassEntry, {
        membershipId: world.porterA,
        token: tokenOf(created, 1),
        visitorDocument: '99990000',
      });

      const inside = yield* porterA.query(visits.listInside, {
        membershipId: world.porterA,
      });
      EffectVitestUtils.deepStrictEqual(
        Object.fromEntries(
          inside.map((visit) => [visit.visitorName, visit.visitorDocument])
        ),
        { Ana: '55556666', Luis: '1234567890' }
      );

      const residentA = yield* PorteriaFixtures.as('residentA');
      const [listed] = yield* residentA.query(authorizations.listForApartment, {
        membershipId: world.residentA,
        now: PorteriaFixtures.wallClockMillis(),
      });
      EffectVitestUtils.strictEqual(
        listed?.passes.find((pass) => pass.visitorName === 'Ana')
          ?.visitorDocument,
        undefined
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('voids a mistaken Visita once and frees its Temporal Pase', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const porterA = yield* PorteriaFixtures.as('porterA');
      const adminA = yield* PorteriaFixtures.as('adminA');
      const porterB = yield* PorteriaFixtures.as('porterB');
      yield* openShiftForPorterA(world);

      const created = yield* authorizeInA(world, {
        type: 'temporary',
        visitors: [{ name: 'Ana' }],
      });
      const visitId = yield* porterA.mutation(visits.registerPassEntry, {
        membershipId: world.porterA,
        token: tokenOf(created),
      });

      const fromOtherUnit = yield* Effect.result(
        porterB.mutation(visits.voidVisit, {
          membershipId: world.porterB,
          visitId,
          reason: 'Error de registro',
        })
      );
      EffectVitestUtils.assertFailure(
        fromOtherUnit,
        new Visits.VisitNotFoundError()
      );

      yield* adminA.mutation(visits.voidVisit, {
        membershipId: world.adminA,
        visitId,
        reason: 'Escaneado por error',
      });

      const twice = yield* Effect.result(
        porterA.mutation(visits.voidVisit, {
          membershipId: world.porterA,
          visitId,
          reason: 'Otra vez',
        })
      );
      EffectVitestUtils.assertFailure(
        twice,
        new Visits.VisitAlreadyVoidedError()
      );

      const inside = yield* porterA.query(visits.listInside, {
        membershipId: world.porterA,
      });
      EffectVitestUtils.strictEqual(inside.length, 0);

      const [recent] = yield* porterA.query(visits.listRecentForUnit, {
        membershipId: world.porterA,
      });
      EffectVitestUtils.strictEqual(recent?.voided, true);
      EffectVitestUtils.strictEqual(recent?.voidReason, 'Escaneado por error');

      // The open voided Visita no longer keeps the Visitante "inside".
      const resolution = yield* porterA.query(visits.resolvePass, {
        membershipId: world.porterA,
        token: tokenOf(created),
        now: PorteriaFixtures.wallClockMillis(),
      });
      EffectVitestUtils.strictEqual(resolution.outcome, 'admissible');
      EffectVitestUtils.strictEqual(
        resolution.outcome === 'admissible' ? resolution.pass.entryCount : -1,
        0
      );

      yield* porterA.mutation(visits.registerPassEntry, {
        membershipId: world.porterA,
        token: tokenOf(created),
      });
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('takes a voided Ingreso off a Servicio Pase’s count', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const porterA = yield* PorteriaFixtures.as('porterA');
      const residentA = yield* PorteriaFixtures.as('residentA');
      yield* openShiftForPorterA(world);

      const created = yield* authorizeInA(world, {
        type: 'service',
        endDate: PorteriaFixtures.localDateFromToday(30),
        weekdays: Authorizations.ALL_WEEKDAYS,
        visitors: [{ name: 'Jardinero', document: '98765432' }],
      });
      const firstVisit = yield* porterA.mutation(visits.registerPassEntry, {
        membershipId: world.porterA,
        token: tokenOf(created),
      });
      yield* porterA.mutation(visits.registerExit, {
        membershipId: world.porterA,
        visitId: firstVisit,
      });
      const mistaken = yield* porterA.mutation(visits.registerPassEntry, {
        membershipId: world.porterA,
        token: tokenOf(created),
      });

      yield* porterA.mutation(visits.voidVisit, {
        membershipId: world.porterA,
        visitId: mistaken,
        reason: 'Escaneado dos veces',
      });

      const [listed] = yield* residentA.query(authorizations.listForApartment, {
        membershipId: world.residentA,
        now: PorteriaFixtures.wallClockMillis(),
      });
      EffectVitestUtils.strictEqual(listed?.passes[0]?.entryCount, 1);
      EffectVitestUtils.strictEqual(listed?.passes[0]?.status, 'active');
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('never resolves or admits another unit’s Pase', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const porterB = yield* PorteriaFixtures.as('porterB');
      yield* porterB.mutation(shifts.start, { membershipId: world.porterB });

      const created = yield* authorizeInA(world, {
        type: 'temporary',
        visitors: [{ name: 'Ana' }],
      });
      const now = PorteriaFixtures.wallClockMillis();

      const resolution = yield* porterB.query(visits.resolvePass, {
        membershipId: world.porterB,
        token: tokenOf(created),
        now,
      });
      EffectVitestUtils.deepStrictEqual(resolution, { outcome: 'notFound' });

      const entry = yield* Effect.result(
        porterB.mutation(visits.registerPassEntry, {
          membershipId: world.porterB,
          token: tokenOf(created),
        })
      );
      EffectVitestUtils.assertFailure(
        entry,
        new Visits.PassRejectedError({ reason: 'notFound' })
      );

      const recentInB = yield* porterB.query(visits.listRecentForUnit, {
        membershipId: world.porterB,
      });
      EffectVitestUtils.strictEqual(recentInB.length, 0);
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('denies another Usuario’s Membresía', () =>
    Effect.gen(function* () {
      const world = yield* PorteriaFixtures.seedPorteria;
      const porterB = yield* PorteriaFixtures.as('porterB');

      const result = yield* Effect.result(
        porterB.query(visits.resolvePass, {
          membershipId: world.porterA,
          token: 'anything',
          now: 0,
        })
      );
      EffectVitestUtils.assertFailure(
        result,
        new Memberships.AccessDeniedError()
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'lists a Turno’s Visitas for its Portero and the Administrador only',
    () =>
      Effect.gen(function* () {
        const world = yield* PorteriaFixtures.seedPorteria;
        const porterA = yield* PorteriaFixtures.as('porterA');
        const porterA2 = yield* PorteriaFixtures.as('porterA2');
        const adminA = yield* PorteriaFixtures.as('adminA');
        const adminB = yield* PorteriaFixtures.as('adminB');
        const shiftId = yield* openShiftForPorterA(world);

        yield* porterA.mutation(visits.registerManualEntry, {
          membershipId: world.porterA,
          visitorName: 'Luis',
          visitorDocument: '11112222',
          apartmentId: world.apartmentA101,
          visitType: 'temporary',
        });

        const own = yield* porterA.query(visits.listForShift, {
          membershipId: world.porterA,
          shiftId,
        });
        EffectVitestUtils.strictEqual(own.length, 1);

        const byAdministrator = yield* adminA.query(visits.listForShift, {
          membershipId: world.adminA,
          shiftId,
        });
        EffectVitestUtils.strictEqual(byAdministrator.length, 1);

        const byOtherPorter = yield* Effect.result(
          porterA2.query(visits.listForShift, {
            membershipId: world.porterA2,
            shiftId,
          })
        );
        EffectVitestUtils.assertFailure(
          byOtherPorter,
          new Shifts.ShiftNotFoundError()
        );

        const byOtherUnit = yield* Effect.result(
          adminB.query(visits.listForShift, {
            membershipId: world.adminB,
            shiftId,
          })
        );
        EffectVitestUtils.assertFailure(
          byOtherUnit,
          new Shifts.ShiftNotFoundError()
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );
});
