import type { WorkflowId } from '@convex-dev/workflow';
import { describe, it } from '@effect/vitest';
import * as EffectVitestUtils from '@effect/vitest/utils';
import type { GenericId } from 'convex/values';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';

import { Id } from './_generated/id';
import refs from './_generated/refs';
import { DatabaseReader, DatabaseWriter } from './_generated/services';
import * as Authentication from './modules/authentication';
import * as Memberships from './modules/memberships';
import * as ShiftReports from './modules/shiftReports';
import * as Shifts from './modules/shifts';
import * as TestConfect from './test.setup';

const workflowId = 'workflow_1' as WorkflowId;

const identityOf = (key: string) => ({
  subject: key,
  tokenIdentifier: `test|${key}`,
});

const World = Schema.Struct({
  unitA: Id('residentialUnits'),
  shiftA: Id('shifts'),
  scheduledShiftA: Id('shifts'),
  porterA: Id('memberships'),
  porterA2: Id('memberships'),
  adminA: Id('memberships'),
  adminB: Id('memberships'),
});

/**
 * Unit A with Porteros `porterA` (owner of `shiftA`, which has one Visita, and
 * of the not yet started `scheduledShiftA`) and `porterA2`, the Administrador
 * `adminA`, and unit B with its own `adminB`.
 */
const seedWorld = Effect.gen(function* () {
  const confect = yield* TestConfect.TestConfect;

  return yield* confect.run(
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;

      const insertUnit = (name: string) =>
        writer.table('residentialUnits').insert({
          name,
          city: 'Bogotá',
          timeZone: 'America/Bogota',
          visitRetentionMonths: 12,
        });

      const insertMember = Effect.fn(function* (args: {
        key: string;
        residentialUnitId: GenericId<'residentialUnits'>;
        role: 'porter' | 'administrator';
      }) {
        const email = `${args.key}@example.test`;
        const userId = yield* writer.table('users').insert({
          externalId: args.key,
          identityTokenIdentifier: identityOf(args.key).tokenIdentifier,
          email,
          firstName: args.key,
          lastName: 'Test',
          profilePictureUrl: null,
          lastSignInAt: null,
          locale: null,
          externalCreatedAt: 0,
          externalUpdatedAt: 0,
        });

        return yield* writer.table('memberships').insert({
          residentialUnitId: args.residentialUnitId,
          email,
          userId,
          role: args.role,
          status: 'active',
          activatedAt: 0,
        });
      });

      const unitA = yield* insertUnit('Conjunto Los Álamos');
      const unitB = yield* insertUnit('Edificio Central');

      const porterA = yield* insertMember({
        key: 'porterA',
        residentialUnitId: unitA,
        role: 'porter',
      });
      const porterA2 = yield* insertMember({
        key: 'porterA2',
        residentialUnitId: unitA,
        role: 'porter',
      });
      const adminA = yield* insertMember({
        key: 'adminA',
        residentialUnitId: unitA,
        role: 'administrator',
      });
      const adminB = yield* insertMember({
        key: 'adminB',
        residentialUnitId: unitB,
        role: 'administrator',
      });

      const apartmentId = yield* writer.table('apartments').insert({
        residentialUnitId: unitA,
        tower: '1',
        number: '101',
      });

      const startedAt = Date.UTC(2026, 8, 26, 19, 5);
      const shiftA = yield* writer.table('shifts').insert({
        residentialUnitId: unitA,
        porterMembershipId: porterA,
        status: 'open',
        startedAt,
      });

      const scheduledShiftA = yield* writer.table('shifts').insert({
        residentialUnitId: unitA,
        porterMembershipId: porterA,
        status: 'scheduled',
        plannedStart: startedAt + 86_400_000,
        plannedEnd: startedAt + 86_400_000 + 8 * 3_600_000,
      });

      yield* writer.table('visits').insert({
        residentialUnitId: unitA,
        apartmentId,
        visitorName: 'Ana Gómez',
        visitorDocument: '99887766',
        visitType: 'temporary',
        origin: 'manual',
        shiftId: shiftA,
        entryPorterMembershipId: porterA,
        enteredAt: startedAt + 60_000,
        privacyNoticeVersion: 'test',
      });

      return {
        unitA,
        shiftA,
        scheduledShiftA,
        porterA,
        porterA2,
        adminA,
        adminB,
      };
    }).pipe(Effect.orDie),
    World
  );
});

