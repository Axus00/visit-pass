import { Table } from '@confect/server';

import * as MembershipsDomain from '../modules/memberships/domain';

export default Table.make(() => MembershipsDomain.MembershipsTableSchema)
  .index('by_residentialUnitId_and_status', ['residentialUnitId', 'status'])
  .index('by_residentialUnitId_and_email', ['residentialUnitId', 'email'])
  .index('by_email_and_status', ['email', 'status'])
  .index('by_userId_and_status', ['userId', 'status'])
  .index('by_apartmentId', ['apartmentId'])
  .index('by_externalInvitationId', ['externalInvitationId']);
