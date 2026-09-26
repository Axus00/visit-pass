import { Table } from '@confect/server';

import * as AuthorizationsDomain from '../modules/authorizations/domain';

export default Table.make(() => AuthorizationsDomain.AuthorizationsTableSchema)
  .index('by_apartmentId', ['apartmentId'])
  .index('by_residentialUnitId_and_endDate', ['residentialUnitId', 'endDate']);
