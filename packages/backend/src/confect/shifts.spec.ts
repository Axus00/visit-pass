import { FunctionSpec, GroupSpec } from '@confect/core';
import * as Schema from 'effect/Schema';

import { Id } from './_generated/id';
import RequireUserIdentity from './middleware/RequireUserIdentity.spec';
import * as MembershipsDomain from './modules/memberships/domain';
import * as ShiftsDomain from './modules/shifts/domain';

export default GroupSpec.make()
  // -*******************************************************************************-
  // Public — Portero
  // -*******************************************************************************-
  .addFunction(
    /** Portero: the open Turno with its counters and the upcoming planned ones. */
    FunctionSpec.publicQuery({
      name: 'getMyState',
      args: () => ({ membershipId: Id('memberships'), now: Schema.Finite }),
      returns: () => ShiftsDomain.PorterShiftState,
      error: () => MembershipsDomain.AccessDeniedError,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /**
     * Portero: marks the real start. With `shiftId` it starts that planned
     * Turno; without it, it starts the planned Turno under way (see
     * `findPlannedShiftToStart`) or, if there is none, opens an unplanned one.
     */
    FunctionSpec.publicMutation({
      name: 'start',
      args: () => ({
        membershipId: Id('memberships'),
        shiftId: Schema.optional(Id('shifts')),
      }),
      returns: () => Id('shifts'),
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          ShiftsDomain.ShiftAlreadyOpenError,
          ShiftsDomain.ShiftNotFoundError,
          ShiftsDomain.InvalidShiftTransitionError,
        ]),
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Portero: marks the real end of their open Turno. */
    FunctionSpec.publicMutation({
      name: 'end',
      args: () => ({ membershipId: Id('memberships'), shiftId: Id('shifts') }),
      returns: () => Schema.Null,
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          ShiftsDomain.ShiftNotFoundError,
          ShiftsDomain.InvalidShiftTransitionError,
        ]),
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Portero: their latest closed Turnos, for reports. */
    FunctionSpec.publicQuery({
      name: 'listMine',
      args: () => ({ membershipId: Id('memberships') }),
      returns: () => Schema.Array(ShiftsDomain.ShiftSummary),
      error: () => MembershipsDomain.AccessDeniedError,
    }).middleware(RequireUserIdentity)
  )

  // -*******************************************************************************-
  // Public — Administrador
  // -*******************************************************************************-
  .addFunction(
    /**
     * Administrador: open Turnos, the scheduled ones still ahead or recently
     * missed as of `now` (soonest first), and the latest closed ones.
     */
    FunctionSpec.publicQuery({
      name: 'listForUnit',
      args: () => ({ membershipId: Id('memberships'), now: Schema.Finite }),
      returns: () => Schema.Array(ShiftsDomain.ShiftSummary),
      error: () => MembershipsDomain.AccessDeniedError,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: 'schedule',
      args: () => ({
        membershipId: Id('memberships'),
        ...ShiftsDomain.ScheduleShiftDto.fields,
      }),
      returns: () => Id('shifts'),
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          ShiftsDomain.InvalidShiftScheduleError,
        ]),
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Administrador: deletes a planned Turno that has not started. */
    FunctionSpec.publicMutation({
      name: 'cancelScheduled',
      args: () => ({ membershipId: Id('memberships'), shiftId: Id('shifts') }),
      returns: () => Schema.Null,
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          ShiftsDomain.ShiftNotFoundError,
          ShiftsDomain.InvalidShiftTransitionError,
        ]),
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Administrador: closes an open Turno the Portero forgot to close. */
    FunctionSpec.publicMutation({
      name: 'forceClose',
      args: () => ({ membershipId: Id('memberships'), shiftId: Id('shifts') }),
      returns: () => Schema.Null,
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          ShiftsDomain.ShiftNotFoundError,
          ShiftsDomain.InvalidShiftTransitionError,
        ]),
    }).middleware(RequireUserIdentity)
  );
