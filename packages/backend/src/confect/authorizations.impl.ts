import { FunctionImpl, GroupImpl } from '@confect/server';
import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';

import databaseSchema from './_generated/schema';
import { DatabaseReader, DatabaseWriter } from './_generated/services';
import authorizationsSpec from './authorizations.spec';
import RequireUserIdentity from './middleware/RequireUserIdentity.impl';
import * as Authorizations from './modules/authorizations';
import * as Calendar from './modules/calendar';
import * as ResidentialUnits from './modules/residentialUnits';
import * as Shifts from './modules/shifts';

/** The latest Autorizaciones listed whatever their state. */
const LIST_FOR_APARTMENT_LATEST_LIMIT = 50;
/** Active Autorizaciones still valid today or later, however old. */
const LIST_FOR_APARTMENT_CURRENT_LIMIT = 200;
const FAVORITES_LIMIT = 200;

// -*******************************************************************************-
// Public
// -*******************************************************************************-

const createImpl = FunctionImpl.make(
  databaseSchema,
  authorizationsSpec,
  'create',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const writer = yield* DatabaseWriter;

      const { membership, apartmentId } =
        yield* Authorizations.requireResidentApartment(args.membershipId);

      const unit = yield* reader
        .table('residentialUnits')
        .get(membership.residentialUnitId)
        .pipe(Effect.orDie);
      const now = yield* Clock.currentTimeMillis;

      const validity = Authorizations.resolveAuthorizationValidity(
        args,
        Calendar.toLocalDate(now, unit.timeZone)
      );
      if (Result.isFailure(validity))
        return yield* new Authorizations.InvalidAuthorizationError({
          reason: validity.failure,
        });

      const favoriteIds = args.visitors
        .map((visitor) => visitor.favoriteId)
        .filter(Predicate.isNotUndefined);
      const favorites = yield* Effect.forEach(
        favoriteIds,
        (favoriteId) =>
          reader
            .table('favorites')
            .get(favoriteId)
            .pipe(
              Effect.catchTags({
                GetByIdFailure: () => Effect.succeed(null),
                DocumentDecodeError: Effect.die,
              })
            ),
        { concurrency: 'unbounded' }
      );
      const areOwnFavorites = favorites.every(
        (favorite) =>
          Predicate.isNotNull(favorite) &&
          favorite.membershipId === membership._id
      );
      if (!areOwnFavorites)
        return yield* new Authorizations.FavoriteNotFoundError();

      const authorizationId = yield* writer
        .table('authorizations')
        .insert({
          residentialUnitId: membership.residentialUnitId,
          apartmentId,
          createdByMembershipId: membership._id,
          type: args.type,
          ...validity.success,
          eventName: args.type === 'event' ? args.eventName : undefined,
          status: 'active',
        })
        .pipe(Effect.orDie);

      const passes = yield* Effect.forEach(args.visitors, (visitor) =>
        Effect.gen(function* () {
          const token = yield* Authorizations.generatePassToken;

          const passId = yield* writer
            .table('passes')
            .insert({
              authorizationId,
              residentialUnitId: membership.residentialUnitId,
              apartmentId,
              visitorName: visitor.name,
              visitorDocument: visitor.document,
              token,
              status: 'active',
              entryCount: 0,
              favoriteId: visitor.favoriteId,
            })
            .pipe(Effect.orDie);

          return {
            _id: passId,
            token,
            visitorName: visitor.name,
            visitorDocument: visitor.document,
            status: 'active',
            entryCount: 0,
          } satisfies Authorizations.PassSummary;
        })
      );

      yield* Effect.forEach(
        new Set(favoriteIds),
        (favoriteId) =>
          writer
            .table('favorites')
            .patch(favoriteId, { lastAuthorizedAt: now })
            .pipe(Effect.orDie),
        { discard: true }
      );

      return { authorizationId, passes };
    })
);

/**
 * Every active Autorización valid on or after the unit's day of `now`, so a
 * long Servicio never drops out behind newer ones, plus the latest ones in any
 * state; latest created first. Each carries every active Pase, however many
 * regenerations came after it, plus its newest other Pases, in creation order.
 */
