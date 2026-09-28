import * as Schema from 'effect/Schema';

/** Registering an Ingreso needs the Portero's own open Turno. */
export class NoOpenShiftError extends Schema.TaggedError<NoOpenShiftError>()(
  'Shifts/NoOpenShiftError',
  {}
) {}

export class ShiftAlreadyOpenError extends Schema.TaggedError<ShiftAlreadyOpenError>()(
  'Shifts/ShiftAlreadyOpenError',
  {}
) {}

export class ShiftNotFoundError extends Schema.TaggedError<ShiftNotFoundError>()(
  'Shifts/ShiftNotFoundError',
  {}
) {}

/** The transition does not apply to the Turno's current status. */
export class InvalidShiftTransitionError extends Schema.TaggedError<InvalidShiftTransitionError>()(
  'Shifts/InvalidShiftTransitionError',
  {}
) {}

export class InvalidShiftScheduleError extends Schema.TaggedError<InvalidShiftScheduleError>()(
  'Shifts/InvalidShiftScheduleError',
  {
    reason: Schema.Literals([
      'endBeforeStart',
      'endsInThePast',
      'tooLong',
      'notAPorter',
      /** The unit already has as many future Turnos as its listing shows. */
      'tooManyScheduled',
    ]),
  }
) {}
