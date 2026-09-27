import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';

import type { Id } from '#convex/_generated/dataModel';

import { DatabaseReader } from '../../../_generated/services';
import * as AuthorizationsDomain from '../../authorizations/domain';
import * as CalendarDomain from '../../calendar/domain';

/** Voided Visitas may stay open; a live one is the newest, read first. */
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

    const [
      authorization,
      unit,
      apartment,
      activeResident,
      passesOfAuthorization,
    ] = yield* Effect.all(
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
          .table('passes')
          .index(
            'by_authorizationId',
            (q) => q.eq('authorizationId', pass.authorizationId),
            'desc'
          )
          .take(AuthorizationsDomain.PASSES_PER_AUTHORIZATION_LIMIT),
      ],
      { concurrency: 'unbounded' }
    ).pipe(Effect.orDie);

    // A Visitante who entered with a Pase since regenerated is still inside
    // as far as its replacement is concerned.
    const replacedPassIdOf = new Map(
      passesOfAuthorization.flatMap((candidate) =>
        Predicate.isUndefined(candidate.replacedByPassId)
          ? []
          : [[candidate.replacedByPassId, candidate._id] as const]
      )
    );
    const chainEndingAt = (passId: Id<'passes'>): Array<Id<'passes'>> => {
      const replacedPassId = replacedPassIdOf.get(passId);

      return Predicate.isUndefined(replacedPassId)
        ? [passId]
        : [passId, ...chainEndingAt(replacedPassId)];
    };

    const openVisits = yield* Effect.forEach(
      chainEndingAt(pass._id),
      (passId) =>
        reader
          .table('visits')
          .index(
            'by_passId_and_exitedAt',
            (q) => q.eq('passId', passId).eq('exitedAt', undefined),
            'desc'
          )
          .take(OPEN_VISITS_PER_PASS_LIMIT),
      { concurrency: 'unbounded' }
    ).pipe(Effect.orDie);

    const admission = AuthorizationsDomain.evaluatePassAdmission({
      pass,
      authorization,
      today: CalendarDomain.toLocalDate(args.now, unit.timeZone),
      apartmentHasActiveResident: Option.isSome(activeResident),
      visitorIsInside: openVisits
        .flat()
        .some((visit) => Predicate.isUndefined(visit.voidedAt)),
    });

    return { pass, authorization, apartment, admission };
  }
);
