import { FunctionSpec, GroupSpec } from '@confect/core';
import * as Schema from 'effect/Schema';

import { Id } from './_generated/id';
import RequireUserIdentity from './middleware/RequireUserIdentity.spec';
import * as MembershipsDomain from './modules/memberships/domain';
import * as ResidentialUnitsDomain from './modules/residentialUnits/domain';
import * as ShiftsDomain from './modules/shifts/domain';
import * as VisitsDomain from './modules/visits/domain';

export default GroupSpec.make()
  // -*******************************************************************************-
  // Public
  // -*******************************************************************************-
  .addFunction(
    /**
     * Portero: previews a scanned Pase and whether it would be admitted.
     * `now` comes from the client because queries do not read the clock;
     * `registerPassEntry` re-checks with the server time.
     */
    FunctionSpec.publicQuery({
      name: 'resolvePass',
      args: () => ({
        membershipId: Id('memberships'),
        token: Schema.String,
        now: Schema.Finite,
      }),
      returns: () => VisitsDomain.PassResolution,
      error: () => MembershipsDomain.AccessDeniedError,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Portero: registers the Ingreso of a Pase during their open Turno. */
    FunctionSpec.publicMutation({
      name: 'registerPassEntry',
      args: () => ({
        membershipId: Id('memberships'),
        ...VisitsDomain.RegisterPassEntryDto.fields,
      }),
      returns: () => Id('visits'),
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          ShiftsDomain.NoOpenShiftError,
          VisitsDomain.PassRejectedError,
        ]),
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Portero: registers an Ingreso without a valid Pase (Registro manual). */
    FunctionSpec.publicMutation({
      name: 'registerManualEntry',
      args: () => ({
        membershipId: Id('memberships'),
        ...VisitsDomain.RegisterManualEntryDto.fields,
      }),
      returns: () => Id('visits'),
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          ShiftsDomain.NoOpenShiftError,
          ResidentialUnitsDomain.ApartmentNotFoundError,
        ]),
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Portero: registers the Salida of an open Visita in the unit. */
    FunctionSpec.publicMutation({
      name: 'registerExit',
      args: () => ({
        membershipId: Id('memberships'),
        visitId: Id('visits'),
      }),
      returns: () => Schema.Null,
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          VisitsDomain.VisitNotFoundError,
          VisitsDomain.VisitAlreadyExitedError,
        ]),
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /**
     * Portero or Administrador: voids a Visita registered by mistake. It stays
     * in the history with its reason and leaves counts, reports and the list
     * of Visitantes inside.
     */
    FunctionSpec.publicMutation({
      name: 'voidVisit',
      args: () => ({
        membershipId: Id('memberships'),
        ...VisitsDomain.VoidVisitDto.fields,
      }),
      returns: () => Schema.Null,
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          VisitsDomain.VisitNotFoundError,
          VisitsDomain.VisitAlreadyVoidedError,
        ]),
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Portero or Administrador: Visitas without Salida, latest Ingreso first. */
    FunctionSpec.publicQuery({
      name: 'listInside',
      args: () => ({ membershipId: Id('memberships') }),
      returns: () => Schema.Array(VisitsDomain.VisitSummary),
      error: () => MembershipsDomain.AccessDeniedError,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Portero or Administrador: the unit's latest Visitas. */
    FunctionSpec.publicQuery({
      name: 'listRecentForUnit',
      args: () => ({ membershipId: Id('memberships') }),
      returns: () => Schema.Array(VisitsDomain.VisitSummary),
      error: () => MembershipsDomain.AccessDeniedError,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Residente: the Apartamento's latest Visitas, documents masked. */
    FunctionSpec.publicQuery({
      name: 'listForApartment',
      args: () => ({ membershipId: Id('memberships') }),
      returns: () => Schema.Array(VisitsDomain.VisitSummary),
      error: () => MembershipsDomain.AccessDeniedError,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Portero or Administrador: the Visitas registered in one Turno. */
    FunctionSpec.publicQuery({
      name: 'listForShift',
      args: () => ({
        membershipId: Id('memberships'),
        shiftId: Id('shifts'),
      }),
      returns: () => Schema.Array(VisitsDomain.VisitSummary),
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          ShiftsDomain.ShiftNotFoundError,
        ]),
    }).middleware(RequireUserIdentity)
  );
