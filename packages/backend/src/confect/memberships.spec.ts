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
    /** The caller's active Membresías and whether they are Superadmin. */
    FunctionSpec.publicQuery({
      name: 'listMine',
      args: () => ({}),
      returns: () => MembershipsDomain.MyAccess,
      error: () => Schema.Never,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /**
     * Activates the pending Membresías invited to the caller's email. The app
     * shell calls it on every load; it is idempotent and returns how many
     * Membresías it activated.
     */
    FunctionSpec.publicMutation({
      name: 'activatePending',
      args: () => ({}),
      returns: () => Schema.Finite,
      error: () => Schema.Never,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Administrador: every Membresía of the unit, revoked ones included. */
    FunctionSpec.publicQuery({
      name: 'listForUnit',
      args: () => ({ membershipId: Id('memberships') }),
      returns: () => Schema.Array(MembershipsDomain.MembershipDetail),
      error: () => MembershipsDomain.AccessDeniedError,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /**
     * Administrador: invites a Residente, Portero or Administrador by email.
     * The Membresía stays pending, even if the email already has an account,
     * until that Usuario's own session or the WorkOS sync activates it.
     */
    FunctionSpec.publicMutation({
      name: 'invite',
      args: () => ({
        membershipId: Id('memberships'),
        ...MembershipsDomain.InviteMemberDto.fields,
      }),
      returns: () => Id('memberships'),
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          MembershipsDomain.MembershipAlreadyExistsError,
          MembershipsDomain.InvalidMembershipError,
          ResidentialUnitsDomain.ApartmentNotFoundError,
        ]),
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Administrador: revokes a Membresía; the Apartamento's Autorizaciones stay. */
    FunctionSpec.publicMutation({
      name: 'revoke',
      args: () => ({
        membershipId: Id('memberships'),
        targetMembershipId: Id('memberships'),
      }),
      returns: () => Schema.Null,
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          MembershipsDomain.MembershipNotFoundError,
          MembershipsDomain.CannotRevokeOwnMembershipError,
        ]),
    }).middleware(RequireUserIdentity)
  );