const RequestedReport = Schema.Struct({
  fileName: Schema.String,
  status: ShiftReports.ShiftReportStatus,
  emailStatus: ShiftReports.ShiftReportEmailStatus,
  recipients: Schema.mutable(Schema.Array(Schema.String)),
  requestedBy: Id('memberships'),
});

/** Inserts the row `request` would, without starting the workflow component. */
const seedGeneratingReport = (
  world: typeof World.Type,
  emailStatus: 'pending' | 'notRequested',
  shiftId: GenericId<'shifts'> = world.shiftA
) =>
  Effect.gen(function* () {
    const confect = yield* TestConfect.TestConfect;

    return yield* confect.run(
      Effect.gen(function* () {
        const writer = yield* DatabaseWriter;

        return yield* writer.table('shiftReports').insert({
          residentialUnitId: world.unitA,
          shiftId,
          requestedByMembershipId: world.porterA,
          fileName: 'reporte.xlsx',
          status: 'generating',
          emailStatus,
          recipients: emailStatus === 'pending' ? ['adminA@example.test'] : [],
        });
      }).pipe(Effect.orDie),
      Id('shiftReports')
    );
  });

const listForShiftAsAdmin = (world: typeof World.Type) =>
  Effect.gen(function* () {
    const confect = yield* TestConfect.TestConfect;

    return yield* confect
      .withIdentity(identityOf('adminA'))
      .query(refs.public.shiftReports.listForShift, {
        membershipId: world.adminA,
        shiftId: world.shiftA,
      });
  });

