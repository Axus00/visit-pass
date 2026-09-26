import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import type { Id } from '#convex/_generated/dataModel';

import type { MembershipsDoc, ShiftReportsDoc } from '../../../_generated/docs';
import { DatabaseReader, StorageReader } from '../../../_generated/services';
import * as ResidentialUnitsDomain from '../../residentialUnits/domain';
import * as ShiftsDomain from '../../shifts/domain';
import * as UsersApplication from '../../users/application';
import * as UsersDomain from '../../users/domain';
import * as Domain from '../domain';

/** Visitas one report lists; a Turno past this is truncated rather than failing. */
const VISITS_PER_REPORT_LIMIT = 2000;

/** Administradores are a handful per unit; this bounds a misconfigured one. */
const ADMINISTRATORS_PER_UNIT_LIMIT = 100;

// -*******************************************************************************-
// API
// -*******************************************************************************-

export const getOneReportByIdOrNull = Effect.fn(
  'ShiftReports.getOneReportByIdOrNull'
)(function* (shiftReportId: Id<'shiftReports'>) {
  const reader = yield* DatabaseReader;

  return yield* reader
    .table('shiftReports')
    .get(shiftReportId)
    .pipe(
      Effect.catchTags({
        GetByIdFailure: () => Effect.succeed(null),
        DocumentDecodeError: Effect.die,
      })
    );
});

/** Membresías are never deleted, so a dangling reference is a defect. */
export const getMemberDisplayName = Effect.fn(
  'ShiftReports.getMemberDisplayName'
)(function* (membershipId: Id<'memberships'>) {
  const reader = yield* DatabaseReader;

  const membership = yield* reader
    .table('memberships')
    .get(membershipId)
    .pipe(Effect.orDie);

  const user = Predicate.isUndefined(membership.userId)
    ? null
    : yield* UsersApplication.getOneById(membership.userId);

  return Domain.toMemberDisplayName({ membership, user });
});

/**
 * Resolves a Turno the caller may report on: it must belong to the caller's
 * unit, and a Portero may only report their own.
 */
export const requireReportableShift = Effect.fn(
  'ShiftReports.requireReportableShift'
)(function* (args: {
  readonly membership: MembershipsDoc;
  readonly shiftId: Id<'shifts'>;
}) {
  const reader = yield* DatabaseReader;

  const shift = yield* reader
    .table('shifts')
    .get(args.shiftId)
    .pipe(
      Effect.catchTags({
        GetByIdFailure: () => Effect.succeed(null),
        DocumentDecodeError: Effect.die,
      })
    );

  const isShiftOfCallerUnit =
    Predicate.isNotNull(shift) &&
    shift.residentialUnitId === args.membership.residentialUnitId;

  if (!isShiftOfCallerUnit) return yield* new ShiftsDomain.ShiftNotFoundError();

  const isOtherPortersShift =
    args.membership.role === 'porter' &&
    shift.porterMembershipId !== args.membership._id;

  if (isOtherPortersShift)
    return yield* new Domain.ShiftReportNotAllowedError();

  return shift;
});

/** Emails of the unit's active Administradores, preferring the signed-in Usuario's. */
export const listAdministratorEmails = Effect.fn(
  'ShiftReports.listAdministratorEmails'
)(function* (residentialUnitId: Id<'residentialUnits'>) {
  const reader = yield* DatabaseReader;

  const administrators = yield* reader
    .table('memberships')
    .index('by_residentialUnitId_and_role', (q) =>
      q.eq('residentialUnitId', residentialUnitId).eq('role', 'administrator')
    )
    .take(ADMINISTRATORS_PER_UNIT_LIMIT)
    .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

  const emails = yield* Effect.forEach(
    administrators.filter((membership) => membership.status === 'active'),
    (membership) =>
      Effect.gen(function* () {
        const user = Predicate.isUndefined(membership.userId)
          ? null
          : yield* UsersApplication.getOneById(membership.userId).pipe(
              UsersDomain.isActiveOrNull
            );

        return user?.email ?? membership.email;
      }),
    { concurrency: 'unbounded' }
  );

  return [...new Set(emails)];
});

