import { Table } from '@confect/server';

import * as ResidentialUnitsDomain from '../modules/residentialUnits/domain';

export default Table.make(
  () => ResidentialUnitsDomain.ApartmentsTableSchema
).index('by_residentialUnitId_and_tower_and_number', [
  'residentialUnitId',
  'tower',
  'number',
]);