describe('shiftReports', () => {
  it.effect('lets a Portero report only their own Turnos', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* seedWorld;

      const request = yield* Effect.result(
        confect
          .withIdentity(identityOf('porterA2'))
          .mutation(refs.public.shiftReports.request, {
            membershipId: world.porterA2,
            shiftId: world.shiftA,
            sendEmail: false,
          })
      );
      EffectVitestUtils.assertFailure(
        request,
        new ShiftReports.ShiftReportNotAllowedError({ reason: 'notOwnShift' })
      );

      const list = yield* Effect.result(
        confect
          .withIdentity(identityOf('porterA2'))
          .query(refs.public.shiftReports.listForShift, {
            membershipId: world.porterA2,
            shiftId: world.shiftA,
          })
      );
      EffectVitestUtils.assertFailure(
        list,
        new ShiftReports.ShiftReportNotAllowedError({ reason: 'notOwnShift' })
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('refuses to report a Turno that has not started', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* seedWorld;

      const request = yield* Effect.result(
        confect
          .withIdentity(identityOf('adminA'))
          .mutation(refs.public.shiftReports.request, {
            membershipId: world.adminA,
            shiftId: world.scheduledShiftA,
            sendEmail: false,
          })
      );
      EffectVitestUtils.assertFailure(
        request,
        new ShiftReports.ShiftReportNotAllowedError({
          reason: 'shiftNotStarted',
        })
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('still lists the unit’s reports when a Turno was deleted', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* seedWorld;
      const orphanedId = yield* seedGeneratingReport(
        world,
        'notRequested',
        world.scheduledShiftA
      );
      const keptId = yield* seedGeneratingReport(world, 'notRequested');

      yield* confect.run(
        Effect.gen(function* () {
          const writer = yield* DatabaseWriter;
          yield* writer.table('shifts').delete(world.scheduledShiftA);
        })
      );

      const reports = yield* confect
        .withIdentity(identityOf('adminA'))
        .query(refs.public.shiftReports.listForUnit, {
          membershipId: world.adminA,
        });

      EffectVitestUtils.deepStrictEqual(
        new Map(reports.map((report) => [report._id, report.porterName])),
        new Map([
          [keptId, 'porterA Test'],
          [orphanedId, ShiftReports.DELETED_SHIFT_PORTER_NAME],
        ])
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('hides another unit’s Turnos and Membresías', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* seedWorld;
      const adminB = confect.withIdentity(identityOf('adminB'));

      const otherUnitShift = yield* Effect.result(
        adminB.mutation(refs.public.shiftReports.request, {
          membershipId: world.adminB,
          shiftId: world.shiftA,
          sendEmail: true,
        })
      );
      EffectVitestUtils.assertFailure(
        otherUnitShift,
        new Shifts.ShiftNotFoundError()
      );

      const borrowedMembership = yield* Effect.result(
        adminB.query(refs.public.shiftReports.listForUnit, {
          membershipId: world.adminA,
        })
      );
      EffectVitestUtils.assertFailure(
        borrowedMembership,
        new Memberships.AccessDeniedError()
      );

      const porterListingUnit = yield* Effect.result(
        confect
          .withIdentity(identityOf('porterA'))
          .query(refs.public.shiftReports.listForUnit, {
            membershipId: world.porterA,
          })
      );
      EffectVitestUtils.assertFailure(
        porterListingUnit,
        new Memberships.AccessDeniedError()
      );
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('records who receives the email and names the file', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* seedWorld;

      const report = yield* confect.run(
        Effect.gen(function* () {
          const reader = yield* DatabaseReader;

          const shiftReportId = yield* ShiftReports.requestShiftReport({
            membershipId: world.porterA,
            shiftId: world.shiftA,
            sendEmail: true,
          }).pipe(
            Effect.provideService(
              Authentication.CurrentUserIdentity,
              identityOf('porterA')
            )
          );

          const inserted = yield* reader
            .table('shiftReports')
            .get(shiftReportId);

          return {
            fileName: inserted.fileName,
            status: inserted.status,
            emailStatus: inserted.emailStatus,
            recipients: [...inserted.recipients],
            requestedBy: inserted.requestedByMembershipId,
          };
        }).pipe(Effect.orDie),
        RequestedReport
      );

      EffectVitestUtils.deepStrictEqual(report, {
        fileName: 'reporte-turno-conjunto-los-alamos-2026-09-26-1405.xlsx',
        status: 'generating',
        emailStatus: 'pending',
        recipients: ['adminA@example.test'],
        requestedBy: world.porterA,
      });
    }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'emails no Administrador whose Usuario was deleted, and invited ones by their invited email',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* seedWorld;

        const recipients = yield* confect.run(
          Effect.gen(function* () {
            const reader = yield* DatabaseReader;
            const writer = yield* DatabaseWriter;

            const deletedUserId = yield* writer.table('users').insert({
              externalId: 'deletedAdmin',
              identityTokenIdentifier:
                identityOf('deletedAdmin').tokenIdentifier,
              email: 'deleted.user@example.test',
              firstName: 'Deleted',
              lastName: 'Admin',
              profilePictureUrl: null,
              lastSignInAt: null,
              locale: null,
              externalCreatedAt: 0,
              externalUpdatedAt: 0,
              deletedAt: 0,
            });

            yield* writer.table('memberships').insert({
              residentialUnitId: world.unitA,
              email: 'deleted.membership@example.test',
              userId: deletedUserId,
              role: 'administrator',
              status: 'active',
              activatedAt: 0,
            });
            yield* writer.table('memberships').insert({
              residentialUnitId: world.unitA,
              email: 'unlinked@example.test',
              role: 'administrator',
              status: 'active',
              activatedAt: 0,
            });

            const shiftReportId = yield* ShiftReports.requestShiftReport({
              membershipId: world.porterA,
              shiftId: world.shiftA,
              sendEmail: true,
            }).pipe(
              Effect.provideService(
                Authentication.CurrentUserIdentity,
                identityOf('porterA')
              )
            );

            const inserted = yield* reader
              .table('shiftReports')
              .get(shiftReportId);

            return [...inserted.recipients];
          }).pipe(Effect.orDie),
          Schema.mutable(Schema.Array(Schema.String))
        );

        EffectVitestUtils.deepStrictEqual(recipients, [
          'adminA@example.test',
          'unlinked@example.test',
        ]);
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect(
    'stores the file, skips an unconfigured email and completes once',
    () =>
      Effect.gen(function* () {
        const confect = yield* TestConfect.TestConfect;
        const world = yield* seedWorld;
        const shiftReportId = yield* seedGeneratingReport(world, 'pending');

        const content = yield* confect.query(
          refs.internal.shiftReports.getReportContent,
          { shiftReportId }
        );
        EffectVitestUtils.deepStrictEqual(
          content.visits.map((visit) => [
            visit.visitorName,
            visit.apartmentLabel,
            visit.entryPorterName,
          ]),
          [['Ana Gómez', 'Torre 1 · 101', 'porterA Test']]
        );

        const fileId = yield* confect.action(
          refs.internal.shiftReports.generateFile,
          { shiftReportId }
        );
        const emailStatus = yield* confect.mutation(
          refs.internal.shiftReports.recordFile,
          { shiftReportId, fileId }
        );
        EffectVitestUtils.strictEqual(emailStatus, 'pending');

        const [downloadable] = yield* listForShiftAsAdmin(world);
        EffectVitestUtils.strictEqual(downloadable?.status, 'ready');
        EffectVitestUtils.assertTrue(
          Predicate.isString(downloadable?.downloadUrl)
        );
        EffectVitestUtils.strictEqual(downloadable?.completedAt, undefined);

        // No Resend credentials exist in tests, so the step reports it.
        const sent = yield* confect.action(
          refs.internal.shiftReports.sendEmail,
          { shiftReportId }
        );
        EffectVitestUtils.strictEqual(sent, 'notConfigured');

        yield* confect.mutation(
          refs.internal.shiftReports.handleShiftReportWorkflowComplete,
          {
            workflowId,
            result: { kind: 'success', returnValue: sent },
            context: { shiftReportId },
          }
        );
        // A replayed completion must not overwrite the first terminal outcome.
        yield* confect.mutation(
          refs.internal.shiftReports.handleShiftReportWorkflowComplete,
          {
            workflowId,
            result: { kind: 'canceled' },
            context: { shiftReportId },
          }
        );

        const [completed] = yield* listForShiftAsAdmin(world);
        EffectVitestUtils.deepStrictEqual(
          {
            status: completed?.status,
            emailStatus: completed?.emailStatus,
            porterName: completed?.porterName,
            failureMessage: completed?.failureMessage,
            isCompleted: Predicate.isNumber(completed?.completedAt),
          },
          {
            status: 'ready',
            emailStatus: 'notConfigured',
            porterName: 'porterA Test',
            failureMessage: undefined,
            isCompleted: true,
          }
        );
      }).pipe(Effect.provide(TestConfect.layer))
  );

  it.effect('keeps a stored file downloadable when the email fails', () =>
    Effect.gen(function* () {
      const confect = yield* TestConfect.TestConfect;
      const world = yield* seedWorld;
      const [emailFailedId, nothingStoredId] = yield* Effect.all([
        seedGeneratingReport(world, 'pending'),
        seedGeneratingReport(world, 'notRequested'),
      ]);

      const fileId = yield* confect.action(
        refs.internal.shiftReports.generateFile,
        { shiftReportId: emailFailedId }
      );
      yield* confect.mutation(refs.internal.shiftReports.recordFile, {
        shiftReportId: emailFailedId,
        fileId,
      });

      const serializedEmailError =
        '{"_tag":"Workflows/UnknownError","rawWorkflowError":"Uncaught ConvexError: {\\"_tag\\":\\"ShiftReports/ShiftReportEmailError\\",\\"status\\":422,\\"detail\\":\\"invalid from\\"}"}';

      yield* confect.mutation(
        refs.internal.shiftReports.handleShiftReportWorkflowComplete,
        {
          workflowId,
          result: { kind: 'failed', error: serializedEmailError },
          context: { shiftReportId: emailFailedId },
        }
      );
      yield* confect.mutation(
        refs.internal.shiftReports.handleShiftReportWorkflowComplete,
        {
          workflowId,
          result: { kind: 'failed', error: 'boom' },
          context: { shiftReportId: nothingStoredId },
        }
      );

      const reports = yield* listForShiftAsAdmin(world);
      const summaries = new Map(
        reports.map((report) => [
          report._id,
          {
            status: report.status,
            emailStatus: report.emailStatus,
            failureMessage: report.failureMessage,
            hasDownload: Predicate.isString(report.downloadUrl),
          },
        ])
      );

      EffectVitestUtils.deepStrictEqual(summaries.get(emailFailedId), {
        status: 'ready',
        emailStatus: 'failed',
        failureMessage: ShiftReports.deriveShiftReportFailureMessage({
          reason: 'ShiftReports/ShiftReportEmailError',
          hasFile: true,
        }),
        hasDownload: true,
      });
      EffectVitestUtils.deepStrictEqual(summaries.get(nothingStoredId), {
        status: 'failed',
        emailStatus: 'notRequested',
        failureMessage: ShiftReports.deriveShiftReportFailureMessage({
          reason: 'Workflows/UnknownError',
          hasFile: false,
        }),
        hasDownload: false,
      });
    }).pipe(Effect.provide(TestConfect.layer))
  );
});
