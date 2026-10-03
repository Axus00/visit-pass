import { defineSchema as $defineSchema } from "convex/server";
import { Table as $Table } from "@confect/server";

import apartments from "./tables/apartments";
import exampleWorkflowRuns from "./tables/exampleWorkflowRuns";
import memberships from "./tables/memberships";
import residentialUnits from "./tables/residentialUnits";
import users from "./tables/users";

export default $defineSchema({
  apartments: $Table.tableDefinition(apartments),
  exampleWorkflowRuns: $Table.tableDefinition(exampleWorkflowRuns),
  memberships: $Table.tableDefinition(memberships),
  residentialUnits: $Table.tableDefinition(residentialUnits),
  users: $Table.tableDefinition(users),
});
