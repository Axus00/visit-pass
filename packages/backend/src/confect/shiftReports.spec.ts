import { FunctionSpec, GenericId, GroupSpec } from '@confect/core';
import * as Schema from 'effect/Schema';

import { Id } from './_generated/id';
import RequireUserIdentity from './middleware/RequireUserIdentity.spec';
import * as MembershipsDomain from './modules/memberships/domain';
import * as ShiftReportsDomain from './modules/shiftReports/domain';
import * as ShiftsDomain from './modules/shifts/domain';
import type {
  handleShiftReportWorkflowComplete,
  shiftReportWorkflow,
  startShiftReportWorkflow,
} from './shiftReports';

export default GroupSpec.make()
  // -*******************************************************************************-
  // Public
  // -*******************************************************************************-
  .addFunction(
    /**
     * Portero (own Turnos) or Administrador: generates the XLSX Reporte de
     * turno and, with `sendEmail`, emails it to the unit's Administradores.
     */
    FunctionSpec.publicMutation({
      name: 'request',
      args: () => ({
        membershipId: Id('memberships'),
        ...ShiftReportsDomain.RequestShiftReportDto.fields,
      }),
      returns: () => Id('shiftReports'),
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          ShiftsDomain.ShiftNotFoundError,
          ShiftReportsDomain.ShiftReportNotAllowedError,
        ]),
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: 'listForShift',
      args: () => ({ membershipId: Id('memberships'), shiftId: Id('shifts') }),
      returns: () => Schema.Array(ShiftReportsDomain.ShiftReportSummary),
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          ShiftsDomain.ShiftNotFoundError,
          ShiftReportsDomain.ShiftReportNotAllowedError,
        ]),
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Administrador: the unit's latest Reportes de turno. */
    FunctionSpec.publicQuery({
      name: 'listForUnit',
      args: () => ({ membershipId: Id('memberships') }),
      returns: () => Schema.Array(ShiftReportsDomain.ShiftReportSummary),
      error: () => MembershipsDomain.AccessDeniedError,
    }).middleware(RequireUserIdentity)
  )
  // -*******************************************************************************-
  // Internal
  // -*******************************************************************************-
  .addFunction(
    FunctionSpec.internalQuery({
      name: 'getReportContent',
      args: () => ({ shiftReportId: Id('shiftReports') }),
      returns: () => ShiftReportsDomain.ShiftReportContent,
      error: () => Schema.Never,
    })
  )
  .addFunction(
    /** Workflow step: builds the workbook and returns its storage id. */
    FunctionSpec.internalAction({
      name: 'generateFile',
      args: () => ({ shiftReportId: Id('shiftReports') }),
      returns: () => GenericId.GenericId('_storage'),
      error: () => Schema.Never,
    })
  )
  .addFunction(
    /** Workflow step: makes the file downloadable and answers the email status. */
    FunctionSpec.internalMutation({
      name: 'recordFile',
      args: () => ({
        shiftReportId: Id('shiftReports'),
        fileId: GenericId.GenericId('_storage'),
      }),
      returns: () => ShiftReportsDomain.ShiftReportEmailStatus,
      error: () => Schema.Never,
    })
  )
  .addFunction(
    FunctionSpec.internalQuery({
      name: 'getEmail',
      args: () => ({ shiftReportId: Id('shiftReports') }),
      returns: () => Schema.NullOr(ShiftReportsDomain.ShiftReportEmail),
      error: () => Schema.Never,
    })
  )
  .addFunction(
    /** Workflow step: emails the stored workbook to the recipients. */
    FunctionSpec.internalAction({
      name: 'sendEmail',
      args: () => ({ shiftReportId: Id('shiftReports') }),
      returns: () => Schema.Literals(['sent', 'notConfigured']),
      error: () => ShiftReportsDomain.ShiftReportEmailError,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: 'terminalize',
      args: () => ({
        shiftReportId: Id('shiftReports'),
        outcome: ShiftReportsDomain.ShiftReportOutcome,
      }),
      returns: () => Schema.Null,
      error: () => Schema.Never,
    })
  )
  .addFunction(
    FunctionSpec.convexInternalMutation<typeof startShiftReportWorkflow>()(
      'startShiftReportWorkflow'
    )
  )
  .addFunction(
    FunctionSpec.convexInternalMutation<typeof shiftReportWorkflow>()(
      'shiftReportWorkflow'
    )
  )
  .addFunction(
    FunctionSpec.convexInternalMutation<
      typeof handleShiftReportWorkflowComplete
    >()('handleShiftReportWorkflowComplete')
  );
