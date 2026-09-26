import { GenericId } from "@confect/core";

export type TableNames = "apartments" | "authorizations" | "favorites" | "memberships" | "passes" | "residentialUnits" | "shiftReports" | "shifts" | "superadmins" | "users" | "visits";

export const Id = <const TableName extends TableNames>(
  tableName: TableName,
) => GenericId.GenericId(tableName);
