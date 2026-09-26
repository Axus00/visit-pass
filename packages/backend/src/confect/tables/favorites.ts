import { Table } from '@confect/server';

import * as AuthorizationsDomain from '../modules/authorizations/domain';

export default Table.make(
  () => AuthorizationsDomain.FavoritesTableSchema
).index('by_membershipId', ['membershipId']);
