import { Table } from '@confect/server';

import * as ShiftReportsDomain from '../modules/shiftReports/domain';

export default Table.make(() => ShiftReportsDomain.ShiftReportsTableSchema)
  .index('by_shiftId', ['shiftId'])
  .index('by_residentialUnitId', ['residentialUnitId']);
