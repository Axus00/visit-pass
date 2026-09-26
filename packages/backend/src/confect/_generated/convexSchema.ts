import { defineSchema as $defineSchema } from "convex/server";
import { Table as $Table } from "@confect/server";

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

export default $defineSchema({
  apartments: $Table.tableDefinition(apartments),
  authorizations: $Table.tableDefinition(authorizations),
  favorites: $Table.tableDefinition(favorites),
  memberships: $Table.tableDefinition(memberships),
  passes: $Table.tableDefinition(passes),
  residentialUnits: $Table.tableDefinition(residentialUnits),
  shiftReports: $Table.tableDefinition(shiftReports),
  shifts: $Table.tableDefinition(shifts),
  superadmins: $Table.tableDefinition(superadmins),
  users: $Table.tableDefinition(users),
  visits: $Table.tableDefinition(visits),
});
