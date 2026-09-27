import { Table } from '@confect/server';

import * as VisitsDomain from '../modules/visits/domain';

export default Table.make(() => VisitsDomain.VisitsTableSchema)
  .index('by_residentialUnitId_and_enteredAt', [
    'residentialUnitId',
    'enteredAt',
  ])
  .index('by_residentialUnitId_and_anonymizedAt_and_enteredAt', [
    'residentialUnitId',
    'anonymizedAt',
    'enteredAt',
  ])
  .index('by_residentialUnitId_and_exitedAt', ['residentialUnitId', 'exitedAt'])
  .index('by_apartmentId_and_enteredAt', ['apartmentId', 'enteredAt'])
  .index('by_shiftId', ['shiftId'])
  .index('by_passId_and_exitedAt', ['passId', 'exitedAt']);
