import { Table } from '@confect/server';

import * as MembershipsDomain from '../modules/memberships/domain';

export default Table.make(() => MembershipsDomain.MembershipsTableSchema)
  .index('by_residentialUnitId_and_role', ['residentialUnitId', 'role'])
  .index('by_userId', ['userId'])
  .index('by_email_and_status', ['email', 'status'])
  .index('by_apartmentId_and_status', ['apartmentId', 'status']);
