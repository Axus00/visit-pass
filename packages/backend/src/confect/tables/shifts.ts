import { Table } from '@confect/server';

import * as ShiftsDomain from '../modules/shifts/domain';

export default Table.make(() => ShiftsDomain.ShiftsTableSchema)
  .index('by_porterMembershipId_and_status_and_plannedEnd', [
    'porterMembershipId',
    'status',
    'plannedEnd',
  ])
  .index('by_porterMembershipId_and_startedAt', [
    'porterMembershipId',
    'startedAt',
  ])
  .index('by_residentialUnitId_and_status', ['residentialUnitId', 'status'])
  .index('by_residentialUnitId_and_status_and_plannedEnd', [
    'residentialUnitId',
    'status',
    'plannedEnd',
  ]);
