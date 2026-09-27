import * as Schema from 'effect/Schema';

/**
 * A Portero can only report their own Turnos (`notOwnShift`); Administradores
 * any in the unit. Nobody reports a Turno still `scheduled` (`shiftNotStarted`),
 * since cancelling it deletes it.
 */
export class ShiftReportNotAllowedError extends Schema.TaggedError<ShiftReportNotAllowedError>()(
  'ShiftReports/ShiftReportNotAllowedError',
  { reason: Schema.Literals(['notOwnShift', 'shiftNotStarted']) }
) {}

/** Resend rejected the email or could not be reached; `status` is 0 without a response. */
export class ShiftReportEmailError extends Schema.TaggedError<ShiftReportEmailError>()(
  'ShiftReports/ShiftReportEmailError',
  {
    status: Schema.Finite,
    detail: Schema.String,
  }
) {}
