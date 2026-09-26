import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';

import type { Id } from '#convex/_generated/dataModel';

import { DatabaseReader } from '../../../_generated/services';
import * as AuthorizationsDomain from '../../authorizations/domain';
import * as CalendarDomain from '../../calendar/domain';

/** Voided Visitas may stay open; a live one sits among the first few. */
const OPEN_VISITS_PER_PASS_LIMIT = 10;

/**
 * Finds the Pase behind a scanned token and decides whether its Visitante may
 * enter at `now`, on the unit's calendar day. Returns null for unknown tokens
 * and for Pases of other units, so portería never learns they exist.
 */
export const evaluatePassByToken = Effect.fn('Visits.evaluatePassByToken')(
  function* (args: {
    readonly token: string;
    readonly residentialUnitId: Id<'residentialUnits'>;
    readonly now: number;
  }) {
    const reader = yield* DatabaseReader;

    const pass = yield* reader
      .table('passes')
      .get('by_token', args.token)
      .pipe(
        Effect.catchTags({
          GetByIndexFailure: () => Effect.succeed(null),
          DocumentDecodeError: Effect.die,
        })
      );

    const isPassOfUnit =
      Predicate.isNotNull(pass) &&
      pass.residentialUnitId === args.residentialUnitId;
    if (!isPassOfUnit) return null;

    const [authorization, unit, apartment, activeResident, openVisits] =
      yield* Effect.all(
        [
          reader.table('authorizations').get(pass.authorizationId),
          reader.table('residentialUnits').get(pass.residentialUnitId),
          reader.table('apartments').get(pass.apartmentId),
          reader
            .table('memberships')
            .index('by_apartmentId_and_status', (q) =>
              q.eq('apartmentId', pass.apartmentId).eq('status', 'active')
            )
            .first(),
          reader
            .table('visits')
            .index('by_passId_and_exitedAt', (q) =>
              q.eq('passId', pass._id).eq('exitedAt', undefined)
            )
            .take(OPEN_VISITS_PER_PASS_LIMIT),
        ],
        { concurrency: 'unbounded' }
      ).pipe(Effect.orDie);

    const admission = AuthorizationsDomain.evaluatePassAdmission({
      pass,
      authorization,
      today: CalendarDomain.toLocalDate(args.now, unit.timeZone),
      apartmentHasActiveResident: Option.isSome(activeResident),
      visitorIsInside: openVisits.some((visit) =>
        Predicate.isUndefined(visit.voidedAt)
      ),
    });

    return { pass, authorization, apartment, admission };
  }
);
