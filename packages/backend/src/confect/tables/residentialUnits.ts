import { Table } from '@confect/server';

import * as ResidentialUnitsDomain from '../modules/residentialUnits/domain';

export default Table.make(
  () => ResidentialUnitsDomain.ResidentialUnitsTableSchema
).index('by_name', ['name']);
