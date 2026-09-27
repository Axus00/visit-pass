import { FunctionImpl, GroupImpl } from '@confect/server';
import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';

import refs from './_generated/refs';
import databaseSchema from './_generated/schema';
import {
  DatabaseReader,
  DatabaseWriter,
  MutationRunner,
  QueryRunner,
  StorageActionWriter,
  StorageWriter,
} from './_generated/services';
import RequireUserIdentity from './middleware/RequireUserIdentity.impl';
import * as Memberships from './modules/memberships';
import * as ShiftReports from './modules/shiftReports';
import {
  handleShiftReportWorkflowComplete,
  shiftReportWorkflow,
  startShiftReportWorkflow,
} from './shiftReports';
import shiftReportsSpec from './shiftReports.spec';

/** The newest reports a list shows; older ones expire with retention anyway. */
const LIST_LIMIT = 30;

// -*******************************************************************************-
// Public
// -*******************************************************************************-

const requestImpl = FunctionImpl.make(
  databaseSchema,
  shiftReportsSpec,
  'request',
  (args) =>
    Effect.gen(function* () {
      const mutationRunner = yield* MutationRunner;

      const shiftReportId = yield* ShiftReports.requestShiftReport(args);

      yield* mutationRunner(
        refs.internal.shiftReports.startShiftReportWorkflow,
        { shiftReportId }
      ).pipe(Effect.catchTag('SchemaError', Effect.die));

      return shiftReportId;
    })
);

const listForShiftImpl = FunctionImpl.make(
  databaseSchema,
  shiftReportsSpec,
  'listForShift',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['porter', 'administrator']
      );

      const shift = yield* ShiftReports.requireReportableShift({
        membership,
        shiftId: args.shiftId,
      });

      const reports = yield* reader
        .table('shiftReports')
        .index('by_shiftId', (q) => q.eq('shiftId', shift._id), 'desc')
        .take(LIST_LIMIT)
        .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

      return yield* ShiftReports.toShiftReportSummaries(reports);
    })
);

const listForUnitImpl = FunctionImpl.make(
  databaseSchema,
  shiftReportsSpec,
  'listForUnit',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      const { membership } = yield* Memberships.requireMembership(
        args.membershipId,
        ['administrator']
      );

      const reports = yield* reader
        .table('shiftReports')
        .index(
          'by_residentialUnitId',
          (q) => q.eq('residentialUnitId', membership.residentialUnitId),
          'desc'
        )
        .take(LIST_LIMIT)
        .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

      return yield* ShiftReports.toShiftReportSummaries(reports);
    })
);

// -*******************************************************************************-
// Internal
// -*******************************************************************************-

const getReportContentImpl = FunctionImpl.make(
  databaseSchema,
  shiftReportsSpec,
  'getReportContent',
  (args) => ShiftReports.loadShiftReportContent(args.shiftReportId)
);

const generateFileImpl = FunctionImpl.make(
  databaseSchema,
  shiftReportsSpec,
  'generateFile',
  (args) =>
    Effect.gen(function* () {
      const queryRunner = yield* QueryRunner;
      const storage = yield* StorageActionWriter;

      const content = yield* queryRunner(
        refs.internal.shiftReports.getReportContent,
        { shiftReportId: args.shiftReportId }
      ).pipe(Effect.catchTag('SchemaError', Effect.die));

      const workbook = ShiftReports.encodeXlsx(
        ShiftReports.buildShiftReportWorkbookParts({
          content,
          generatedAt: yield* Clock.currentTimeMillis,
        })
      );

      return yield* storage.store(
        new Blob([new Uint8Array(workbook)], {
          type: ShiftReports.XLSX_MIME_TYPE,
        })
      );
    })
);

const recordFileImpl = FunctionImpl.make(
  databaseSchema,
  shiftReportsSpec,
  'recordFile',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const writer = yield* DatabaseWriter;
      const storageWriter = yield* StorageWriter;

      const report = yield* reader
        .table('shiftReports')
        .get(args.shiftReportId)
        .pipe(
          Effect.catchTags({
            GetByIdFailure: () => Effect.succeed(null),
            DocumentDecodeError: Effect.die,
          })
        );

      // Retention deleted the row while the file was being built.
      if (Predicate.isNull(report)) {
        yield* storageWriter
          .delete(args.fileId)
          .pipe(Effect.catchTag('BlobNotFoundError', () => Effect.void));

        return 'notRequested' as const;
      }

      yield* writer
        .table('shiftReports')
        .patch(report._id, { fileId: args.fileId, status: 'ready' })
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );

      return report.emailStatus;
    })
);

