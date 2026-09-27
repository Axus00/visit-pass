import { Table } from '@confect/server';

import * as AuthorizationsDomain from '../modules/authorizations/domain';

export default Table.make(() => AuthorizationsDomain.PassesTableSchema)
  .index('by_token', ['token'])
  .index('by_authorizationId', ['authorizationId'])
  .index('by_authorizationId_and_status', ['authorizationId', 'status']);
