import { GroupSpec, Spec } from "@confect/core";
import authorizations from "../authorizations.spec";
import developmentSeeder from "../developmentSeeder.spec";
import memberships from "../memberships.spec";
import residentialUnits from "../residentialUnits.spec";
import retention from "../retention.spec";
import shiftReports from "../shiftReports.spec";
import shifts from "../shifts.spec";
import users from "../users.spec";
import visits from "../visits.spec";
import workosAuth from "../workosAuth.spec";

const spec: Spec.Spec<{
  readonly authorizations: GroupSpec.NamedAt<typeof authorizations, "authorizations">;
  readonly developmentSeeder: GroupSpec.NamedAt<typeof developmentSeeder, "developmentSeeder">;
  readonly memberships: GroupSpec.NamedAt<typeof memberships, "memberships">;
  readonly residentialUnits: GroupSpec.NamedAt<typeof residentialUnits, "residentialUnits">;
  readonly retention: GroupSpec.NamedAt<typeof retention, "retention">;
  readonly shiftReports: GroupSpec.NamedAt<typeof shiftReports, "shiftReports">;
  readonly shifts: GroupSpec.NamedAt<typeof shifts, "shifts">;
  readonly users: GroupSpec.NamedAt<typeof users, "users">;
  readonly visits: GroupSpec.NamedAt<typeof visits, "visits">;
  readonly workosAuth: GroupSpec.NamedAt<typeof workosAuth, "workosAuth">;
}> = Spec.make().addAt("authorizations", authorizations).addAt("developmentSeeder", developmentSeeder).addAt("memberships", memberships).addAt("residentialUnits", residentialUnits).addAt("retention", retention).addAt("shiftReports", shiftReports).addAt("shifts", shifts).addAt("users", users).addAt("visits", visits).addAt("workosAuth", workosAuth);

export default spec;