/** What the email step sends; `null` once the file is gone or was never stored. */
const getEmailImpl = FunctionImpl.make(
  databaseSchema,
  shiftReportsSpec,
  'getEmail',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;

      const report = yield* reader
        .table('shiftReports')
        .get(args.shiftReportId)
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

      const porterName = yield* ShiftReports.getMemberDisplayName(
        shift.porterMembershipId
      );

      const email: ShiftReports.ShiftReportEmail = {
        fileName: report.fileName,
        recipients: report.recipients,
        fileId: report.fileId,
        residentialUnitName: unit.name,
        porterName,
        shiftStartLabel: ShiftReports.formatLocalDateTime(
          shift.startedAt ?? shift.plannedStart ?? shift._creationTime,
          unit.timeZone
        ),
      };

      return email;
    })
);

const sendEmailImpl = FunctionImpl.make(
  databaseSchema,
  shiftReportsSpec,
  'sendEmail',
  (args) =>
    Effect.gen(function* () {
      const queryRunner = yield* QueryRunner;
      const storage = yield* StorageActionWriter;
      const mailer = yield* ShiftReports.ShiftReportMailer;

      const email = yield* queryRunner(refs.internal.shiftReports.getEmail, {
        shiftReportId: args.shiftReportId,
      }).pipe(Effect.catchTag('SchemaError', Effect.die));

      if (Predicate.isNull(email))
        return yield* Effect.die(
          'The shift report has no stored file to email'
        );

      const blob = yield* storage
        .get(email.fileId)
        .pipe(Effect.catchTag('BlobNotFoundError', Effect.die));
      const content = new Uint8Array(
        yield* Effect.promise(() => blob.arrayBuffer())
      );

      const message = ShiftReports.toShiftReportEmailMessage(email);

      return yield* mailer.send({
        to: email.recipients,
        subject: message.subject,
        text: message.text,
        attachment: { fileName: email.fileName, content },
        idempotencyKey: `shift-report/${args.shiftReportId}`,
      });
    }).pipe(Effect.provide(ShiftReports.resendShiftReportMailerLayer))
);

const terminalizeImpl = FunctionImpl.make(
  databaseSchema,
  shiftReportsSpec,
  'terminalize',
  (args) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const writer = yield* DatabaseWriter;

      const report = yield* reader
        .table('shiftReports')
        .get(args.shiftReportId)
        .pipe(
          Effect.catchTags({
            GetByIdFailure: () => Effect.succeed(null),
            DocumentDecodeError: Effect.die,
          })
        );

      if (Predicate.isNull(report)) {
        yield* Effect.logWarning(
          '[terminalize] Skipped a report that retention already deleted',
          { shiftReportId: args.shiftReportId }
        );

        return null;
      }

      // The first terminal outcome wins when completion is replayed.
      if (Predicate.isNotUndefined(report.completedAt)) {
        yield* Effect.logWarning(
          '[terminalize] Skipped a report that is already terminal',
          { shiftReportId: args.shiftReportId, status: report.status }
        );

        return null;
      }

      const outcome = ShiftReports.toTerminalShiftReportOutcome(args.outcome);

      const failureMessage =
        outcome.type === 'failed'
          ? ShiftReports.deriveShiftReportFailureMessage({
              reason: outcome.reason,
              hasFile: Predicate.isNotUndefined(report.fileId),
            })
          : undefined;

      yield* writer
        .table('shiftReports')
        .patch(report._id, {
          ...ShiftReports.toTerminalShiftReport({
            report,
            outcome,
            now: yield* Clock.currentTimeMillis,
          }),
          failureMessage,
        })
        .pipe(
          Effect.catchTag(
            ['GetByIdFailure', 'DocumentDecodeError', 'DocumentEncodeError'],
            Effect.die
          )
        );

      return null;
    })
);

const startShiftReportWorkflowImpl = FunctionImpl.make(
  databaseSchema,
  shiftReportsSpec,
  'startShiftReportWorkflow',
  startShiftReportWorkflow
);

const shiftReportWorkflowImpl = FunctionImpl.make(
  databaseSchema,
  shiftReportsSpec,
  'shiftReportWorkflow',
  shiftReportWorkflow
);

const handleShiftReportWorkflowCompleteImpl = FunctionImpl.make(
  databaseSchema,
  shiftReportsSpec,
  'handleShiftReportWorkflowComplete',
  handleShiftReportWorkflowComplete
);

// -*******************************************************************************-
// API
// -*******************************************************************************-

export default GroupImpl.make(databaseSchema, shiftReportsSpec).pipe(
  Layer.provide(requestImpl),
  Layer.provide(listForShiftImpl),
  Layer.provide(listForUnitImpl),
  Layer.provide(getReportContentImpl),
  Layer.provide(generateFileImpl),
  Layer.provide(recordFileImpl),
  Layer.provide(getEmailImpl),
  Layer.provide(sendEmailImpl),
  Layer.provide(terminalizeImpl),
  Layer.provide(startShiftReportWorkflowImpl),
  Layer.provide(shiftReportWorkflowImpl),
  Layer.provide(handleShiftReportWorkflowCompleteImpl),
  Layer.provide(RequireUserIdentity),

  GroupImpl.finalize
);
