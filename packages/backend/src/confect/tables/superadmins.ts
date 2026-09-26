import { Table } from '@confect/server';

import * as ResidentialUnitsDomain from '../modules/residentialUnits/domain';

export default Table.make(
  () => ResidentialUnitsDomain.SuperadminsTableSchema
).index('by_email', ['email']);
