import { FunctionSpec, GroupSpec } from '@confect/core';
import * as Schema from 'effect/Schema';

import { Id } from './_generated/id';
import RequireUnitMembership from './middleware/RequireUnitMembership.spec';
import * as ApartmentsDomain from './modules/apartments/domain';
import * as MembershipsDomain from './modules/memberships/domain';

export default GroupSpec.make()
  // -*******************************************************************************-
  // Public
  // -*******************************************************************************-
  .addFunction(
    /** Every Rol reads the unit's Apartamentos; only the Administrador changes them. */
    FunctionSpec.publicQuery({
      name: 'list',
      args: () => ({}),
      returns: () => Schema.Array(ApartmentsDomain.ApartmentsDocSchema),
      error: () => Schema.Never,
    }).middleware(RequireUnitMembership)
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: 'create',
      args: () => ApartmentsDomain.CreateApartmentDto.fields,
      returns: () => Id('apartments'),
      error: () =>
        Schema.Union([
          MembershipsDomain.RoleRequiredError,
          ApartmentsDomain.DuplicateApartmentError,
        ]),
    }).middleware(RequireUnitMembership)
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: 'rename',
      args: () => ApartmentsDomain.RenameApartmentDto.fields,
      returns: () => Schema.Null,
      error: () =>
        Schema.Union([
          MembershipsDomain.RoleRequiredError,
          ApartmentsDomain.ApartmentNotFoundError,
          ApartmentsDomain.DuplicateApartmentError,
        ]),
    }).middleware(RequireUnitMembership)
  )
  .addFunction(
    /** Deletes an Apartamento no Membresía ever referenced; deactivates any other. */
    FunctionSpec.publicMutation({
      name: 'remove',
      args: () => ({ apartmentId: Id('apartments') }),
      returns: () => ApartmentsDomain.ApartmentRemoval,
      error: () =>
        Schema.Union([
          MembershipsDomain.RoleRequiredError,
          ApartmentsDomain.ApartmentNotFoundError,
          ApartmentsDomain.ApartmentInUseError,
        ]),
    }).middleware(RequireUnitMembership)
  );
