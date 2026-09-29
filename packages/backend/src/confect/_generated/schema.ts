import { DatabaseSchema as $DatabaseSchema } from "@confect/server";

import apartments from "./tables/apartments";
import authorizations from "./tables/authorizations";
import favorites from "./tables/favorites";
import memberships from "./tables/memberships";
import passes from "./tables/passes";
import residentialUnits from "./tables/residentialUnits";
import shiftReports from "./tables/shiftReports";
import shifts from "./tables/shifts";
import superadmins from "./tables/superadmins";
import users from "./tables/users";
import visits from "./tables/visits";

const databaseSchema: $DatabaseSchema.DatabaseSchema<{
  readonly apartments: typeof apartments;
  readonly authorizations: typeof authorizations;
  readonly favorites: typeof favorites;
  readonly memberships: typeof memberships;
  readonly passes: typeof passes;
  readonly residentialUnits: typeof residentialUnits;
  readonly shiftReports: typeof shiftReports;
  readonly shifts: typeof shifts;
  readonly superadmins: typeof superadmins;
  readonly users: typeof users;
  readonly visits: typeof visits;
}> = $DatabaseSchema.make({
  apartments,
  authorizations,
  favorites,
  memberships,
  passes,
  residentialUnits,
  shiftReports,
  shifts,
  superadmins,
  users,
  visits,
});

export default databaseSchema;