const listForApartmentImpl = FunctionImpl.make(
  databaseSchema,
  authorizationsSpec,
  'listForApartment',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      const { membership, apartmentId } =
        yield* Authorizations.requireResidentApartment(args.membershipId);

      const unit = yield* reader
        .table('residentialUnits')
        .get(membership.residentialUnitId)
        .pipe(Effect.orDie);
      const today = Calendar.toLocalDate(args.now, unit.timeZone);

      const [current, latest] = yield* Effect.all(
        [
          reader
            .table('authorizations')
            .index('by_apartmentId_and_status_and_endDate', (q) =>
              q
                .eq('apartmentId', apartmentId)
                .eq('status', 'active')
                .gte('endDate', today)
            )
            .take(LIST_FOR_APARTMENT_CURRENT_LIMIT),
          reader
            .table('authorizations')
            .index(
              'by_apartmentId',
              (q) => q.eq('apartmentId', apartmentId),
              'desc'
            )
            .take(LIST_FOR_APARTMENT_LATEST_LIMIT),
        ],
        { concurrency: 'unbounded' }
      ).pipe(Effect.orDie);

      const authorizations = [
        ...new Map(
          [...current, ...latest].map((authorization) => [
            authorization._id,
            authorization,
          ])
        ).values(),
      ].toSorted((a, b) => b._creationTime - a._creationTime);

      const [passesByAuthorization, creatorNames] = yield* Effect.all(
        [
          Effect.forEach(
            authorizations,
            (authorization) =>
              Effect.all(
                [
                  reader
                    .table('passes')
                    .index('by_authorizationId_and_status', (q) =>
                      q
                        .eq('authorizationId', authorization._id)
                        .eq('status', 'active')
                    )
                    .take(Authorizations.MAX_EVENT_VISITORS),
                  reader
                    .table('passes')
                    .index(
                      'by_authorizationId',
                      (q) => q.eq('authorizationId', authorization._id),
                      'desc'
                    )
                    .take(Authorizations.PASSES_PER_AUTHORIZATION_LIMIT),
                ],
                { concurrency: 'unbounded' }
              ).pipe(
                Effect.map(([activePasses, newestPasses]) =>
                  [
                    ...new Map(
                      [...activePasses, ...newestPasses].map((pass) => [
                        pass._id,
                        pass,
                      ])
                    ).values(),
                  ].toSorted((a, b) => a._creationTime - b._creationTime)
                ),
                Effect.orDie
              ),
            { concurrency: 'unbounded' }
          ),
          Shifts.loadMemberNames(
            authorizations.map(
              (authorization) => authorization.createdByMembershipId
            )
          ),
        ],
        { concurrency: 'unbounded' }
      );

      return authorizations.map(
        (authorization, index): Authorizations.AuthorizationSummary => ({
          _id: authorization._id,
          _creationTime: authorization._creationTime,
          type: authorization.type,
          startDate: authorization.startDate,
          endDate: authorization.endDate,
          weekdays: authorization.weekdays,
          eventName: authorization.eventName,
          status: authorization.status,
          createdByName: creatorNames.get(authorization.createdByMembershipId),
          passes: (passesByAuthorization[index] ?? []).map(
            Authorizations.toPassSummary
          ),
        })
      );
    })
);

/** Idempotent: cancelling an already cancelled Autorización changes nothing. */
const cancelImpl = FunctionImpl.make(
  databaseSchema,
  authorizationsSpec,
  'cancel',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const writer = yield* DatabaseWriter;

      const { membership, apartmentId } =
        yield* Authorizations.requireResidentApartment(args.membershipId);

      const authorization = yield* reader
        .table('authorizations')
        .get(args.authorizationId)
        .pipe(
          Effect.catchTags({
            GetByIdFailure: () => Effect.succeed(null),
            DocumentDecodeError: Effect.die,
          })
        );

      const isOfApartment =
        Predicate.isNotNull(authorization) &&
        authorization.apartmentId === apartmentId;
      if (!isOfApartment)
        return yield* new Authorizations.AuthorizationNotFoundError();

      if (authorization.status === 'cancelled') return null;

      const now = yield* Clock.currentTimeMillis;

      yield* writer
        .table('authorizations')
        .patch(authorization._id, {
          status: 'cancelled',
          cancelledAt: now,
          cancelledByMembershipId: membership._id,
        })
        .pipe(Effect.orDie);

      // At most one active Pase per Visitante: regenerating replaces the old.
      const activePasses = yield* reader
        .table('passes')
        .index('by_authorizationId_and_status', (q) =>
          q.eq('authorizationId', authorization._id).eq('status', 'active')
        )
        .take(Authorizations.PASSES_PER_AUTHORIZATION_LIMIT)
        .pipe(Effect.orDie);

      yield* Effect.forEach(
        activePasses,
        (pass) =>
          writer
            .table('passes')
            .patch(pass._id, { status: 'cancelled' })
            .pipe(Effect.orDie),
        { discard: true }
      );

      return null;
    })
);

/**
 * Issues a new Pase for the same Visitante and marks the old one `replaced`,
 * so its link and QR are rejected with that reason.
 */
