import * as SystemFields from '@confect/core/SystemFields';
import * as Schema from 'effect/Schema';

import { Id } from '../../../_generated/id';

/** A planned Turno longer than this is rejected as a typo. */
export const MAX_SHIFT_HOURS = 24;

/**
 * `scheduled` is planned by the Administrador and not started; `open` has a
 * real start and no end; `closed` has both. A Portero may also open a Turno
 * that was never planned.
 */
export const ShiftStatus = Schema.Literals(['scheduled', 'open', 'closed']);

export type ShiftStatus = typeof ShiftStatus.Type;

export const ShiftsTableSchema = Schema.Struct({
  residentialUnitId: Id('residentialUnits'),
  porterMembershipId: Id('memberships'),
  plannedStart: Schema.optional(Schema.Finite),
  plannedEnd: Schema.optional(Schema.Finite),
  status: ShiftStatus,
  startedAt: Schema.optional(Schema.Finite),
  endedAt: Schema.optional(Schema.Finite),
  /** Set when an Administrador closes a Turno the Portero forgot to close. */
  closedByMembershipId: Schema.optional(Id('memberships')),
});

export type Shift = typeof ShiftsTableSchema.Type;

export const ShiftsDocSchema = SystemFields.extendWithSystemFields(
  'shifts',
  ShiftsTableSchema
);

// -*******************************************************************************-
// Payloads and projections
// -*******************************************************************************-

export const ShiftSummary = Schema.Struct({
  _id: Id('shifts'),
  porterMembershipId: Id('memberships'),
  porterName: Schema.String,
  status: ShiftStatus,
  plannedStart: Schema.optional(Schema.Finite),
  plannedEnd: Schema.optional(Schema.Finite),
  startedAt: Schema.optional(Schema.Finite),
  endedAt: Schema.optional(Schema.Finite),
  closedByAdministrator: Schema.Boolean,
});

export type ShiftSummary = typeof ShiftSummary.Type;

/** Visitas registered in a Turno: total, by origin and by Tipo de visita. */
export const ShiftStats = Schema.Struct({
  total: Schema.Finite,
  fromPass: Schema.Finite,
  manual: Schema.Finite,
  temporary: Schema.Finite,
  event: Schema.Finite,
  service: Schema.Finite,
  stillInside: Schema.Finite,
});

export type ShiftStats = typeof ShiftStats.Type;

export const PorterShiftState = Schema.Struct({
  openShift: Schema.NullOr(ShiftSummary),
  openShiftStats: Schema.NullOr(ShiftStats),
  /**
   * Planned Turnos this Portero can still start (not ended, or ended less than
   * `OVERDUE_START_HOURS` ago), soonest first.
   */
  upcoming: Schema.Array(ShiftSummary),
});

export type PorterShiftState = typeof PorterShiftState.Type;

export const ScheduleShiftDto = Schema.Struct({
  porterMembershipId: Id('memberships'),
  plannedStart: Schema.Finite,
  plannedEnd: Schema.Finite,
});

export type ScheduleShiftDto = typeof ScheduleShiftDto.Type;
