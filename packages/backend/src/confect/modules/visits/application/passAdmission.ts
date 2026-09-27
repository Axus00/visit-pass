import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import type { Id } from '#convex/_generated/dataModel';

import { DatabaseReader } from '../../../_generated/services';
import * as AuthorizationsDomain from '../../authorizations/domain';
import * as CalendarDomain from '../../calendar/domain';
import * as MembershipsApplication from '../../memberships/application';

/** Voided Visitas may stay open; a live one is the newest, read first. */
const OPEN_VISITS_PER_PASS_LIMIT = 10;

/** Residentes of one Apartamento read to find one whose Usuario still exists. */
const ACTIVE_RESIDENTS_PER_APARTMENT_LIMIT = 50;

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
      activeResidents,
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
          .take(ACTIVE_RESIDENTS_PER_APARTMENT_LIMIT),
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

    // A Residente whose Usuario was deleted no longer counts.
    const [liveResidents, openVisits] = yield* Effect.all(
      [
        MembershipsApplication.filterActiveMembers(activeResidents),
        Effect.forEach(
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
        ).pipe(Effect.orDie),
      ],
      { concurrency: 'unbounded' }
    );

    const admission = AuthorizationsDomain.evaluatePassAdmission({
      pass,
      authorization,
      today: CalendarDomain.toLocalDate(args.now, unit.timeZone),
      apartmentHasActiveResident: liveResidents.length > 0,
      visitorIsInside: openVisits
        .flat()
        .some((visit) => Predicate.isUndefined(visit.voidedAt)),
    });

    return { pass, authorization, apartment, admission };
  }
);
