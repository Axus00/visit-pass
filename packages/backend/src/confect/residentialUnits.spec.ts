import { FunctionSpec, GroupSpec } from '@confect/core';
import * as Schema from 'effect/Schema';

import { Id } from './_generated/id';
import RequireUnitMembership from './middleware/RequireUnitMembership.spec';
import * as CommonErrorsDomain from './modules/commonErrors/domain';
import * as MembershipsDomain from './modules/memberships/domain';
import * as ResidentialUnitsDomain from './modules/residentialUnits/domain';

const FirstAdministrator = Schema.Struct({
  name: MembershipsDomain.InviteMembershipDto.fields.name,
  email: MembershipsDomain.InviteMembershipDto.fields.email,
});

const CreateResidentialUnitFields = {
  name: ResidentialUnitsDomain.ResidentialUnitsTableSchema.fields.name,
  slug: ResidentialUnitsDomain.ResidentialUnitsTableSchema.fields.slug,
  groupingWord: ResidentialUnitsDomain.GroupingWord,
  firstAdministrator: FirstAdministrator,
};

export default GroupSpec.make()
  // -*******************************************************************************-
  // Public
  // -*******************************************************************************-
  .addFunction(
    FunctionSpec.publicMutation({
      name: 'updateGroupingWord',
      args: () => ResidentialUnitsDomain.UpdateGroupingWordDto.fields,
      returns: () => Schema.Null,
      error: () => MembershipsDomain.RoleRequiredError,
    }).middleware(RequireUnitMembership)
  )

  // -*******************************************************************************-
  // Internal
  // -*******************************************************************************-
  .addFunction(
    /**
     * Creates the WorkOS Organization, the unit and its first Administrador's
     * Invitación. The platform runs it; no Rol inside a unit can.
     */
    FunctionSpec.internalAction({
      name: 'create',
      args: () => CreateResidentialUnitFields,
      returns: () => Id('residentialUnits'),
      error: () =>
        Schema.Union([
          ResidentialUnitsDomain.SlugTakenError,
          CommonErrorsDomain.ExternalProviderError,
        ]),
    })
  )
  .addFunction(
    FunctionSpec.internalQuery({
      name: 'getOneBySlug',
      args: () => ({ slug: Schema.String }),
      returns: () =>
        Schema.NullOr(ResidentialUnitsDomain.ResidentialUnitsDocSchema),
      error: () => Schema.Never,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: 'insertWithFirstAdministrator',
      args: () => ({
        ...CreateResidentialUnitFields,
        externalOrganizationId: Schema.String,
      }),
      returns: () => Id('residentialUnits'),
      error: () => ResidentialUnitsDomain.SlugTakenError,
    })
  );
