import { FunctionImpl, GroupImpl } from '@confect/server';
import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';

import databaseSchema from './_generated/schema';
import { DatabaseReader, DatabaseWriter } from './_generated/services';
import RequireUserIdentity from './middleware/RequireUserIdentity.impl';
import * as Authorizations from './modules/authorizations';
import * as Memberships from './modules/memberships';
import * as ResidentialUnits from './modules/residentialUnits';
import * as Shifts from './modules/shifts';
import * as Visits from './modules/visits';
import visitsSpec from './visits.spec';

const LIST_INSIDE_LIMIT = 200;
const LIST_RECENT_FOR_UNIT_LIMIT = 100;
const LIST_FOR_SHIFT_LIMIT = 1000;

// -*******************************************************************************-
// Public
// -*******************************************************************************-

const resolvePassImpl = FunctionImpl.make(
  databaseSchema,
  visitsSpec,
  'resolvePass',
  (args) =>
    Effect.gen(function* () {
      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['porter']
      );

      const evaluation = yield* Visits.evaluatePassByToken({
        token: args.token.trim(),
        residentialUnitId: membership.residentialUnitId,
        now: args.now,
      });
      if (Predicate.isNull(evaluation)) return { outcome: 'notFound' } as const;

      const { pass, authorization, apartment, admission } = evaluation;
      const resolvedPass: Visits.ResolvedPass = {
        passId: pass._id,
        visitorName: pass.visitorName,
        visitorDocument: pass.visitorDocument,
        apartmentId: apartment._id,
        apartmentLabel: ResidentialUnits.formatApartmentLabel(apartment),
        type: authorization.type,
        startDate: authorization.startDate,
        endDate: authorization.endDate,
        weekdays: authorization.weekdays,
        eventName: authorization.eventName,
        entryCount: pass.entryCount,
      };

      if (!admission.admissible)
        return {
          outcome: 'rejected',
          reason: admission.reason,
          pass: resolvedPass,
        } as const;

      return { outcome: 'admissible', pass: resolvedPass } as const;
    })
);

const registerPassEntryImpl = FunctionImpl.make(
  databaseSchema,
  visitsSpec,
  'registerPassEntry',
  (args) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['porter']
      );

      const openShift = yield* Shifts.findOpenShift(membership._id);
      if (Predicate.isNull(openShift))
        return yield* new Shifts.NoOpenShiftError();

      const now = yield* Clock.currentTimeMillis;

      const evaluation = yield* Visits.evaluatePassByToken({
        token: args.token,
        residentialUnitId: membership.residentialUnitId,
        now,
      });
      if (Predicate.isNull(evaluation))
        return yield* new Visits.PassRejectedError({ reason: 'notFound' });

      const { pass, authorization, admission } = evaluation;
      if (!admission.admissible)
        return yield* new Visits.PassRejectedError({
          reason: admission.reason,
        });

      const visitId = yield* writer
        .table('visits')
        .insert({
          residentialUnitId: membership.residentialUnitId,
          apartmentId: pass.apartmentId,
          visitorName: pass.visitorName,
          // The Pase's own document wins; the Portero completes a missing one.
          visitorDocument: pass.visitorDocument ?? args.visitorDocument,
          plate: args.plate,
          visitType: authorization.type,
          origin: 'pass',
          passId: pass._id,
          authorizationId: authorization._id,
          shiftId: openShift._id,
          entryPorterMembershipId: membership._id,
          enteredAt: now,
          privacyNoticeVersion: Visits.PRIVACY_NOTICE_VERSION,
        })
        .pipe(Effect.orDie);

      // Temporal and Evento Pases admit a single Ingreso; Servicio stays active.
      const isSingleEntry = authorization.type !== 'service';

      yield* writer
        .table('passes')
        .patch(pass._id, {
          entryCount: pass.entryCount + 1,
          lastEntryAt: now,
          status: isSingleEntry ? 'used' : pass.status,
        })
        .pipe(Effect.orDie);

      return visitId;
    })
);

