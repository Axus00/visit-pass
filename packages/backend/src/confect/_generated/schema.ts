import { DatabaseSchema as $DatabaseSchema } from "@confect/server";

import apartments from "./tables/apartments";
import exampleWorkflowRuns from "./tables/exampleWorkflowRuns";
import memberships from "./tables/memberships";
import residentialUnits from "./tables/residentialUnits";
import users from "./tables/users";

const databaseSchema: $DatabaseSchema.DatabaseSchema<{
  readonly apartments: typeof apartments;
  readonly exampleWorkflowRuns: typeof exampleWorkflowRuns;
  readonly memberships: typeof memberships;
  readonly residentialUnits: typeof residentialUnits;
  readonly users: typeof users;
}> = $DatabaseSchema.make({
  apartments,
  exampleWorkflowRuns,
  memberships,
  residentialUnits,
  users,
});

export default databaseSchema;