const regeneratePassImpl = FunctionImpl.make(
  databaseSchema,
  authorizationsSpec,
  'regeneratePass',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const writer = yield* DatabaseWriter;

      const { apartmentId } = yield* Authorizations.requireResidentApartment(
        args.membershipId
      );

      const pass = yield* reader
        .table('passes')
        .get(args.passId)
        .pipe(
          Effect.catchTags({
            GetByIdFailure: () => Effect.succeed(null),
            DocumentDecodeError: Effect.die,
          })
        );

      const isOfApartment =
        Predicate.isNotNull(pass) && pass.apartmentId === apartmentId;
      if (!isOfApartment) return yield* new Authorizations.PassNotFoundError();

      const authorization = yield* reader
        .table('authorizations')
        .get(pass.authorizationId)
        .pipe(Effect.orDie);

      const isActive =
        pass.status === 'active' && authorization.status === 'active';
      if (!isActive) return yield* new Authorizations.PassNotActiveError();

      const token = yield* Authorizations.generatePassToken;

      const replacementId = yield* writer
        .table('passes')
        .insert({
          authorizationId: pass.authorizationId,
          residentialUnitId: pass.residentialUnitId,
          apartmentId: pass.apartmentId,
          visitorName: pass.visitorName,
          visitorDocument: pass.visitorDocument,
          token,
          status: 'active',
          entryCount: 0,
          favoriteId: pass.favoriteId,
        })
        .pipe(Effect.orDie);

      yield* writer
        .table('passes')
        .patch(pass._id, {
          status: 'replaced',
          replacedByPassId: replacementId,
        })
        .pipe(Effect.orDie);

      return {
        _id: replacementId,
        token,
        visitorName: pass.visitorName,
        visitorDocument: pass.visitorDocument,
        status: 'active',
        entryCount: 0,
      } satisfies Authorizations.PassSummary;
    })
);

const getPublicPassImpl = FunctionImpl.make(
  databaseSchema,
  authorizationsSpec,
  'getPublicPass',
  (args) =>
    Effect.gen(function* () {
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
      if (Predicate.isNull(pass)) return null;

      const [authorization, unit, apartment] = yield* Effect.all(
        [
          reader.table('authorizations').get(pass.authorizationId),
          reader.table('residentialUnits').get(pass.residentialUnitId),
          reader.table('apartments').get(pass.apartmentId),
        ],
        { concurrency: 'unbounded' }
      ).pipe(Effect.orDie);

      // Never the Visitante's document: anyone holding the link sees this.
      return {
        token: pass.token,
        visitorName: pass.visitorName,
        residentialUnitName: unit.name,
        residentialUnitTimeZone: unit.timeZone,
        apartmentLabel: ResidentialUnits.formatApartmentLabel(apartment),
        type: authorization.type,
        startDate: authorization.startDate,
        endDate: authorization.endDate,
        weekdays: authorization.weekdays,
        eventName: authorization.eventName,
        status: pass.status,
        authorizationStatus: authorization.status,
      };
    })
);

const listFavoritesImpl = FunctionImpl.make(
  databaseSchema,
  authorizationsSpec,
  'listFavorites',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      const { membership } = yield* Authorizations.requireResidentApartment(
        args.membershipId
      );

      const favorites = yield* reader
        .table('favorites')
        .index('by_membershipId', (q) => q.eq('membershipId', membership._id))
        .take(FAVORITES_LIMIT)
        .pipe(Effect.orDie);

      return favorites
        .toSorted(
          (a, b) =>
            (b.lastAuthorizedAt ?? 0) - (a.lastAuthorizedAt ?? 0) ||
            a.visitorName.localeCompare(b.visitorName, 'es')
        )
        .map((favorite): Authorizations.FavoriteSummary => ({
          _id: favorite._id,
          visitorName: favorite.visitorName,
          visitorDocument: favorite.visitorDocument,
          relationship: favorite.relationship,
          relationshipNote: favorite.relationshipNote,
          lastAuthorizedAt: favorite.lastAuthorizedAt,
        }));
    })
);

const createFavoriteImpl = FunctionImpl.make(
  databaseSchema,
  authorizationsSpec,
  'createFavorite',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const { membership } = yield* Authorizations.requireResidentApartment(
        args.membershipId
      );

      return yield* writer
        .table('favorites')
        .insert({
          residentialUnitId: membership.residentialUnitId,
          membershipId: membership._id,
          visitorName: args.visitorName,
          visitorDocument: args.visitorDocument,
          relationship: args.relationship,
          relationshipNote: args.relationshipNote,
        })
        .pipe(Effect.orDie);
    })
);

const removeFavoriteImpl = FunctionImpl.make(
  databaseSchema,
  authorizationsSpec,
  'removeFavorite',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const writer = yield* DatabaseWriter;

      const { membership } = yield* Authorizations.requireResidentApartment(
        args.membershipId
      );

      const favorite = yield* reader
        .table('favorites')
        .get(args.favoriteId)
        .pipe(
          Effect.catchTags({
            GetByIdFailure: () => Effect.succeed(null),
            DocumentDecodeError: Effect.die,
          })
        );

      const isOwnFavorite =
        Predicate.isNotNull(favorite) &&
        favorite.membershipId === membership._id;
      if (!isOwnFavorite)
        return yield* new Authorizations.FavoriteNotFoundError();

      yield* writer.table('favorites').delete(favorite._id);

      return null;
    })
);

// -*******************************************************************************-
// API
// -*******************************************************************************-

export default GroupImpl.make(databaseSchema, authorizationsSpec).pipe(
  Layer.provide(createImpl),
  Layer.provide(listForApartmentImpl),
  Layer.provide(cancelImpl),
  Layer.provide(regeneratePassImpl),
  Layer.provide(getPublicPassImpl),
  Layer.provide(listFavoritesImpl),
  Layer.provide(createFavoriteImpl),
  Layer.provide(removeFavoriteImpl),
  Layer.provide(RequireUserIdentity),

  GroupImpl.finalize
);
