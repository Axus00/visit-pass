import * as Schema from 'effect/Schema';

/** A Portero can only report their own Turnos; Administradores any in the unit. */
export class ShiftReportNotAllowedError extends Schema.TaggedError<ShiftReportNotAllowedError>()(
  'ShiftReports/ShiftReportNotAllowedError',
  {}
) {}

/** Resend rejected the email or could not be reached; `status` is 0 without a response. */
export class ShiftReportEmailError extends Schema.TaggedError<ShiftReportEmailError>()(
  'ShiftReports/ShiftReportEmailError',
  {
    status: Schema.Finite,
    detail: Schema.String,
  }
) {}
