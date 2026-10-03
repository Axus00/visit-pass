import { GenericId } from "@confect/core";

export type TableNames = "apartments" | "exampleWorkflowRuns" | "memberships" | "residentialUnits" | "users";

export const Id = <const TableName extends TableNames>(
  tableName: TableName,
) => GenericId.GenericId(tableName);
