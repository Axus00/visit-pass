import { Table } from '@confect/server';

import * as ShiftsDomain from '../modules/shifts/domain';

export default Table.make(() => ShiftsDomain.ShiftsTableSchema)
  .index('by_porterMembershipId_and_status', ['porterMembershipId', 'status'])
  .index('by_porterMembershipId_and_startedAt', [
    'porterMembershipId',
    'startedAt',
  ])
  .index('by_residentialUnitId_and_status', ['residentialUnitId', 'status']);
