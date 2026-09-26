import { FunctionSpec, GroupSpec } from '@confect/core';
import * as Schema from 'effect/Schema';

import { Id } from './_generated/id';
import RequireUserIdentity from './middleware/RequireUserIdentity.spec';
import * as MembershipsDomain from './modules/memberships/domain';
import * as ResidentialUnitsDomain from './modules/residentialUnits/domain';

export default GroupSpec.make()
  // -*******************************************************************************-
  // Public
  // -*******************************************************************************-
  .addFunction(
    /** Administrador dashboard counters. `now` decides which day is "today". */
    FunctionSpec.publicQuery({
      name: 'getOverview',
      args: () => ({ membershipId: Id('memberships'), now: Schema.Finite }),
      returns: () => ResidentialUnitsDomain.UnitOverview,
      error: () => MembershipsDomain.AccessDeniedError,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Any Rol: the unit's Apartamentos, sorted by tower and number. */
    FunctionSpec.publicQuery({
      name: 'listApartments',
      args: () => ({ membershipId: Id('memberships') }),
      returns: () => Schema.Array(ResidentialUnitsDomain.ApartmentSummary),
      error: () => MembershipsDomain.AccessDeniedError,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Administrador: adds Apartamentos to a tower; returns how many were new. */
    FunctionSpec.publicMutation({
      name: 'createApartments',
      args: () => ({
        membershipId: Id('memberships'),
        ...ResidentialUnitsDomain.CreateApartmentsDto.fields,
      }),
      returns: () => Schema.Finite,
      error: () => MembershipsDomain.AccessDeniedError,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Administrador: renames the unit and sets its Visita retention. */
    FunctionSpec.publicMutation({
      name: 'update',
      args: () => ({
        membershipId: Id('memberships'),
        ...ResidentialUnitsDomain.UpdateResidentialUnitDto.fields,
      }),
      returns: () => Schema.Null,
      error: () => MembershipsDomain.AccessDeniedError,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Superadmin: every Unidad residencial on the platform. */
    FunctionSpec.publicQuery({
      name: 'listAll',
      args: () => ({}),
      returns: () => Schema.Array(ResidentialUnitsDomain.PlatformUnitSummary),
      error: () => ResidentialUnitsDomain.NotSuperadminError,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Superadmin: creates a Unidad residencial and invites its first Administrador. */
    FunctionSpec.publicMutation({
      name: 'create',
      args: () => ResidentialUnitsDomain.CreateResidentialUnitDto.fields,
      returns: () => Id('residentialUnits'),
      error: () =>
        Schema.Union([
          ResidentialUnitsDomain.NotSuperadminError,
          MembershipsDomain.InvalidMembershipError,
        ]),
    }).middleware(RequireUserIdentity)
  )

  // -*******************************************************************************-
  // Internal
  // -*******************************************************************************-
  .addFunction(
    /** Grants the platform role, e.g. `npx convex run residentialUnits:grantSuperadmin`. */
    FunctionSpec.internalMutation({
      name: 'grantSuperadmin',
      args: () => ({ email: Schema.String }),
      returns: () => Schema.Null,
      error: () => Schema.Never,
    })
  );