const registerManualEntryImpl = FunctionImpl.make(
  databaseSchema,
  visitsSpec,
  'registerManualEntry',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const writer = yield* DatabaseWriter;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['porter']
      );

      const apartment = yield* reader
        .table('apartments')
        .get(args.apartmentId)
        .pipe(
          Effect.catchTags({
            GetByIdFailure: () => Effect.succeed(null),
            DocumentDecodeError: Effect.die,
          })
        );

      const isApartmentOfUnit =
        Predicate.isNotNull(apartment) &&
        apartment.residentialUnitId === membership.residentialUnitId;
      if (!isApartmentOfUnit)
        return yield* new ResidentialUnits.ApartmentNotFoundError();

      const openShift = yield* Shifts.findOpenShift(membership._id);
      if (Predicate.isNull(openShift))
        return yield* new Shifts.NoOpenShiftError();

      const now = yield* Clock.currentTimeMillis;

      // Records why the scanned Pase was refused, as evidence for the forced Ingreso.
      const overriddenRejection = yield* Effect.gen(function* () {
        if (Predicate.isUndefined(args.rejectedPassToken)) return undefined;

        const evaluation = yield* Visits.evaluatePassByToken({
          token: args.rejectedPassToken.trim(),
          residentialUnitId: membership.residentialUnitId,
          now,
        });
        if (Predicate.isNull(evaluation)) return undefined;
        if (evaluation.admission.admissible) return undefined;

        return evaluation.admission.reason;
      });

      return yield* writer
        .table('visits')
        .insert({
          residentialUnitId: membership.residentialUnitId,
          apartmentId: apartment._id,
          visitorName: args.visitorName,
          visitorDocument: args.visitorDocument,
          plate: args.plate,
          visitType: args.visitType,
          origin: 'manual',
          overriddenRejection,
          shiftId: openShift._id,
          entryPorterMembershipId: membership._id,
          enteredAt: now,
          privacyNoticeVersion: Visits.PRIVACY_NOTICE_VERSION,
        })
        .pipe(Effect.orDie);
    })
);

/** A Salida needs no open Turno: any Portero of the unit may register it. */
const registerExitImpl = FunctionImpl.make(
  databaseSchema,
  visitsSpec,
  'registerExit',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const writer = yield* DatabaseWriter;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['porter']
      );

      const visit = yield* reader
        .table('visits')
        .get(args.visitId)
        .pipe(
          Effect.catchTags({
            GetByIdFailure: () => Effect.succeed(null),
            DocumentDecodeError: Effect.die,
          })
        );

      const isVisitOfUnit =
        Predicate.isNotNull(visit) &&
        visit.residentialUnitId === membership.residentialUnitId;
      if (!isVisitOfUnit) return yield* new Visits.VisitNotFoundError();

      if (Predicate.isNotUndefined(visit.exitedAt))
        return yield* new Visits.VisitAlreadyExitedError();

      const now = yield* Clock.currentTimeMillis;

      yield* writer
        .table('visits')
        .patch(visit._id, {
          exitedAt: now,
          exitPorterMembershipId: membership._id,
        })
        .pipe(Effect.orDie);

      return null;
    })
);

/**
 * Voiding keeps the Visita with its reason. When it consumed a Temporal or
 * Evento Pase of a still active Autorización, the Pase is usable again.
 */
const voidVisitImpl = FunctionImpl.make(
  databaseSchema,
  visitsSpec,
  'voidVisit',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const writer = yield* DatabaseWriter;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['porter', 'administrator']
      );

      const visit = yield* reader
        .table('visits')
        .get(args.visitId)
        .pipe(
          Effect.catchTags({
            GetByIdFailure: () => Effect.succeed(null),
            DocumentDecodeError: Effect.die,
          })
        );

      const isVisitOfUnit =
        Predicate.isNotNull(visit) &&
        visit.residentialUnitId === membership.residentialUnitId;
      if (!isVisitOfUnit) return yield* new Visits.VisitNotFoundError();

      if (Predicate.isNotUndefined(visit.voidedAt))
        return yield* new Visits.VisitAlreadyVoidedError();

      const now = yield* Clock.currentTimeMillis;

      yield* writer
        .table('visits')
        .patch(visit._id, {
          voidedAt: now,
          voidReason: args.reason,
          voidedByMembershipId: membership._id,
        })
        .pipe(Effect.orDie);

      if (Predicate.isUndefined(visit.passId)) return null;

      const [pass, authorization] = yield* Effect.all(
        [
          reader.table('passes').get(visit.passId),
          Predicate.isUndefined(visit.authorizationId)
            ? Effect.succeed(null)
            : reader.table('authorizations').get(visit.authorizationId),
        ],
        { concurrency: 'unbounded' }
      ).pipe(Effect.orDie);

      // Only a single-Ingreso Pase is `used`, and only by this Visita.
      const isPassToRestore =
        pass.status === 'used' &&
        Predicate.isNotNull(authorization) &&
        authorization.status === 'active';
      if (!isPassToRestore) return null;

      yield* writer
        .table('passes')
        .patch(pass._id, {
          status: 'active',
          entryCount: Math.max(pass.entryCount - 1, 0),
        })
        .pipe(Effect.orDie);

      return null;
    })
);

