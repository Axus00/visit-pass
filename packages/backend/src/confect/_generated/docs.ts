import type { Document } from "@confect/server";
import type schemaDefinition from "./schema";

export type ApartmentsDoc = Document.Document<typeof schemaDefinition, "apartments">;
export type ExampleWorkflowRunsDoc = Document.Document<typeof schemaDefinition, "exampleWorkflowRuns">;
export type MembershipsDoc = Document.Document<typeof schemaDefinition, "memberships">;
export type ResidentialUnitsDoc = Document.Document<typeof schemaDefinition, "residentialUnits">;
export type UsersDoc = Document.Document<typeof schemaDefinition, "users">;

export interface Docs {
  apartments: ApartmentsDoc;
  exampleWorkflowRuns: ExampleWorkflowRunsDoc;
  memberships: MembershipsDoc;
  residentialUnits: ResidentialUnitsDoc;
  users: UsersDoc;
}