/** Loads the Turno, its Visitas and every name the workbook prints. */
export const loadShiftReportContent = Effect.fn(
  'ShiftReports.loadShiftReportContent'
)(function* (shiftReportId: Id<'shiftReports'>) {
  const reader = yield* DatabaseReader;

  const report = yield* reader
    .table('shiftReports')
    .get(shiftReportId)
    .pipe(Effect.orDie);

  const [unit, shift, visits] = yield* Effect.all(
    [
      reader
        .table('residentialUnits')
        .get(report.residentialUnitId)
        .pipe(Effect.orDie),
      reader.table('shifts').get(report.shiftId).pipe(Effect.orDie),
      reader
        .table('visits')
        .index('by_shiftId', (q) => q.eq('shiftId', report.shiftId))
        .take(VISITS_PER_REPORT_LIMIT)
        .pipe(Effect.orDie),
    ],
    { concurrency: 'unbounded' }
  );

  const apartmentIds = [...new Set(visits.map((visit) => visit.apartmentId))];
  const porterMembershipIds = [
    ...new Set([
      shift.porterMembershipId,
      ...visits.map((visit) => visit.entryPorterMembershipId),
    ]),
  ];

  const [apartmentLabels, porterNames] = yield* Effect.all(
    [
      Effect.forEach(
        apartmentIds,
        (apartmentId) =>
          reader
            .table('apartments')
            .get(apartmentId)
            .pipe(
              Effect.map(
                (apartment) =>
                  [
                    apartmentId,
                    ResidentialUnitsDomain.formatApartmentLabel(apartment),
                  ] as const
              ),
              Effect.orDie
            ),
        { concurrency: 'unbounded' }
      ).pipe(Effect.map((entries) => new Map(entries))),
      Effect.forEach(
        porterMembershipIds,
        (membershipId) =>
          getMemberDisplayName(membershipId).pipe(
            Effect.map((name) => [membershipId, name] as const)
          ),
        { concurrency: 'unbounded' }
      ).pipe(Effect.map((entries) => new Map(entries))),
    ],
    { concurrency: 'unbounded' }
  );

  const content: Domain.ShiftReportContent = {
    residentialUnitName: unit.name,
    timeZone: unit.timeZone,
    porterName: porterNames.get(shift.porterMembershipId) ?? '',
    shiftStartedAt: shift.startedAt ?? shift.plannedStart,
    shiftEndedAt: shift.endedAt,
    visits: visits.map((visit) => ({
      visitorName: visit.visitorName,
      visitorDocument: visit.visitorDocument,
      plate: visit.plate,
      visitType: visit.visitType,
      origin: visit.origin,
      overriddenRejection: visit.overriddenRejection,
      enteredAt: visit.enteredAt,
      exitedAt: visit.exitedAt,
      voidedAt: visit.voidedAt,
      voidReason: visit.voidReason,
      apartmentLabel: apartmentLabels.get(visit.apartmentId) ?? '',
      entryPorterName: porterNames.get(visit.entryPorterMembershipId) ?? '',
    })),
  };

  return content;
});

/** What the email step sends; `null` once the file is gone or was never stored. */
export const loadShiftReportEmail = Effect.fn(
  'ShiftReports.loadShiftReportEmail'
)(function* (shiftReportId: Id<'shiftReports'>) {
  const reader = yield* DatabaseReader;

  const report = yield* reader
    .table('shiftReports')
    .get(shiftReportId)
    .pipe(Effect.orDie);

  if (Predicate.isUndefined(report.fileId)) return null;

  const [unit, shift] = yield* Effect.all(
    [
      reader
        .table('residentialUnits')
        .get(report.residentialUnitId)
        .pipe(Effect.orDie),
      reader.table('shifts').get(report.shiftId).pipe(Effect.orDie),
    ],
    { concurrency: 'unbounded' }
  );

  const porterName = yield* getMemberDisplayName(shift.porterMembershipId);

  const email: Domain.ShiftReportEmail = {
    fileName: report.fileName,
    recipients: report.recipients,
    fileId: report.fileId,
    residentialUnitName: unit.name,
    porterName,
    shiftStartLabel: Domain.formatLocalDateTime(
      Domain.toShiftStart(shift),
      unit.timeZone
    ),
  };

  return email;
});

/** Projects reports for the client, resolving porter names and download URLs. */
export const toShiftReportSummaries = Effect.fn(
  'ShiftReports.toShiftReportSummaries'
)(function* (reports: ReadonlyArray<ShiftReportsDoc>) {
  const reader = yield* DatabaseReader;
  const storageReader = yield* StorageReader;

  const shiftIds = [...new Set(reports.map((report) => report.shiftId))];

  const porterNames = yield* Effect.forEach(
    shiftIds,
    (shiftId) =>
      reader
        .table('shifts')
        .get(shiftId)
        .pipe(
          Effect.orDie,
          Effect.flatMap((shift) =>
            getMemberDisplayName(shift.porterMembershipId)
          ),
          Effect.map((name) => [shiftId, name] as const)
        ),
    { concurrency: 'unbounded' }
  ).pipe(Effect.map((entries) => new Map(entries)));

  return yield* Effect.forEach(
    reports,
    (report) =>
      Effect.gen(function* () {
        const downloadUrl = Predicate.isUndefined(report.fileId)
          ? null
          : yield* storageReader.getUrl(report.fileId).pipe(
              Effect.map((url) => url.href),
              Effect.catchTag('BlobNotFoundError', () => Effect.succeed(null))
            );

        const summary: Domain.ShiftReportSummary = {
          _id: report._id,
          _creationTime: report._creationTime,
          shiftId: report.shiftId,
          porterName: porterNames.get(report.shiftId) ?? '',
          fileName: report.fileName,
          status: report.status,
          downloadUrl,
          emailStatus: report.emailStatus,
          recipients: report.recipients,
          failureMessage: report.failureMessage,
          completedAt: report.completedAt,
        };

        return summary;
      }),
    { concurrency: 'unbounded' }
  );
});
