import { GenericId } from '@confect/core';
import * as SystemFields from '@confect/core/SystemFields';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { Id } from '../../../_generated/id';
import * as VisitsDomain from '../../visits/domain';
import * as WorkflowsDomain from '../../workflows/domain';
import { ShiftReportEmailError } from './errors';

export const ShiftReportStatus = Schema.Literals([
  'generating',
  'ready',
  'failed',
]);

export type ShiftReportStatus = typeof ShiftReportStatus.Type;

/**
 * `notConfigured` means the deployment has no Resend credentials, so the file
 * is ready to download but no email left.
 */
export const ShiftReportEmailStatus = Schema.Literals([
  'notRequested',
  'pending',
  'sent',
  'failed',
  'notConfigured',
]);

export type ShiftReportEmailStatus = typeof ShiftReportEmailStatus.Type;

export const ShiftReportsTableSchema = Schema.Struct({
  residentialUnitId: Id('residentialUnits'),
  shiftId: Id('shifts'),
  requestedByMembershipId: Id('memberships'),
  fileName: Schema.String,
  status: ShiftReportStatus,
  fileId: Schema.optional(GenericId.GenericId('_storage')),
  emailStatus: ShiftReportEmailStatus,
  /** Active Administradores of the unit when the email was requested. */
  recipients: Schema.Array(Schema.String),
  failureMessage: Schema.optional(Schema.String),
  workflowId: Schema.optional(Schema.String),
  completedAt: Schema.optional(Schema.Finite),
});

export type ShiftReport = typeof ShiftReportsTableSchema.Type;

export const ShiftReportsDocSchema = SystemFields.extendWithSystemFields(
  'shiftReports',
  ShiftReportsTableSchema
);

// -*******************************************************************************-
// Payloads and projections
// -*******************************************************************************-

export const RequestShiftReportDto = Schema.Struct({
  shiftId: Id('shifts'),
  sendEmail: Schema.Boolean,
});

export type RequestShiftReportDto = typeof RequestShiftReportDto.Type;

export const ShiftReportSummary = Schema.Struct({
  _id: Id('shiftReports'),
  _creationTime: Schema.Finite,
  shiftId: Id('shifts'),
  porterName: Schema.String,
  fileName: Schema.String,
  status: ShiftReportStatus,
  downloadUrl: Schema.NullOr(Schema.String),
  emailStatus: ShiftReportEmailStatus,
  recipients: Schema.Array(Schema.String),
  failureMessage: Schema.optional(Schema.String),
  completedAt: Schema.optional(Schema.Finite),
});

export type ShiftReportSummary = typeof ShiftReportSummary.Type;

// -*******************************************************************************-
// Report content
// -*******************************************************************************-

/** One Visita as the Reporte de turno lists it, with its references resolved. */
export const ShiftReportVisitRow = Schema.Struct({
  ...Struct.pick(VisitsDomain.VisitsTableSchema.fields, [
    'visitorName',
    'visitorDocument',
    'plate',
    'visitType',
    'origin',
    'overriddenRejection',
    'enteredAt',
    'exitedAt',
    'voidedAt',
    'voidReason',
  ]),
  apartmentLabel: Schema.String,
  entryPorterName: Schema.String,
});

export type ShiftReportVisitRow = typeof ShiftReportVisitRow.Type;

/** Everything the workbook shows, loaded in one read of the Turno. */
export const ShiftReportContent = Schema.Struct({
  residentialUnitName: Schema.String,
  timeZone: Schema.String,
  porterName: Schema.String,
  shiftStartedAt: Schema.optional(Schema.Finite),
  shiftEndedAt: Schema.optional(Schema.Finite),
  visits: Schema.Array(ShiftReportVisitRow),
});

export type ShiftReportContent = typeof ShiftReportContent.Type;

/** What the email step needs; the attachment is read back from storage. */
export const ShiftReportEmail = Schema.Struct({
  ...Struct.pick(ShiftReportsTableSchema.fields, ['fileName', 'recipients']),
  fileId: GenericId.GenericId('_storage'),
  residentialUnitName: Schema.String,
  porterName: Schema.String,
  /** The Turno's start in the unit's time zone, `dd/MM/yyyy HH:mm`. */
  shiftStartLabel: Schema.String,
});

export type ShiftReportEmail = typeof ShiftReportEmail.Type;

// -*******************************************************************************-
// Workflow
// -*******************************************************************************-

export const ShiftReportWorkflowError = Schema.Union([
  ShiftReportEmailError,
  WorkflowsDomain.UnknownError,
]).pipe(Schema.toTaggedUnion('_tag'));

export type ShiftReportWorkflowError = typeof ShiftReportWorkflowError.Type;

export type ShiftReportWorkflowErrorTag =
  keyof typeof ShiftReportWorkflowError.cases;

/** The email outcomes a workflow that ran to the end can report. */
export const CompletedShiftReportEmailStatus = Schema.Literals([
  'notRequested',
  'sent',
  'notConfigured',
]);

export type CompletedShiftReportEmailStatus =
  typeof CompletedShiftReportEmailStatus.Type;

/** What the workflow component reports to `onComplete`, before classification. */
export const ShiftReportOutcome = Schema.Union([
  Schema.Struct({
    type: Schema.Literal('completed'),
    emailStatus: CompletedShiftReportEmailStatus,
  }),
  Schema.Struct({
    type: Schema.Literal('failed'),
    serializedRawWorkflowError: Schema.String,
  }),
  Schema.Struct({ type: Schema.Literal('canceled') }),
]);

export type ShiftReportOutcome = typeof ShiftReportOutcome.Type;

export type TerminalShiftReportOutcome =
  | {
      readonly type: 'completed';
      readonly emailStatus: CompletedShiftReportEmailStatus;
    }
  | {
      readonly type: 'failed';
      readonly reason: ShiftReportWorkflowErrorTag | 'canceled';
    };
