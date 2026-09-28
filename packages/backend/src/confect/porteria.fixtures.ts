import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Id } from './_generated/id';
import { DatabaseWriter } from './_generated/services';
import * as Calendar from './modules/calendar';
import * as TestFixtures from './test.fixtures';
import * as TestConfect from './test.setup';

/**
 * The wall clock the functions under test read. `it.effect` swaps Effect's
 * clock for a TestClock, so tests cannot use `Clock.currentTimeMillis` here.
 */
// oxlint-disable-next-line effecttsgo/global-date -- Must match the real clock convex-test runs functions with.
export const wallClockMillis = () => Date.now();

/** The unit's calendar day `days` from today, as the functions under test see it. */
export const localDateFromToday = (days: number) =>
  Calendar.addDays(
    Calendar.toLocalDate(wallClockMillis(), Calendar.DEFAULT_TIME_ZONE),
    days
  );

const PorteriaMembers = Schema.Struct({
  coResidentA: Id('memberships'),
  residentA102: Id('memberships'),
  porterA2: Id('memberships'),
  porterB: Id('memberships'),
  residentB: Id('memberships'),
});

export type Porteria = TestFixtures.TwoUnits & typeof PorteriaMembers.Type;

/**
 * `seedTwoUnits` plus: `coResidentA` (also Torre 1 · 101), `residentA102`
 * (Torre 1 · 102), a second Portero `porterA2` in unit A, and in unit B the
 * Portero `porterB` and the Residente `residentB` (Torre A · 101).
 */
export const seedPorteria = Effect.gen(function* () {
  const confect = yield* TestConfect.TestConfect;

  const twoUnits = yield* TestFixtures.seedTwoUnits;

  const extra = yield* confect.run(
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const member = Effect.fn(function* (args: {
        key: string;
        residentialUnitId: typeof twoUnits.unitA;
        role: 'resident' | 'porter';
        apartmentId?: typeof twoUnits.apartmentA101;
      }) {
        const email = `${args.key}@example.test`;
        const userId = yield* TestFixtures.insertUser(args.key, email);

        return yield* writer.table('memberships').insert({
          residentialUnitId: args.residentialUnitId,
          email,
          userId,
          role: args.role,
          apartmentId: args.apartmentId,
          occupancyType: args.role === 'resident' ? 'tenant' : undefined,
          status: 'active',
          activatedAt: 0,
        });
      });

      return {
        coResidentA: yield* member({
          key: 'coResidentA',
          residentialUnitId: twoUnits.unitA,
          role: 'resident',
          apartmentId: twoUnits.apartmentA101,
        }),
        residentA102: yield* member({
          key: 'residentA102',
          residentialUnitId: twoUnits.unitA,
          role: 'resident',
          apartmentId: twoUnits.apartmentA102,
        }),
        porterA2: yield* member({
          key: 'porterA2',
          residentialUnitId: twoUnits.unitA,
          role: 'porter',
        }),
        porterB: yield* member({
          key: 'porterB',
          residentialUnitId: twoUnits.unitB,
          role: 'porter',
        }),
        residentB: yield* member({
          key: 'residentB',
          residentialUnitId: twoUnits.unitB,
          role: 'resident',
          apartmentId: twoUnits.apartmentB101,
        }),
      };
    }).pipe(Effect.orDie),
    PorteriaMembers
  );

  const porteria: Porteria = { ...twoUnits, ...extra };

  return porteria;
}).pipe(Effect.orDie);

/** Calls functions as the seeded Usuario `key`. */
export const as = Effect.fn('PorteriaFixtures.as')(function* (key: string) {
  const confect = yield* TestConfect.TestConfect;

  return confect.withIdentity(TestFixtures.identityOf(key));
});
