import * as Effect from 'effect/Effect';
import * as Record from 'effect/Record';
import * as Schema from 'effect/Schema';

import { Id } from './_generated/id';
import { DatabaseWriter } from './_generated/services';
import * as Calendar from './modules/calendar';
import * as ResidentialUnits from './modules/residentialUnits';
import * as TestConfect from './test.setup';

/** The identity `withIdentity` needs to act as the seeded Usuario `key`. */
export function identityOf(key: string) {
  return { subject: key, tokenIdentifier: `test|${key}` };
}

export const insertUser = Effect.fn('TestFixtures.insertUser')(function* (
  key: string,
  email: string
) {
  const writer = yield* DatabaseWriter;

  return yield* writer.table('users').insert({
    externalId: key,
    identityTokenIdentifier: identityOf(key).tokenIdentifier,
    email,
    firstName: key,
    lastName: 'Test',
    profilePictureUrl: null,
    lastSignInAt: null,
    locale: null,
    externalCreatedAt: 0,
    externalUpdatedAt: 0,
  });
});

const TwoUnits = Schema.Struct({
  unitA: Id('residentialUnits'),
  unitB: Id('residentialUnits'),
  apartmentA101: Id('apartments'),
  apartmentA102: Id('apartments'),
  apartmentA2_101: Id('apartments'),
  apartmentB101: Id('apartments'),
  adminA: Id('memberships'),
  residentA: Id('memberships'),
  porterA: Id('memberships'),
  revokedA: Id('memberships'),
  pendingA: Id('memberships'),
  adminB: Id('memberships'),
});

export type TwoUnits = typeof TwoUnits.Type;

/**
 * Two Unidades residenciales. Unit A (`Unidad A`) has the Usuarios `adminA`,
 * `residentA` (Torre 1 · 101), `porterA`, a revoked Administrador `revokedA`
 * and a pending Portero `pendingA` whose Usuario exists. Unit B (`Unidad B`)
 * has the Administrador `adminB`. The Usuario `outsider` belongs nowhere.
 */
export const seedTwoUnits = Effect.gen(function* () {
  const confect = yield* TestConfect.TestConfect;

  return yield* confect.run(
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const { unitA, unitB } = yield* Effect.all(
        Record.map({ unitA: 'Unidad A', unitB: 'Unidad B' }, (name) =>
          writer.table('residentialUnits').insert({
            name,
            city: 'Bogotá',
            timeZone: Calendar.DEFAULT_TIME_ZONE,
            visitRetentionMonths:
              ResidentialUnits.DEFAULT_VISIT_RETENTION_MONTHS,
          })
        ),
        { concurrency: 'unbounded' }
      );

      const apartment = (
        residentialUnitId: typeof unitA,
        tower: string,
        number: string
      ) =>
        writer.table('apartments').insert({ residentialUnitId, tower, number });

      const apartmentA101 = yield* apartment(unitA, '1', '101');
      const apartmentA102 = yield* apartment(unitA, '1', '102');
      const apartmentA2_101 = yield* apartment(unitA, '2', '101');
      const apartmentB101 = yield* apartment(unitB, 'A', '101');

      const member = Effect.fn(function* (args: {
        key: string;
        residentialUnitId: typeof unitA;
        role: 'resident' | 'porter' | 'administrator';
        status: 'pending' | 'active' | 'revoked';
        apartmentId?: typeof apartmentA101;
      }) {
        const email = `${args.key.toLowerCase()}@example.test`;
        const userId = yield* insertUser(args.key, email);
        const isResident = args.role === 'resident';

        return yield* writer.table('memberships').insert({
          residentialUnitId: args.residentialUnitId,
          email,
          role: args.role,
          status: args.status,
          userId: args.status === 'pending' ? undefined : userId,
          apartmentId: args.apartmentId,
          occupancyType: isResident ? 'owner' : undefined,
          activatedAt: args.status === 'pending' ? undefined : 0,
        });
      });

      const adminA = yield* member({
        key: 'adminA',
        residentialUnitId: unitA,
        role: 'administrator',
        status: 'active',
      });
      const residentA = yield* member({
        key: 'residentA',
        residentialUnitId: unitA,
        role: 'resident',
        status: 'active',
        apartmentId: apartmentA101,
      });
      const porterA = yield* member({
        key: 'porterA',
        residentialUnitId: unitA,
        role: 'porter',
        status: 'active',
      });
      const revokedA = yield* member({
        key: 'revokedA',
        residentialUnitId: unitA,
        role: 'administrator',
        status: 'revoked',
      });
      const pendingA = yield* member({
        key: 'pendingA',
        residentialUnitId: unitA,
        role: 'porter',
        status: 'pending',
      });
      const adminB = yield* member({
        key: 'adminB',
        residentialUnitId: unitB,
        role: 'administrator',
        status: 'active',
      });

      yield* insertUser('outsider', 'outsider@example.test');

      return {
        unitA,
        unitB,
        apartmentA101,
        apartmentA102,
        apartmentA2_101,
        apartmentB101,
        adminA,
        residentA,
        porterA,
        revokedA,
        pendingA,
        adminB,
      };
    }).pipe(Effect.orDie),
    TwoUnits
  );
}).pipe(Effect.orDie);