/**
 * Latest Ingreso first. Voided Visitas are left out: nobody is inside because
 * of them.
 */
const listInsideImpl = FunctionImpl.make(
  databaseSchema,
  visitsSpec,
  'listInside',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['porter', 'administrator']
      );

      // Newest first, so Visitas left open or voided long ago cannot push
      // today's Ingresos past the limit.
      const visits = yield* reader
        .table('visits')
        .index(
          'by_residentialUnitId_and_exitedAt',
          (q) =>
            q
              .eq('residentialUnitId', membership.residentialUnitId)
              .eq('exitedAt', undefined),
          'desc'
        )
        .take(LIST_INSIDE_LIMIT)
        .pipe(Effect.orDie);

      return yield* Visits.toVisitSummaries(
        visits.filter((visit) => Predicate.isUndefined(visit.voidedAt)),
        { maskDocuments: false }
      );
    })
);

const listRecentForUnitImpl = FunctionImpl.make(
  databaseSchema,
  visitsSpec,
  'listRecentForUnit',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['porter', 'administrator']
      );

      const visits = yield* reader
        .table('visits')
        .index(
          'by_residentialUnitId_and_enteredAt',
          (q) => q.eq('residentialUnitId', membership.residentialUnitId),
          'desc'
        )
        .take(LIST_RECENT_FOR_UNIT_LIMIT)
        .pipe(Effect.orDie);

      return yield* Visits.toVisitSummaries(visits, { maskDocuments: false });
    })
);

const listForApartmentImpl = FunctionImpl.make(
  databaseSchema,
  visitsSpec,
  'listForApartment',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      const { apartmentId } = yield* Authorizations.requireResidentApartment(
        args.membershipId
      );

      const visits = yield* reader
        .table('visits')
        .index(
          'by_apartmentId_and_enteredAt',
          (q) => q.eq('apartmentId', apartmentId),
          'desc'
        )
        .take(Visits.APARTMENT_HISTORY_LIMIT)
        .pipe(Effect.orDie);

      return yield* Visits.toVisitSummaries(visits, { maskDocuments: true });
    })
);

/** A Portero sees only their own Turnos; an Administrador any Turno of the unit. */
const listForShiftImpl = FunctionImpl.make(
  databaseSchema,
  visitsSpec,
  'listForShift',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['porter', 'administrator']
      );

      const shift = yield* Shifts.getShiftInUnit(
        args.shiftId,
        membership.residentialUnitId
      );

      const isOtherPortersShift =
        membership.role === 'porter' &&
        shift.porterMembershipId !== membership._id;
      if (isOtherPortersShift) return yield* new Shifts.ShiftNotFoundError();

      const visits = yield* reader
        .table('visits')
        .index('by_shiftId', (q) => q.eq('shiftId', shift._id), 'desc')
        .take(LIST_FOR_SHIFT_LIMIT)
        .pipe(Effect.orDie);

      return yield* Visits.toVisitSummaries(visits, { maskDocuments: false });
    })
);

// -*******************************************************************************-
// API
// -*******************************************************************************-

export default GroupImpl.make(databaseSchema, visitsSpec).pipe(
  Layer.provide(resolvePassImpl),
  Layer.provide(registerPassEntryImpl),
  Layer.provide(registerManualEntryImpl),
  Layer.provide(registerExitImpl),
  Layer.provide(voidVisitImpl),
  Layer.provide(listInsideImpl),
  Layer.provide(listRecentForUnitImpl),
  Layer.provide(listForApartmentImpl),
  Layer.provide(listForShiftImpl),
  Layer.provide(RequireUserIdentity),

  GroupImpl.finalize
);
