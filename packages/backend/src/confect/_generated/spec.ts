import { GroupSpec, Spec } from "@confect/core";
import apartments from "../apartments.spec";
import developmentSeeder from "../developmentSeeder.spec";
import exampleWorkflows from "../exampleWorkflows.spec";
import memberships from "../memberships.spec";
import residentialUnits from "../residentialUnits.spec";
import users from "../users.spec";
import workosAuth from "../workosAuth.spec";

const spec: Spec.Spec<{
  readonly apartments: GroupSpec.NamedAt<typeof apartments, "apartments">;
  readonly developmentSeeder: GroupSpec.NamedAt<typeof developmentSeeder, "developmentSeeder">;
  readonly exampleWorkflows: GroupSpec.NamedAt<typeof exampleWorkflows, "exampleWorkflows">;
  readonly memberships: GroupSpec.NamedAt<typeof memberships, "memberships">;
  readonly residentialUnits: GroupSpec.NamedAt<typeof residentialUnits, "residentialUnits">;
  readonly users: GroupSpec.NamedAt<typeof users, "users">;
  readonly workosAuth: GroupSpec.NamedAt<typeof workosAuth, "workosAuth">;
}> = Spec.make().addAt("apartments", apartments).addAt("developmentSeeder", developmentSeeder).addAt("exampleWorkflows", exampleWorkflows).addAt("memberships", memberships).addAt("residentialUnits", residentialUnits).addAt("users", users).addAt("workosAuth", workosAuth);

export default spec;
