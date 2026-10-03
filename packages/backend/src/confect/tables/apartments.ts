import { Table } from '@confect/server';

import * as ApartmentsDomain from '../modules/apartments/domain';

export default Table.make(() => ApartmentsDomain.ApartmentsTableSchema).index(
  'by_residentialUnitId_and_grouping_and_number',
  ['residentialUnitId', 'grouping', 'number']
);
